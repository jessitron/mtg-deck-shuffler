# The Shuffler's own Spine SSE subscriber

Mountain: spine-gathers-data
Ship: fleet
Type: grilling
Status: resolved

## Question

The Shuffler has no Spine SSE subscriber of its own yet. It's symmetric to the Tabletop's
own subscriber (`apps/tabletop/src/server/spineSubscriber.ts`, subscribing to
`card.played`) but for the reverse direction: a card returning from the Tabletop's
library portal needs to reach the Shuffler's Revealed zone, and — unlike the Tabletop's
side — push a live update to any open browser tab, since the Shuffler has no live
connection of its own (HTMX).

Grilled with Jess, 2026-08-18.

## Answer

## What this is

The card-return channel (Tabletop→Shuffler, library-portal drag) was fully vocabulary-specced
in `.scratch/tabletop-cards-come-and-go/issues/02-event-vocabulary.md` (`card.returned.v1`,
distinguished by envelope `occurredIn`) but **never implemented** — no `eventsUrl`, no
`card.returned` handler, no schema file exist in code today. This design builds it for the
first time, routed through the Spine, matching how every other event kind reaches its
consumer.

Symmetric precedent: `apps/tabletop/src/server/spineSubscriber.ts` (the Tabletop's own Spine
subscriber for `card.played`).

## Decisions so far (grilled with Jess)

1. **Vocabulary reused, identity field updated to `gameCardIndex`**: `card.returned.v1`,
   `occurredIn: "tabletop"` (portal drag → Shuffler moves card to Revealed) vs.
   `occurredIn: "shuffler"` (Return button etc. → Tabletop poofs the shape). Payload:
   `card: {scryfallId}`, `gameCardIndex` (top-level, like `card.played.v1`), `seat`,
   optional `fromZone`. No `face` field (table is not authoritative for a table card's
   face). **Identity crosses the boundary as `gameCardIndex`, not `instanceId`** — Jess
   reversed the "`gameCardIndex` never crosses" rule on 2026-08-10
   (`let-gamecardindex-out`) and reaffirmed it hard during this session: it's
   deterministic per card in a game, already recorded throughout the log, and a real
   identifier — not something to keep opaque. `gameCardIndex` already rides `card.played`
   today (`buildCardPlayedEvent`, populated, required TS field) but isn't yet stored on
   the Tabletop's shape/consumed anywhere; this design is what makes it a real round-trip
   identity, not just a one-way passenger. **This also resolves the "no
   instanceId→GameCard lookup exists" gap** the research pass found — the Shuffler
   already looks cards up by `gameCardIndex` everywhere (`findCardByIndex`), so
   `card.returned.v1` needs no new lookup machinery at all. `gameId` also crosses freely
   (Jess, this session, reversing `01-return-channel.md`'s original "no gameId crosses"
   line — fixed in place, see commit `ca78ac99`). This design writes the missing
   `contracts/payloads/card.returned.v1.json` schema.
2. **`eventsUrl` retired entirely.** `seat.joined` never grows an `eventsUrl` field. The
   address for card-return is just "the Spine" — same as `seat.joined` and `card.played`
   already use. The Tabletop POSTs `card.returned.v1` (`occurredIn: "tabletop"`) to the
   Spine's existing generic `POST /tables/:tableId/events` (mirroring how the Shuffler
   already POSTs `card.played` to the Spine today).
3. **Scope: wiring only.** This spec covers the Tabletop→Spine send function and the
   Shuffler's subscribe-and-apply path. The portal-drag gesture itself
   (`.scratch/tabletop-cards-come-and-go/issues/12-the-library-portal.md`, unbuilt,
   `ready-for-agent`) is separate, already-specced work that will call into the send
   function this spec defines.
4. **Subscription lifecycle**: opened (a) on successful join, and (b) idempotently on every
   hit of `GET /game-section/:gameId` (the same route the existing `HX-Trigger:
   game-state-updated` listener already re-fetches through, including initial page load) —
   if the persisted game has a `spineTableId` but no live entry in a new in-memory registry,
   open one. Covers "came back to a game after a while" (server restart, first load in a
   new tab) without a separate code path.
5. **Teardown**: close the Spine subscription when the last browser SSE tab for that game
   disconnects; a later `GET /game-section/:gameId` hit re-opens it via the same idempotent
   check. No expiry timer.
6. **New in-memory registry** on the Shuffler server (mirroring Tabletop's `rooms.ts`),
   keyed by `gameId`, holding the open Spine SSE connection + the set of open browser SSE
   response streams for that game. Doesn't survive a server restart (matching every other
   piece of in-memory Shuffler/Tabletop state).
7. **Browser delivery**: native browser `EventSource` via a small inline script (no htmx SSE
   extension — no new dependency), one per open tab against a new per-game SSE route (e.g.
   `GET /game-events/:gameId`). `onmessage` dispatches
   `document.body.dispatchEvent(new CustomEvent('game-state-updated', {bubbles:true}))`,
   reusing `active-game-page.ts`'s existing `hx-trigger="game-state-updated from:body"`
   listener completely unchanged.
8. **Dedup on envelope event id**, mirroring the Tabletop subscriber's existing dedup
   exactly — a redelivered event (e.g. reconnect landing on an already-seen event) is a
   no-op, not a double-move to Revealed.
9. **No reconnect catch-up** (standing 2026-08-11 decision, same as the Tabletop
   subscriber) — a dropped Spine connection reconnects and only picks up what's broadcast
   next.
10. **`gameId` also crosses freely now.** Reversed by Jess this session (fixed in place in
    `01-return-channel.md`, `06-seating-carries-two-urls.md`,
    `tabletop-cards-come-and-go/spec.md`, `spine-in-the-middle/issues/01-the-join-flow.md`
    — commits `ca78ac99`, `c5686f0e`). No boundary guard on it anywhere in the fleet.
11. **Tabletop→Spine send tracing**: no new server-side `traceparent`-minting helper.
    Ride the ambient request span (the gesture handler that triggers the send) plus
    undici's automatic outbound header, matching `sendCardPlayedToSpineBestEffort`'s
    precedent exactly. Failure: `spine_send.send_failed` span attribute (reused verbatim,
    the fleet's existing name for this) + `log.warn`, never throws, never blocks the
    gesture.
12. **Subscriber dispatch span outcome attribute**: `card_return.outcome`, values
    `applied` / `duplicate`, on a `"sse subscription: card.returned"` `SpanKind.CONSUMER`
    span — same shape as the Tabletop subscriber's `"sse subscription: card.played"` +
    `arrival.outcome`. Parent context extracted from the envelope's `traceparent`
    (injected fresh by the Spine's `Table#broadcast`), falling back to `ROOT_CONTEXT` if
    missing/malformed.
13. **Browser-facing `GET /game-events/:gameId` SSE route gets no span** — a
    log on open and a log on close instead (Jess: don't leave a route's root span open for
    the connection's entire lifetime, that's a new shape this ship doesn't have elsewhere).
    The Shuffler's dispatch span (decision 12) already captures the interesting event; the
    browser tab receiving the resulting push is plumbing, not a new thing worth its own
    span.
14. **Mid-drag swap risk accepted, not guarded.** An SSE-triggered `#game-container` swap
    can now land while a player has an unfinished native-HTML5-drag gesture in flight
    (previously every swap was a consequence of this tab's own completed action). Rare
    enough to accept the occasional visual glitch rather than add a
    suppress-during-drag guard now; worth a line in `owners/animations/interactions.md`
    if it's ever actually hit in practice.
15. **No entrance animation for an externally-triggered reveal** — known, accepted
    consequence, not a defect. `GET /game-section/:gameId` already renders with no
    `WhatHappened` (this is the same code path the existing `from:body` HX-Trigger case
    already exercises), so a card someone else returned just appears; this design doesn't
    change that.

## Testing approach

- No mocks — fakes only, per the fleet's testing convention.
- **Tabletop send seam**: a fake Spine HTTP server (mirroring the join-flow ticket's fake
  Tabletop server) that a test points the sender at; asserts the POST body/envelope shape,
  and that a down/erroring fake still lets the gesture complete (best-effort).
- **Shuffler subscriber seam**: a fake SSE server (same style as
  `apps/tabletop/src/server/spineSubscriber.ts`'s tests) publishing a `card.returned.v1`
  frame; asserts the card lands in Revealed. A second test covers dedup (same event id
  twice → one move, `card_return.outcome: duplicate` on the second). A third covers
  reconnect: drop the fake server mid-stream, reopen, publish, confirm delivery resumes.
- **Registry lifecycle**: a test opening the game-section route twice with no live
  subscription confirms idempotency (one Spine connection, not two); a test closing the
  last browser SSE tab confirms Spine-side teardown; a subsequent game-section hit
  confirms re-open.
- **Browser push**: a Playwright test — two tabs on the same game, a fake `card.returned`
  event delivered to the Spine (or injected at the Shuffler's subscriber boundary),
  confirms the second tab's `#game-container` re-fetches without a manual reload.
- **Cross-ship verification**: extend
  `apps/shuffler/test/verification/verify-tabletop-integration.spec.ts` (already spawning
  a real Tabletop and a real Spine) to drag a card into the library portal — once ticket
  12's gesture exists to drive it, or a lower-level equivalent (a direct call to the send
  function this spec defines) if ticket 12 hasn't landed yet — and assert it lands in the
  Shuffler's Revealed zone with no direct Tabletop→Shuffler HTTP call anywhere in the code.

## Wire parsing approach

Same hand-rolled SSE reader as `apps/tabletop/src/server/spineSubscriber.ts` (streamed
`fetch`, parsing `data: <json>\n\n` frames, no `EventSource` on this leg) — the Shuffler's
server holds one connection per active game, the same many-concurrent-streams reason the
Tabletop subscriber avoided `EventSource` there. (The *browser-facing* leg, decision 7,
is the opposite case — one tab, one connection — and does use native `EventSource`.)

## Consulted

`fleet-is-observable-context`, `animations-context`, `two-faced-cards-context` — all
consulted mid-interview with this draft; their findings are folded into decisions 1, 6,
11-14 above. Re-run `-review` on the finished spec before implementation per the fleet's
standing process.

## Status: grilling frontier empty

Ready for `/to-spec` (Jess runs this — disable-agent-invocation in this repo).
