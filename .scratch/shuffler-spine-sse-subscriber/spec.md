# The Shuffler gains its own Spine SSE subscriber, so a card returned from the Tabletop's library portal reaches an open browser tab live

Mountain: spine-gathers-data
Ship: fleet
Status: ready-for-agent

## Problem Statement

Events on the tabletop affect the shuffler, and vice versa. The Spine is in charge of the events, and it needs to notify both the other ships of what's happening. Currently the tabletop opens an SSE stream and listens for events (such as card.played) that the spine sends. The shuffler needs that too. When this is done, the tabletop will be able to return a card to the shuffler (the reverse of card.played, pretty much).

`.scratch/spine-in-the-middle/map.md` names the card-return channel — a player dragging a
card off the Tabletop's canvas onto the library portal, which should move that card into
the Shuffler's Revealed zone — as fully vocabulary-specced but never implemented. The
event kind it needs, `card.returned.v1`, was designed in
`.scratch/tabletop-cards-come-and-go/issues/02-event-vocabulary.md` but no `eventsUrl`, no
handler, and no schema exist in code today.

This is the reverse direction of the just-landed Tabletop subscriber
(`.scratch/tabletop-spine-sse-subscriber/spec.md`, commit `6c6f52cc`), and it isn't a
simple mirror image: the Tabletop is a long-running canvas process that already dispatches
into live in-memory shape state, but the Shuffler is HTMX — a page has no live connection
of its own today. Pushing a `card.returned` event into an open Shuffler tab needs a second
hop the Tabletop's side never needed: Spine → Shuffler server (SSE) → browser tab (also
SSE, native `EventSource`), so a player watching their hand doesn't have to reload to see
a card come back from the table.

This was fully designed in a grilling session with Jess on 2026-08-18
(`.scratch/shuffler-spine-sse-subscriber/answer.md`); this spec formalizes that design for
implementation.

## Solution

Route the card-return channel through the Spine. Build both legs:

1. **Tabletop → Spine**: when a player drags a card onto the library portal, the Tabletop
   POSTs a `card.returned.v1` event to the Spine's existing generic
   `POST /tables/:tableId/events` — the same send shape `card.played` already uses today.
2. **Spine → Shuffler → browser**: the Shuffler's server opens one live Spine SSE
   subscription per active game (mirroring the Tabletop's own subscriber), and forwards
   `card.returned` arrivals to any open browser tab for that game over a small
   Shuffler-owned SSE route, using native `EventSource` — no new client-side dependency.
   The browser side dispatches the same `game-state-updated` custom event the existing
   HTMX `HX-Trigger` listener already handles, so the page re-fetches and displays the
   returned card in Revealed with no new rendering path.

This spec covers the wiring only — both send/receive legs and the schema. The library
portal drag gesture itself is separate, already-specced work
(`.scratch/tabletop-cards-come-and-go/issues/12-the-library-portal.md`) that will call
into the Tabletop-side send function this spec builds.

## User Stories

1. As a player, when I drag a card off the Tabletop's canvas onto the library portal, I
   want it to appear in my Shuffler tab's Revealed zone without reloading the page, so
   that returning a card feels as immediate as playing one did.
2. As a player with the Shuffler open in more than one tab (or a spectator watching), I
   want every open tab for that game to update, so that nobody's view goes stale.
3. As a player, I want a card-return to keep working even if my Shuffler tab was opened
   long before I sat down at the table (server restart, first load in a new tab), so that
   a live subscription always gets (re-)established rather than silently never existing.
4. As a developer, I want `card.returned.v1`'s identity to cross the Spine boundary as
   `gameCardIndex` — a deterministic per-card, per-game identifier already recorded
   throughout the event log — so that the Shuffler can look the card up with its existing
   `findCardByIndex`-style machinery, with no new instanceId→GameCard lookup needed.
5. As a developer, I want `gameId` to cross the boundary freely on this event too
   (matching the fleet's standing reversal of the old "gameId never crosses" rule), so
   that the Shuffler's subscriber knows which game an incoming event belongs to without an
   extra lookup.
6. As a developer, I want exactly one live Spine subscription per active game, not one per
   browser tab, so that a game with several open tabs doesn't open redundant connections
   to the Spine.
7. As a developer, I want the Shuffler's subscription lifecycle to piggyback on the route
   it already hits on every page load and every HTMX re-fetch (`GET /game-section/:gameId`),
   opening a subscription idempotently whenever that route runs for a game that has a
   `spineTableId` but no live entry yet, so that no separate "start listening" code path
   is needed.
8. As a developer, I want the Spine subscription torn down when the last browser tab for
   a game disconnects, and re-opened idempotently on the next page hit, so that the
   Shuffler doesn't hold connections open for games nobody is watching.
9. As a developer, I want a redelivered `card.returned` event (e.g. a reconnect landing on
   an already-seen event) to be a no-op rather than a double-move to Revealed, so that
   dedup on the envelope's event id protects this path the same way it protects the
   Tabletop's `card.played` subscriber.
10. As a developer, I want a dropped Spine connection to reconnect on its own with no
    catch-up or replay of events missed while disconnected, so that this stays consistent
    with the fleet's standing 2026-08-11 decision and the Tabletop subscriber's own
    behavior.
11. As Jess building toward the Interpreter, I want the card-return channel to route
    through the Spine's log from the moment it's implemented — never as a direct
    Tabletop→Shuffler HTTP call — so that Mountain 2's claim (every
    physical/administrative event crosses the Spine) holds for this event kind too, with
    no direct-POST code to later delete.
12. As a developer, I want the Tabletop's send to be best-effort — a down or erroring
    Spine never blocks the drag gesture from completing on the canvas — so that a flaky
    Spine connection doesn't cost a player their action, matching every other
    Tabletop→Spine send in the fleet.
13. As a developer, I want the Shuffler's own trace to continue from the broadcast
    envelope's `traceparent` (injected fresh by the Spine's `Table#broadcast`) rather than
    start an unlinked one, so that a card's return is visible as one connected trace from
    the Tabletop gesture through the Spine to the Shuffler's dispatch, matching the
    Tabletop subscriber's own precedent.
14. As a developer, I want the receiving span for each `card.returned` arrival to carry
    outcome data (`applied` vs `duplicate`) as an attribute, with a second nested span
    only when the event is actually acted on, so that this new consumer follows the same
    "SSE event standard" now documented for the Tabletop's own subscriber
    (`apps/tabletop/CLAUDE.md`) rather than inventing a different shape.
15. As a developer, I want the browser-facing `GET /game-events/:gameId` SSE route to log
    open/close rather than hold a root span open for the connection's whole lifetime, so
    that this ship doesn't introduce a new "long-lived route span" shape it doesn't have
    anywhere else.
16. As Jess, I want no mocks anywhere in this work — fakes standing in for the Spine and
    for the browser's `EventSource`, consistent with the fleet's testing convention — so
    that the tests exercise real behavior at the real boundaries.
17. As a developer reading `apps/shuffler/CLAUDE.md` and `apps/tabletop/CLAUDE.md` after
    this lands, I want both to describe the new path (Tabletop → Spine → Shuffler server →
    browser tab), so that the documented behavior matches the code.
18. As a player who accepts the tradeoff, I want a card returned via a portal drag to
    simply appear in Revealed with no entrance animation (since this HTMX swap has no
    `WhatHappened` context, same as every other externally-triggered
    `game-state-updated` re-fetch today), so that this is a known, accepted plumbing
    limitation rather than a bug someone re-discovers later.
19. As a developer, I want an occasional visual glitch accepted — rather than guarded
    against — when an SSE-triggered swap lands mid-drag during a player's own unfinished
    native-HTML5 hand-reorder gesture, so that this spec doesn't grow a suppress-during-drag
    mechanism for a rare interaction that previously never came up (every swap used to be a
    consequence of the same tab's own completed action).

## Implementation Decisions

- **New contract**: `card.returned.v1` payload schema, following `card.played.v1`'s shape
  — `card: {scryfallId}`, `gameCardIndex` (top-level, required), `seat`, optional
  `fromZone`. No `face` field — the table isn't authoritative for a table card's face.
  Envelope `occurredIn: "tabletop"` distinguishes a portal-drag return (this spec) from
  `occurredIn: "shuffler"` (an existing in-Shuffler Return action, out of scope here).
- **`eventsUrl` is retired as a concept entirely** for this channel — `seat.joined` never
  grows one. The address for card-return, like `seat.joined` and `card.played` already,
  is simply "the Spine": the Tabletop POSTs to the Spine's existing generic
  `POST /tables/:tableId/events`, mirroring how the Shuffler already POSTs `card.played`
  to the Spine.
- **Tabletop send function**: best-effort, matching `sendCardPlayedToSpineBestEffort`'s
  existing precedent exactly — rides the ambient request/gesture span plus undici's
  automatic outbound header for trace propagation (no new server-side `traceparent`-minting
  helper). On failure: a `spine_send.send_failed` span attribute (the fleet's existing
  name for this outcome, reused verbatim) plus `log.warn`; never throws, never blocks the
  drag gesture from completing on the canvas.
- **Shuffler subscription lifecycle**: opened (a) on successful table join, and (b)
  idempotently on every hit of `GET /game-section/:gameId` — the same route the existing
  `HX-Trigger: game-state-updated` listener already re-fetches through, including initial
  page load. If the persisted game has a `spineTableId` but no live entry in a new
  in-memory registry, one is opened. This single check covers "came back to a game after a
  while" (server restart, first load in a new tab) without a separate code path.
- **Teardown**: the Spine subscription for a game closes when the last open browser SSE
  tab for that game disconnects. A later `GET /game-section/:gameId` hit re-opens it via
  the same idempotent check. No expiry timer.
- **New in-memory registry** on the Shuffler server, mirroring the Tabletop's room
  registry, keyed by `gameId`, holding the open Spine SSE connection plus the set of open
  browser SSE response streams for that game. Does not survive a server restart, matching
  every other piece of in-memory Shuffler/Tabletop server state.
- **Wire parsing, Spine leg**: the same hand-rolled SSE client shape as the Tabletop's
  `spineSubscriber.ts` — a streamed `fetch` parsing `data: <json>\n\n` frames, through a
  per-subscription dispatcher with bounded `headersTimeout`/`bodyTimeout` (matching the
  Tabletop's `createHeartbeatAwareDispatcher` fix, since the Spine now sends heartbeat
  comment frames on connect and periodically while quiet) — not `EventSource`, since the
  Shuffler's server holds one connection per active game, the same many-concurrent-streams
  reason the Tabletop subscriber avoided it.
- **Browser delivery, browser leg**: native browser `EventSource` via a small inline
  script (no htmx SSE extension, no new dependency), one per open tab against a new
  per-game route `GET /game-events/:gameId`. `onmessage` dispatches
  `document.body.dispatchEvent(new CustomEvent('game-state-updated', {bubbles:true}))`,
  reusing the active-game page's existing `hx-trigger="game-state-updated from:body"`
  listener completely unchanged.
- **Dedup**: on the envelope's event id, mirroring the Tabletop subscriber's dedup
  exactly — a redelivered event (e.g. a reconnect landing on an already-seen event) is a
  no-op, not a second move to Revealed.
- **No reconnect catch-up** — standing fleet decision, matching the Tabletop subscriber.
  A dropped Spine connection reconnects and only picks up what's broadcast next.
- **Tracing, receiving span**: `dispatchSpineEvent`-equivalent span
  `"sse subscription: card.returned"`, `SpanKind.CONSUMER`, parent context extracted from
  the envelope's `traceparent` (a CHILD span, not unlinked), falling back to
  `ROOT_CONTEXT` if missing/malformed. Carries a `card_return.outcome` attribute
  (`applied` / `duplicate`). Follows the now-documented fleet SSE event standard
  (`apps/tabletop/CLAUDE.md`): the receiving span carries all details; a second, nested
  "doing" span exists only when the event is actually acted on (the move to Revealed), not
  for a deduped/rejected event.
- **The browser-facing `GET /game-events/:gameId` SSE route gets no span** covering the
  connection's lifetime — a log on open and a log on close instead. The dispatch span
  above already captures the interesting event; the browser tab receiving the resulting
  push is plumbing.
- **Mid-drag swap risk accepted, not guarded.** An SSE-triggered `#game-container` swap
  can now land while a player has an unfinished native-HTML5-drag gesture in flight on
  their own hand (previously every swap was a consequence of this tab's own completed
  action). Accepted as a rare, occasional visual glitch rather than solved with a
  suppress-during-drag mechanism now.
- **No entrance animation for an externally-triggered reveal** — `GET /game-section/:gameId`
  already renders with no `WhatHappened` for this case (the same code path the existing
  `from:body` HX-Trigger case already exercises today), so a returned card just appears.
  Known, accepted, not a defect to fix here.

## Testing Decisions

- No mocks anywhere — fakes only, per the fleet's standing testing convention. Tests
  exercise external behavior at the real network/process boundaries.
- **Tabletop send seam**: a fake Spine HTTP server (mirroring the join-flow ticket's
  fake-Tabletop-server precedent) that a test points the sender at; asserts the POST
  body/envelope shape, and that a down/erroring fake still lets the drag gesture complete
  on the canvas (best-effort, never blocks).
- **Shuffler subscriber seam**: a fake SSE server (same style as
  `apps/tabletop/src/server/spineSubscriber.ts`'s existing tests) publishing a
  `card.returned.v1` frame; asserts the card lands in Revealed. A second test covers
  dedup (same event id delivered twice → one move, `card_return.outcome: duplicate` on the
  second delivery). A third covers reconnect: drop the fake server mid-stream, reopen it,
  publish an event, confirm delivery resumes with no replay of what was missed.
- **Registry lifecycle**: a test hitting the game-section route twice with no live
  subscription confirms idempotency (one Spine connection opened, not two); a test closing
  the last open browser SSE tab confirms the Spine-side subscription tears down; a
  subsequent game-section hit confirms it re-opens.
- **Browser push**: a Playwright test opening two tabs on the same game, delivering a fake
  `card.returned` event (at the Spine, or injected at the Shuffler's subscriber boundary),
  confirms the second tab's `#game-container` re-fetches and shows the card in Revealed
  with no manual reload.
- **Cross-ship verification**: extend
  `apps/shuffler/test/verification/verify-tabletop-integration.spec.ts` (already spawning
  a real Tabletop and a real Spine) to drag a card into the library portal — via ticket
  12's gesture once it exists, or a direct call to this spec's send function as a
  lower-level stand-in if ticket 12 hasn't landed yet — and assert it lands in the
  Shuffler's Revealed zone with no direct Tabletop→Shuffler HTTP call anywhere in the
  code.
- Run each ship's existing unit suite (`npm test` for the Shuffler and the Tabletop;
  `bin/test` for the Spine, unaffected but confirms nothing broke) plus the extended
  verification spec before calling this done.

## Out of Scope

- **The library portal drag gesture itself**
  (`.scratch/tabletop-cards-come-and-go/issues/12-the-library-portal.md`, already
  specced, `ready-for-agent`) — separate work that will call into this spec's Tabletop
  send function.
- **`occurredIn: "shuffler"`** — an in-Shuffler Return button or similar action that
  should poof the card's shape on the Tabletop's canvas — shares the `card.returned.v1`
  vocabulary but is a different flow, not built here.
- **Reconnect catch-up/replay of missed events** — explicitly ruled out by the fleet's
  standing 2026-08-11 decision; this spec's reconnect is bare, matching the Tabletop
  subscriber.
- **Any change to the Spine's broadcast/SSE infrastructure itself** — the generic
  ingestion/broadcast pipe, `sse_stream.rb`, and the `/events/stream` route are
  unmodified; this spec is purely two new consumers (one on each side) of infrastructure
  that already exists and already carries `card.played` today.
- **Suppressing an SSE-triggered swap during a player's own in-flight drag gesture** —
  accepted as a rare visual glitch, not solved here (see Implementation Decisions).
- **An entrance animation for an externally-triggered card return** — known limitation,
  not addressed by this spec.
- **Multiple Shuffler server processes / horizontal scaling** — the new registry is
  in-process, in-memory, matching every other piece of Shuffler/Tabletop server state
  today; no new constraint introduced or relaxed here.

## Further Notes

- Consult `owners/fleet-is-observable` on the new subscriber's tracing before
  implementing — the SSE event span standard this spec follows was only just documented
  (`apps/tabletop/CLAUDE.md`, 2026-08-20) and this is its first consumer outside the
  Tabletop; confirm nothing about the Shuffler's HTMX-driven architecture changes how that
  standard applies.
- Consult `owners/animations` and `owners/two-faced-cards` before implementing — an
  SSE-triggered `#game-container` swap arriving mid-gesture, and a card arriving into
  Revealed with a face, both touch surfaces those owners know in detail.
- If the "silently missing" failure mode of a best-effort Tabletop→Spine send ever feels
  wrong in practice (a returned card just never shows up, with only a `log.warn` to show
  for it), the fix is scoped to that send function's error handling, not to this spec's
  subscriber design — same posture the Tabletop subscriber spec already took for
  `card.played`.
- `apps/shuffler/CLAUDE.md` needs a new section describing the subscriber, the in-memory
  registry, and the browser-facing SSE route once this lands; `apps/tabletop/CLAUDE.md`
  needs its send-function documented alongside the existing `card.played`/`seat.joined`
  send precedents.
- This spec, together with the Tabletop's own subscriber, completes Mountain 2's core
  promise for card movement in both directions between the two ships that have shipped in
  code today.

## Comments

- Grilled with Jess 2026-08-18; full grilling record and rationale preserved in
  `.scratch/shuffler-spine-sse-subscriber/answer.md`.
