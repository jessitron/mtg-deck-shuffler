# The Tabletop subscribes to the Spine's SSE stream for card.played, replacing the Shuffler's direct POST

Mountain: spine-gathers-data
Ship: fleet
Status: ready-for-agent

## Problem Statement

Today, when a player plays or discards a card, the Shuffler tells the Tabletop about it
with a direct, blocking HTTP POST (`sendCardToTable`, straight from
`apps/shuffler/src/port-tabletop`). This is the last physical/administrative event kind
that bypasses the Spine entirely — every other piece of Mountain 2 ("Spine Tells the
Story") routes through the Spine's append-only log, but `card.played` still takes a
side channel the Spine never sees on its way to the canvas. (The Shuffler does also send
`card.played` to the Spine, but that send is a separate, best-effort, log-only side
trip — the Tabletop's copy of the event doesn't come from there.)

The `.scratch/spine-in-the-middle/map.md` design already named this gap ("The
Tabletop's Spine SSE subscriber... Design not started") and deliberately left it out of
the sibling join-flow ticket so that ticket's direct Spine→Tabletop `seat.joined` call
wouldn't get in this design's way. The Spine already has everything needed on its side:
the Shuffler's `card.played` POST already lands in the Spine's log via the generic
`POST /tables/:table_id/events` endpoint, and the Spine already broadcasts every
appended event over `GET /tables/:table_id/events/stream`, one SSE connection per table
— the admin page already dogfoods this exact stream. What's missing is a consumer: the
Tabletop has no live subscriber to that stream, so nothing on the Spine's outbound side
has anywhere to go for `card.played` yet.

## Solution

Give the Tabletop's long-running server a live SSE subscription to the Spine's
per-table event stream, one connection per table room, opened the first time a
`seat.joined` notification tells the Tabletop that room's Spine `tableId`. Route
`card.played` events arriving over that subscription into the same handling
(`handleCardArrival`'s dedup, `ensurePlayerArea` self-heal, and card placement) that the
direct HTTP POST drives today. In the same change, delete the Shuffler's direct
`card.played` POST to the Tabletop entirely — no side-by-side transition period, per
the standing 2026-08-11 decision. After this lands, `card.played` reaches the Tabletop
exactly the way `seat.joined` already does conceptually: Shuffler tells the Spine, the
Spine is the one source of truth, and the Tabletop finds out by listening to the Spine.

## User Stories

1. As Jess building toward the Interpreter, I want `card.played`'s only path to the
   Tabletop to run through the Spine, so that Mountain 2's claim — every
   physical/administrative event crosses the Spine's log — is true for every event kind,
   not just `seat.joined`.
2. As a player playing or discarding a card, I want the card to still appear on the
   Tabletop's canvas in the same place it does today, so that this plumbing change is
   invisible to me during a game.
3. As a player, I want playing a card to never be blocked by the Tabletop being slow or
   unreachable, so that a flaky Tabletop connection doesn't stop my game — mirroring the
   `seat.joined` ticket's story 8, now true for `card.played` too.
4. As a developer, I want the Tabletop's card-arrival handling logic (dedup, self-healing
   player area, card placement) to be identical regardless of whether it's driven by an
   HTTP POST or an SSE message, so that this change is a wiring swap, not a rewrite of
   proven logic.
5. As a developer, I want exactly one live Spine subscription per table room, not one per
   seat or one per card, so that a table with several players doesn't open redundant
   connections to the Spine.
6. As a developer, I want the Tabletop to learn a room's Spine `tableId` from data it
   already receives (`seat.joined`), so that no new Spine endpoint or lookup call is
   needed just to find out which stream to open.
7. As a developer, I want a dropped SSE connection to reconnect on its own, so that a
   transient network blip between the Tabletop and the Spine doesn't permanently stop
   cards from arriving for the rest of that table's game.
8. As Jess, I want no catch-up/replay of events missed while disconnected, so that this
   stays consistent with the 2026-08-11 decision that parity with today's plain-POST
   behavior doesn't require catch-up (today's POSTs have nothing to "miss" either).
9. As a developer reading `apps/tabletop/CLAUDE.md` and `apps/shuffler/CLAUDE.md` after
   this change, I want both to describe the new, single path — Shuffler → Spine → SSE →
   Tabletop — so that the documented behavior matches the code and nobody goes looking
   for a `card.played` POST handler that no longer exists.
10. As Jess reading the Spine's admin log, I want `card.played` events to already be
    indistinguishable in shape from any other broadcast event, so that this change needs
    no new envelope or payload handling on the Spine's outbound side — it already
    broadcasts everything uniformly.
11. As a developer, I want the Tabletop's existing dedup (on event id and on
    `card.instanceId`) to keep working unchanged, so that a redundant delivery — e.g. a
    reconnect landing on an event already processed, or any future retry behavior on the
    Shuffler→Spine send — never double-places a card.
12. As a developer removing the Shuffler's direct-POST code path, I want the deletion to
    leave no dead types, dead tests, or dead config (e.g. `TABLETOP_URL` usage specific
    to `card.played`) behind, so that the codebase doesn't carry a second, unused way of
    doing the same thing.
13. As Jess, I want this ticket's test to be the one that would have caught today's gap —
    an end-to-end run that plays a card through the Shuffler and asserts it lands on a
    real Tabletop's canvas with no direct HTTP call between them, only the Spine in the
    middle — so that the fleet has one real precedent proving `card.played` fully crosses
    the Spine, the same way the join-flow ticket proved it for `seat.joined`.

## Implementation Decisions

- **Subscription lifecycle: one per room, opened on first `seat.joined`.** The Tabletop's
  room registry (`apps/tabletop/src/server/rooms.ts`, `RoomEntry`) gains a slot for the
  room's live Spine SSE subscription (connection handle + the room's Spine `tableId`).
  `handleSeatJoined` — already the sole place the Tabletop learns anything from the Spine
  — reads `tableId` off the incoming `seat.joined` envelope (an existing envelope field;
  no contract change) and, only if the room doesn't already have a subscription open,
  opens one against `GET /tables/:tableId/events/stream` on the Spine. A second seat
  joining the same room is a no-op for this purpose — the room already has its
  subscription. This means table creation and "the Tabletop starts listening" are the
  same moment in practice: a room doesn't exist on the Tabletop until its first seat
  joins, and the Spine never tells the Tabletop about a table any earlier than that
  either (`table.created` is Spine-internal only, minted in the same transaction as the
  first seat, per research — there is no earlier moment to hook).
- **The subscriber is a small hand-rolled SSE client, not a new dependency.** The Spine's
  wire format (`services/spine/lib/sse_stream.rb`) is exactly `data: <json>\n\n`, single
  line, no `id:`, no `retry:`, no heartbeats — simple enough to parse from a streamed
  `fetch` response body without pulling in an `EventSource` polyfill (Node's built-in
  `EventSource`/browser API isn't naturally at home in a server process holding many
  concurrent per-table streams). Each `data:` frame's JSON is `{event: <full envelope>}`,
  matching what the admin page already parses client-side.
- **Reconnect without catch-up.** A dropped connection (network blip, Spine restart)
  triggers an immediate reconnect against the same URL, matching native `EventSource`'s
  default behavior and story 7. No replay of missed events is requested or expected —
  this is a bare reconnect, not the catch-up mechanism the 2026-08-11 decision ruled out;
  it only resumes listening for whatever the Spine broadcasts next. If the Tabletop
  process itself restarts, all room state (including subscriptions) is lost the same way
  it is today for any other in-memory room state — a subsequent `seat.joined` for that
  table re-opens it.
- **Received events dispatch by `kind`.** The subscriber inspects `event.kind` on each
  parsed message; a `card.played` event is handed to the same `handleCardArrival` logic
  used today, adapted to take an already-parsed envelope instead of an Express
  `req`/`res` pair (the HTTP-specific parts — route param extraction, HTTP status
  response — are stripped out; the validation, dedup, `ensurePlayerArea`, and placement
  logic are unchanged). Any other `kind` on the stream (e.g. `seat.taken`,
  `table.created`) is ignored by this subscriber for now — only `card.played` has a
  consumer on the Tabletop side today.
- **The Shuffler's direct POST is deleted, not deprecated.** `HttpTabletopGateway`'s
  `sendCardToTable`, the `TabletopPort` method it implements, `FakeTabletopGateway`'s
  matching method, and the blocking `sendCardToTableFirst` call in `app.ts` (currently
  gating the play/discard action on Tabletop reachability) are all removed. Playing or
  discarding a card no longer waits on or can be blocked by the Tabletop at all — only
  `sendCardPlayedToSpineBestEffort` remains on that path, unchanged from today. The
  Tabletop's `POST /api/tables/:tableName/cards` route and `handleCardArrival`'s
  HTTP-shaped entry point are removed once the SSE path replaces it; the dedup/self-heal/
  placement logic inside is kept and reused by the new subscriber.
- **Failure mode changes, deliberately, per the standing decision.** Before this change,
  a Tabletop that's down blocks the play action (an error the player sees, per
  `TableSendFailedError`). After this change, a card's only path to the Spine — and from
  there to the Tabletop — is the existing best-effort send; a failure there is a
  `log.warn`, same as any other best-effort Spine send today, and the card silently never
  reaches the Tabletop. This trade was made explicitly in the 2026-08-11 "atomic swap"
  decision (consistent with the join-flow ticket's story 8 — a flaky Tabletop shouldn't
  cost a player their turn) and isn't reopened here, but it's worth stating plainly since
  it's a real behavior change, not just a wiring change.

## Testing Decisions

- Tests exercise external behavior only — no mocks, fakes standing in for the real
  network boundary, consistent with the fleet's testing rule.
- **Spine seam**: no change needed — the generic ingestion/broadcast pipe
  (`POST /tables/:table_id/events` → `GET /tables/:table_id/events/stream`) is already
  tested and already carries `card.played` today; this ticket doesn't touch the Spine.
- **Tabletop seam — the new subscriber**: a small fake SSE server (same style as the
  fake-Tabletop-HTTP-server precedent used by the join-flow ticket's Spine-side tests,
  mirrored here on the Tabletop side standing in for the Spine) that a test points the
  subscriber at, publishes a `card.played` frame, and asserts the same tldraw store
  mutation that today's HTTP-driven test asserts. A second test covers dedup (the same
  event id delivered twice produces one card, matching today's HTTP dedup test). A third
  covers reconnect: close the fake server's connection mid-stream, reopen it, publish an
  event, and confirm it still arrives and places a card.
- **Shuffler seam**: existing tests on the play/discard routes are updated to drop
  assertions about the deleted Tabletop POST; a test confirms play/discard succeeds even
  when the Spine is unreachable (best-effort, unchanged) and that no HTTP call to the
  Tabletop is made at all.
- **Cross-ship verification**: extend
  `apps/shuffler/test/verification/verify-tabletop-integration.spec.ts` (already spawning
  a real Tabletop, and already extended by the join-flow ticket to spawn a real Spine
  too) to play a card through the Shuffler and assert it lands on the Tabletop's canvas
  with the Shuffler→Tabletop HTTP call path removed from the code entirely — this is the
  test that proves `card.played` now only reaches the Tabletop via the Spine.
- Run each ship's existing unit suite (`bin/test` for the Spine — unaffected but confirms
  nothing broke, `npm test` for the Shuffler and the Tabletop) plus the extended
  verification spec before calling this done.

## Out of Scope

- **The Shuffler's own Spine SSE subscriber** (the card-return/library-portal-drag
  channel) — separate, undesigned, tracked in `.scratch/spine-in-the-middle/map.md`.
- **The join-flow ticket's work** (`.scratch/spine-in-the-middle/issues/*`) — already
  in progress elsewhere; this spec doesn't touch `POST /join`, seat idempotency, or the
  `seat.joined` payload shape beyond reading its existing `tableId` field.
- **Reconnect *catch-up*/replay of missed events** — explicitly ruled out 2026-08-11;
  see Implementation Decisions for the distinction between that and the bare reconnect
  this spec does include.
- **The Tabletop→Spine sender for its own physics events** (`card.moved`, taps, flips,
  counters) — a different, not-yet-built data-flow direction, tracked separately in the
  map's "Not yet specified".
- **Any change to the Spine's broadcast/SSE infrastructure itself** — `table_broadcaster.rb`,
  `sse_stream.rb`, and the `/events/stream` route are unmodified; this spec is purely a
  new consumer.
- **Dispatching stream `kind`s other than `card.played`** on the Tabletop side — the
  subscriber may see `seat.taken`, `table.created`, etc. on the wire (the Spine
  broadcasts everything) but nothing consumes them yet; a future ticket can add handlers
  without touching the subscription plumbing this spec builds.
- **Multiple Tabletop processes/horizontal scaling** — the room registry and its
  subscriptions are in-process, in-memory, matching every other piece of `rooms.ts`
  state today; no new constraint introduced or relaxed here.

## Further Notes

- The single largest behavior change here — a card silently failing to reach the
  Tabletop is now a `log.warn` instead of a blocked play action — is called out under
  Implementation Decisions. If that ever feels wrong in practice, the fix is scoped to
  `sendCardPlayedToSpineBestEffort`'s error handling (e.g. surfacing a "card may not
  have reached the table" notice), not to this ticket's subscriber design.
- Consult `owners/fleet-is-observable` on the new subscriber's tracing — the broadcast
  envelope already carries a fresh `traceparent` injected at publish time
  (`Table#broadcast`, per the Spine's CLAUDE.md), so the subscriber picking that up and
  continuing the trace (rather than starting an unlinked one) is the same shape as the
  admin page's existing client-side trace-link precedent, just server-side.
- Consult `owners/tabletop-shape-mechanics` and `owners/two-faced-cards` before
  implementing — both know `cardArrival.ts`'s existing behavior in detail and should
  confirm nothing about moving its entry point from HTTP to SSE-dispatch changes how a
  card's shape/face is placed.
- `apps/tabletop/CLAUDE.md` and `apps/shuffler/CLAUDE.md` both need updates once this
  lands: the Tabletop's `rooms.ts`/server section to describe the new subscription, and
  the Shuffler's port-tabletop section (and its "Table Mode" description, if the
  join-flow ticket hasn't already rewritten it) to drop the deleted direct-POST path.
- This spec, together with the join-flow ticket, completes Mountain 2's core promise for
  the two event kinds that exist in code today (`seat.joined`, `card.played`). The
  Tabletop's own physics-event sender (card.moved, taps, flips, counters) remains the
  next real gap, tracked in the map.

## Comments
