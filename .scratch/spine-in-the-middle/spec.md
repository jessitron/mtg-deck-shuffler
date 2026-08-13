# The Spine administers Shuffle Up: one join call, no direct Shuffler→Tabletop POST

Mountain: spine-gathers-data
Ship: fleet
Status: ready-for-agent

## Problem Statement

The big dream of this whole application is for an agent to learn how to follow the game (and eventually play).
For that, we need data. We need to record what happens in the game, so that later I can use that data to work on the Interpreter. That data will be recorded in the Spine.

Right now, the Spine exists but it does not do its job.

When a player shuffles up today, the Shuffler makes two independent, best-effort calls
that happen to fire around the same moment: a thin `POST /join` to the Spine
(`{name, playerName}` → `{tableId, seatNumber}`, used only for the Spine's own
bookkeeping) and a separate, richer `seat.joined` POST straight to the Tabletop
(`deckName`, `playmatImageUrl`, `sleeveColor`, `commanders`). Both are awaited before
the `/game` redirect fires; both swallow failure silently (`log.warn` only).

The consequence Jess noticed directly: the Spine's own event log — the record meant to
one day let a game be reconstructed from scratch — is anemic. It only ever contains what
the Spine mints for itself (`table.created`, a bare `seat.taken` with just
`seatId`/`seat`/`playerName`). The rich facts about _how_ a seat looks (deck name,
playmat, sleeve, commanders) never reach the Spine at all — they go straight to the
Tabletop and stop there. Separately, joining is not idempotent: a retry or a
`/restart-game` that re-sent the join would mint a second seat, so today's code works
around that by never retrying.

This is Mountain 2 ("Spine Tells the Story") of `SEAMAP.md`: every physical/administrative
event from either app is supposed to cross the Spine's one append-only log. Right now,
joining a table doesn't.

## Solution

Collapse the two independent calls into one: the Shuffler makes a single, idempotent
`POST /join` to the Spine carrying everything needed to seat a player — identity
(`playerName`, `gameId`) and decoration (`deckName`, `playmatImageUrl`,
`cardBackImageUrl`, `sleeveColor`, `commanders`, `gameUrl`). The Spine administers the
whole act in one transaction: create the table if it doesn't exist, confirm there's
room, assign a seat, mint the full `seat.taken` + `seat.joined` events into its own log,
notify the Tabletop so it draws the seat's player area, and hand back a table URL. A
retry (same `gameId`) returns the same seat instead of creating a second one. The
Shuffler no longer talks to the Tabletop directly for this.

`/game` stops waiting on this call. It renders immediately; the join happens
afterward, and the page picks up success or failure once it's known. A successful join
becomes an event in the Shuffler's own domain log, narration-visible like anything else
that happens to a game.

Sending `card.played` straight to the Tabletop, and the Tabletop's general subscription
to the Spine's SSE stream for other event kinds, are **not** part of this — see Out of
Scope.

## User Stories

1. As a player shuffling up, I want my deck name, playmat, sleeve color, and commanders
   recorded on the Spine's table log, so that the game I'm about to play has a complete
   record from its first moment, not just from whenever the first card is played.
2. As Jess building toward the Interpreter, I want the full seat-setup facts (deck
   name, sleeve, commanders) durably recorded on the Spine's own log — not just on the
   Tabletop — so that the training data for "what happened at this table" exists from
   the moment a game exists, instead of starting only once the first card is played.
3. As Jess, I want this ticket to be the first place where Mountain 2's claim ("every
   physical/administrative event crosses the Spine's log") is actually true rather than
   aspirational, so that later work building the Interpreter has one real precedent to
   extend instead of a claim in `SEAMAP.md` that the code doesn't back up.
4. As a player shuffling up, I want the `/game` screen to appear immediately, so that a
   slow or unreachable Spine never makes me wait to see my hand.
5. As a player shuffling up, I want to find out if joining the table failed, so that I'm
   not left thinking I'm connected to a table I'm actually not on.
6. As a player whose browser retries the join (network blip) or who hits
   `/restart-game`, I want to land back in the same seat, not a second one, so that the
   table never shows a phantom duplicate player.
7. As Jess reading the Spine's admin log, I want to see one coherent story of a seat
   joining — who, with what deck, what look, what commanders — so that the log alone
   documents what happened without cross-referencing the Tabletop.
8. As a player, I want a Tabletop that's temporarily down at Shuffle Up to not block me
   from starting my game, so that a flaky table doesn't cost me my hand.
9. As Jess, I want the Shuffler's own domain log to show that a join to a table
   succeeded, so that the game's narration includes "joined table X" the same way it
   includes other things that happen during play.
10. As Jess relying on this log as training data later, I want it to be knowable — even
    if only from the Shuffler's own telemetry, not the Spine itself — which games have a
    complete Spine record and which have a gap from a failed join, so that a future me
    building the Interpreter doesn't have to discover missing data by noticing a game
    with no `seat.joined` and wondering whether that's a bug or a known gap.
11. As a developer, I want the Spine's `/join` to be the only place seat-decoration data
    is threaded through to the Tabletop, so that a future Tabletop SSE subscriber has one
    clear precedent to extend rather than two different payload shapes to reconcile.
12. As a developer reading `apps/shuffler/CLAUDE.md`'s Table Mode section after this
    change, I want it to describe one Spine call instead of two separate Tabletop/Spine
    sends, so that the documented behavior matches the code.
13. As Jess, I want the Spine's `seat.joined` payload to carry a `gameUrl` back to the
    Shuffler's own `/game` page for that seat, so that a later ticket can wire the
    Tabletop's library-furniture link through the Spine instead of a side channel.

## Implementation Decisions

- **One request replaces two.** `apps/shuffler/src/port-spine/sendToSpine.ts`'s
  `joinSpineTableBestEffort` and `apps/shuffler/src/port-tabletop/sendToTable.ts`'s
  `sendSeatJoinedBestEffort` are replaced by a single function (in `port-spine/`) that
  builds one request carrying `gameId`, `name` (table), `playerName`, `deckName`,
  `playmatImageUrl`, `cardBackImageUrl`, `sleeveColor`, `commanders`, and `gameUrl` (the
  Shuffler's own `/game/:gameId` URL). All three call sites in `app.ts`
  (`/start-game`, `/restart-game`, `/yo`) switch to it. `TabletopPort.sendSeatJoined`
  and its implementations (`HttpTabletopGateway`, `FakeTabletopGateway`) are deleted;
  `TabletopPort` keeps only `sendCardToTable` (card.played is untouched by this spec).

- **`Spine::Table.join!` grows an idempotency key.** The `seats` table gets a
  `game_id` column (string, nullable, unique when present). `POST /join`'s request body
  grows from `{name, playerName}` to `{gameId, name, playerName, deckName,
playmatImageUrl, cardBackImageUrl, sleeveColor, commanders, gameUrl}` — only `gameId`,
  `name`, `playerName`, `deckName` are required (mirroring `seat.joined.v1.json`'s own
  required set plus the new join-specific fields). Lookup order: find an existing seat
  by `game_id` first (idempotent replay — return its table/seat/URL unchanged, no new
  events minted); otherwise proceed exactly as `join!` does today (find-or-create the
  table, take the next open seat), storing `game_id` on the new seat.

- **The Spine mints both events for a join in one transaction.** `take_seat!` still
  mints `seat.taken` (`seatId`, `seat`, `playerName` — identity, as today). Right after,
  in the same transaction, it mints `seat.joined` with the full decoration payload
  (`deckName`, `playmatImageUrl`, `cardBackImageUrl`, `sleeveColor`, `commanders`,
  `gameUrl`) — keeping the two as separate log entries, consistent with the existing
  contract's split between identity (`seat.taken`) and decoration (`seat.joined`).

- **`seat.joined.v1.json` gains `gameUrl`.** New optional `gameUrl` (string, uri) field
  on the payload. Since the schema has `additionalProperties: false`, this is a new
  version: `contracts/payloads/seat.joined.v2.json` (v1 kept as history, per
  `contracts/README.md`'s versioning rule). The Spine mints `schemaVersion: 2` for the
  events it creates from now on; `apps/shuffler/src/port-tabletop/types.ts`'s
  `SeatJoinedPayload`/`buildSeatJoinedEvent` move into `port-spine/` (they're no longer
  building a Tabletop-bound event, they're building the payload the Spine consumes) and
  gain the field.

- **The Spine notifies the Tabletop directly over HTTP, not via a new SSE subscriber.**
  As the last step of handling `/join` (still inside the request, after the DB
  transaction commits), the Spine calls the Tabletop's existing
  `POST /api/tables/:tableName/events` endpoint with the `seat.joined` envelope it just
  minted — the same endpoint the Shuffler calls today, just called by the Spine instead.
  This is a deliberate, narrower choice than the grilling decision's "over the Spine's
  existing SSE pipe": a general Tabletop-side subscriber to the Spine's SSE stream is
  real, undesigned work (`.scratch/spine-in-the-middle/map.md`'s "Not yet specified" —
  needed anyway for the `card.played` swap and the envelope v2/v3 reconciliation), and
  building it just for this one event kind would mean throwing it away or reworking it
  when that ticket lands. Calling the Tabletop's already-existing endpoint keeps this
  ticket's blast radius to the Spine and the Shuffler, preserves today's failure
  semantics exactly (best-effort; a down Tabletop doesn't fail the join; the Tabletop's
  own `ensurePlayerArea` self-heals on the first `card.played`, which still arrives
  directly since that swap is out of scope here), and the event the Spine already
  broadcasts on its own SSE stream (`table.rb`'s existing `broadcast`) remains available
  for the future subscriber to pick up instead, once it exists. **This needs a new env
  var on the Spine**, `TABLETOP_URL` (server-to-server, mirroring the Shuffler's own),
  for that outbound call — best-effort: a failure is a span attribute, not a thrown
  error, and doesn't roll back the join.

- **`/join`'s response gains `tableUrl`.** `{tableId, seatNumber}` becomes `{tableId,
seatNumber, tableUrl}`, built from a new Spine env var `TABLETOP_PUBLIC_URL` (mirroring
  the Shuffler's own env var of the same name) as `${TABLETOP_PUBLIC_URL}/t/${name}`.
  The Shuffler stores this instead of constructing the Tabletop link itself, if it does
  so today.

- **`/game` doesn't wait on the join.** The Shuffler's `/start-game`, `/restart-game`,
  and `/yo` handlers render the response first; the join call fires after, unawaited
  from the request/response cycle (`.catch()`-guarded, same best-effort spirit as
  today). The `/game` page gets a small status element (HTMX, polling an endpoint like
  `GET /games/:gameId/table-status`) that shows nothing while no join has been
  attempted, a transient "joining the table…" while pending, and either nothing further
  (success — the table link elsewhere on the page already works) or a dismissible
  warning banner (failure) once the outcome is known. The Shuffler needs a small
  in-memory or persisted per-game "join outcome" slot for this endpoint to read; given
  `PersistedGameState` already carries `spineTableId`/`spineSeatNumber` as optional
  fields (`apps/shuffler/CLAUDE.md`'s Table Mode section), the outcome can ride there
  the same way, no version bump.

- **A successful join is logged in the Shuffler's own domain log**, the same log/kind
  used for other narrated happenings during a game (see `apps/shuffler/src/GameState.ts`
  / wherever that log's `log`/`record` method lives) — e.g. "joined table
  `<name>` as seat `<n>`". A **failed** join is not logged there (UI-only, per the
  grilling answer's open question resolved here for scope: keeping this ticket's surface
  small) — it's out of scope to add a second log-worthy path for a call that's still
  best-effort.

- **`Spine::Table.join!`'s retry-on-`NameTaken` still applies** for the "table doesn't
  exist yet" race, unchanged; the new `game_id` lookup happens before that path is
  reached at all.

## Testing Decisions

- Tests only exercise external behavior (HTTP in, HTTP/DB out), not internal method
  shapes — consistent with the fleet's "no mocks, only fakes" rule.
- **Spine seam**: extend `services/spine/test/integration/events_test.rb`'s style (or a
  new `test/integration/join_test.rb`) — real Roda app, real SQLite (test DB), a fake
  Tabletop HTTP server (Ruby's `WEBrick`/`Rack::Test` stub or a tiny Sinatra-less rack
  app bound to a random port, matching however the existing suite fakes outbound HTTP,
  if it already does) standing in for `TABLETOP_URL`. Cases: first join creates
  table+seat+both events and calls the fake Tabletop; a second `/join` with the same
  `gameId` returns the same `tableId`/`seatNumber`/`tableUrl` and mints no new events;
  two different `gameId`s at the same table name get different seats; a `/join` when the
  fake Tabletop is down still returns 2xx with the seat created (best-effort holds); the
  admin log for a joined table shows a full `seat.joined` payload (deckName, playmat,
  sleeve, commanders, gameUrl) — this is the test that directly proves the "anemic log"
  problem is fixed.
- **Shuffler seam**: extend the existing `FakeSpineGateway`
  (`apps/shuffler/src/port-spine/` test doubles) to accept and record the richer
  request; a Jest test on `/start-game` (or wherever the call site lives) that asserts
  exactly one Spine call carries all the decoration fields, and that no
  `TabletopPort.sendSeatJoined` call exists anymore (the method is gone, so this is
  really "the code compiles without it" plus a grep-level check that nothing new calls
  the deleted `HttpTabletopGateway` method). A second test on the new
  `/games/:gameId/table-status`-equivalent endpoint (or whatever the polling shape ends
  up being) covering pending/success/failure states.
- **Cross-ship verification**: `apps/shuffler/test/verification/verify-tabletop-integration.spec.ts`
  already spawns a real Tabletop; extend it (or add a sibling spec) to also spawn a real
  Spine (`services/spine`, ephemeral SQLite) and assert, end to end, that shuffling up
  produces a `seat.joined` event on the Spine's admin page _and_ draws the seat on the
  Tabletop's canvas — this is the one test that would have caught today's problem
  (nothing currently exercises the Spine and the Tabletop in the same run).
- Run each ship's existing unit suite (`bin/test` for the Spine, `npm test` for the
  Shuffler) plus the extended verification spec before calling this done.

## Out of Scope

- **The Tabletop's own Spine SSE subscriber**, and killing the direct `card.played` POST
  from the Shuffler to the Tabletop. Real, undesigned work tracked in
  `.scratch/spine-in-the-middle/map.md`'s "Not yet specified" — this spec's
  Spine→Tabletop notification is a direct HTTP call specifically so it doesn't get in
  that design's way later.
- **The envelope v2/v3 reconciliation** on the Tabletop's inbound validation generally.
  This spec's one new Spine→Tabletop call uses envelope v3 (the Spine's own native
  version) against the Tabletop's existing `seat.joined` endpoint; the endpoint's
  existing v2 validation for whatever else still reaches it (nothing does, post this
  spec, for `seat.joined` specifically) is untouched.
- **The Shuffler's own Spine SSE subscriber** and rerouting the card-return channel
  (library portal drag) through the Spine — separate, undesigned, tracked in the same map.
- **Reconnect/catch-up on a dropped connection** — not applicable here (this spec adds
  no persistent connection; the Spine→Tabletop call is a single request per join),
  and was already ruled out generally by the map for the SSE-subscriber work.
- **Logging a *failed* join as a Shuffler domain-log event** — left UI-only; noted above
  as a scope decision, not a technical blocker, if Jess wants it revisited. A failed join
  already gets a span attribute + `log.warn` today (the existing best-effort precedent),
  which is enough to answer "which games have a Spine-record gap" from Honeycomb without
  new code — see Further Notes.
- **Any change to `card.played`**, its payload, or its Shuffler→Spine send
  (`sendCardPlayedToSpineBestEffort`) — untouched, already reaches the Spine today.
- **Replacing `POST /join`'s URL/verb** — it stays `POST /join`; only its request/response
  shape grows.
- **Multi-table or multi-game identity concerns beyond `gameId`** — dedup is keyed
  exactly as the grilling decision specified, nothing broader.

## Further Notes

- The single largest judgment call in this spec (Spine→Tabletop notification as a direct
  HTTP call, not the SSE pipe named in the grilling answer) is flagged above under
  Implementation Decisions with its reasoning; if that trade feels wrong once someone's
  looking at the Tabletop SSE-subscriber ticket up close, it's a small, contained thing
  to revisit — only the Spine's `/join` handler and one Tabletop URL config would move.
- `apps/shuffler/CLAUDE.md`'s "Table Mode" section describes the current two-call
  wiring in detail and will need updating once this lands — that's this spec's
  implementing ticket's job, not a separate one.
- Consult `owners/fleet-is-observable` before finalizing the Spine→Tabletop outbound
  call's tracing (span attributes on failure, whether `traceparent` propagation needs
  anything beyond what undici already injects automatically, per the existing
  `sendCardPlayedToSpineBestEffort` precedent in `apps/shuffler/CLAUDE.md`).
- Consult `owners/two-faced-cards` on the `commanders[].backImageUrl` field riding
  through this new payload shape unchanged (it already does today; just confirm nothing
  about the Spine's JSON round-trip — string vs. `null` — breaks the "present exactly
  when there's a back face" rule the schema documents).
- **Why this ticket matters beyond log hygiene**: the Spine's log exists to become
  training data for the Interpreter (Mountain 3). A `seat.joined` that only reaches the
  Tabletop is invisible to that future work no matter how well-formed it is — the Spine
  is the only place the Interpreter will ever look. That reframes what "done" means here:
  it's not "the admin page looks nicer," it's "this is the first event kind for which
  Mountain 2's promise is actually kept." The still-open items in Out of Scope
  (`card.played`'s direct POST, the Tabletop's SSE subscriber) are the rest of that
  promise, tracked in `.scratch/spine-in-the-middle/map.md` — this ticket doesn't
  complete Mountain 2, it proves the shape the rest of it will take.
