# Ticket 02 plan — Spine idempotent administered join

Mountain: spine-gathers-data
Ship: spine (plus the ticket's explicit contract edit)

## Scope

Implement `.scratch/spine-in-the-middle/issues/02-spine-idempotent-join.md` only. The
Shuffler and Tabletop remain unchanged. `POST /join` accepts the richer seat setup,
records `seat.taken` and `seat.joined` atomically, is idempotent by `gameId`, notifies
the existing Tabletop endpoint best-effort after commit, and returns `tableUrl`.

## Plan

1. **Contract and schema**
   - Add optional URI `gameUrl` to `contracts/payloads/seat.joined.v1.json`; keep
     `schemaVersion: 1`.
   - Add nullable `seats.game_id` with a unique index. Update both fresh-table creation
     and startup migration so an existing production SQLite database is upgraded.
   - Add nullable `events.initiator_seat_id` and startup migration so a persisted
     `seat.joined` envelope can retain its seated initiator without duplicating identity
     into the payload. Generic `append_event!` also preserves an incoming optional
     `initiator.seatId`; add a regression test for that contract round trip.
   - Make both migrations idempotent and test old-schema and partially migrated files.

2. **Domain transaction**
   - Expand `Table.join!` to accept `game_id`, `player_name`, and a decoration payload.
   - Validate submission-shaped `seat.taken` and `seat.joined` draft envelopes before
     writes (never validate `Event#as_envelope`, which contains Spine-owned fields).
     Invalid decoration returns `422` and leaves no table, seat, event, broadcast, or
     HTTP side effect. `table.created` remains internal and has no payload contract.
   - Look up `Seat.first(game_id:)` before table lookup/create. An idempotent replay
     returns the original table/seat/event, creates/broadcasts nothing, and cannot
     replace the original name, player, or decoration. Recover a concurrent same-game
     unique-index race by re-querying `game_id`; do not misclassify unrelated unique
     violations.
   - Preserve the existing `NameTaken` retry boundary in `App#join_table`; only reach it
     after the game-id lookup misses. Retain safe retry behavior for different games
     racing to create/take seats at the same table; test the existing table-name race.
   - Expand `take_seat!` so one DB transaction creates the seat and mints `seat.taken`
     followed by `seat.joined`. Validate both internally minted wire events against the
     shared contract before persistence. Preserve the decoration hash and nested
     commander data unchanged, including omission vs `[]`, order, unknown fields, and
     `backImageUrl` string vs `null`.
   - Persist canonical initiators as `{seatId, playerName}` for both seat events. Include
     table creation and the seat/event pair in one outer join transaction so any domain
     failure rolls back the whole administered join.
   - Return the newly minted `seat.joined` event for post-commit delivery. Broadcasts
     remain `DB.after_commit` callbacks.

3. **HTTP route and outbound delivery**
   - Require nonblank (including non-whitespace-only) string `gameId`, `name`,
     `playerName`, and `deckName`; preserve valid user text and pass optional decoration
     keys through only when present. Map malformed payload contracts to `422`.
   - Return `{tableId, seatNumber, tableUrl}`. Build `tableUrl` from
     `TABLETOP_PUBLIC_URL` and the stored table name (not replay request data), with a
     percent-encoded path segment. Use a documented standalone-local public URL fallback;
     production and root fleet runs supply the env var explicitly.
   - Add `lib/tabletop_notifier.rb` using `Net::HTTP`, explicitly configured finite
     `open_timeout`, `read_timeout`, and `write_timeout`, and the approved
     `opentelemetry-instrumentation-net_http` dependency. Configure the
     instrumentation in `config/telemetry.rb` while retaining explicit Rack middleware;
     verify automatic HTTP header propagation and never set that header manually.
   - Deliver only after `Table.join!` returns (transaction committed), outside event
     broadcast callbacks. On idempotent replay, resend the same persisted event id so a
     retry can recover an earlier delivery failure; Tabletop deduplicates it safely.
   - Treat missing/invalid `TABLETOP_URL`, non-2xx, open/read/write timeout, DNS, and
     connection errors as span-attributed delivery failures that do not mark the join
     span failed and do not change the 2xx response. Record one bounded result attribute
     (`sent`, `sent_replay`, `missing_config`, `invalid_config`, `non_2xx`, `timeout`,
     `network_error`) plus status/error details where applicable; emit no span event.
   - Immediately before request serialization, add a body `traceparent` from
     `OpenTelemetry.propagation.inject`, omitting it when unavailable and never persisting
     it. Net::HTTP then creates its client span and injects the header; body/header share
     a trace id but may correctly have different span ids.
   - Adapt only the outbound copy for the existing Tabletop receiver: UUID `tableId`
     becomes the stored table name and fresh trace context is added. The authoritative
     payload, event id/seq, and `{seatId, playerName}` initiator remain unchanged; the
     persisted/SSE form remains UUID-addressed with no stored trace context.

4. **Configuration and docs**
   - Add production `TABLETOP_URL` and deliberately plain-HTTP `TABLETOP_PUBLIC_URL` to
     the Spine ConfigMap, mirroring the Shuffler. Document standalone-local behavior.
   - Update `services/spine/CLAUDE.md` and README descriptions of `/join`, schema, and
     outbound tracing/config. Correct only directly encountered stale statements.
   - Mark ticket 02 `Status: resolved` after verification.

5. **Verification (test first)**
   - Extend the real-Roda/real-SQLite join integration test using a tiny real fake HTTP
     server (no mocks): first join creates table + seat + both events and sends the
     Tabletop-adapted envelope; same-game replay returns the same response, creates no
     events, and resends the original persisted event/payload; different games get
     different seats; down Tabletop still returns 2xx; full decoration appears in the
     admin log.
   - Use one sentinel decoration and compare semantic equality at request, validated
     draft, raw SQLite payload, `Event#as_envelope`, parsed admin HTML, and fake Tabletop
     body. Include payload-, commander-, and nested-card extension fields; one string and
     one explicit-null `backImageUrl`; array order; no synthesized `face`; and no
     compaction/defaulting/symbolization/reconstruction.
   - Test omitted `commanders` remains absent everywhere and explicit `[]` remains
     present/empty. Missing commander `backImageUrl` returns `422` before all side effects.
     Replay with conflicting valid decoration preserves the original everywhere, mints
     nothing, and resends only the original event/payload.
   - Add a migration test against an old schema file and a contract test for `gameUrl`.
   - Update existing join helpers to send the four now-required fields and adjust event
     sequence expectations for the newly minted `seat.joined` event.
   - Test exact event order (`table.created`, `seat.taken`, `seat.joined`; next append is
     seq 4), invalid URI/optional fields, whitespace required values, concurrent same-game
     dedup, and the existing concurrent table-name race.
   - Fake HTTP cases cover accepted, non-2xx, timeout, connection failure, and missing
     config while proving committed rows survive. Under a real Rack span, assert automatic
     valid `traceparent` header, optional body context with the same trace id, no persisted
     trace context, a successful join span despite delivery failure, and the exact bounded
     delivery-result attribute for success, replay, and each failure category.
   - Run the focused failing tests before implementation, then `services/spine/bin/test`.

## Known boundary

The Tabletop currently accepts a pre-Spine envelope addressed by table name. This ticket
does not change that ship; the notifier's outbound adaptation is deliberately temporary
transport compatibility. The Spine's persisted event and SSE broadcast remain the
authoritative UUID-addressed form for the future general subscriber.