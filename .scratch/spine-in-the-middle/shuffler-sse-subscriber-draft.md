# The Shuffler's own Spine SSE subscriber — draft decisions (grilling in progress)

Mountain: spine-gathers-data
Ship: fleet
Status: DRAFT — mid-grilling, not yet a spec

## What this is

The card-return channel (Tabletop→Shuffler, library-portal drag) was fully vocabulary-specced
in `.scratch/tabletop-cards-come-and-go/issues/02-event-vocabulary.md` (`card.returned.v1`,
distinguished by envelope `occurredIn`) but **never implemented** — no `eventsUrl`, no
`card.returned` handler, no schema file exist in code today. This design builds it for the
first time, routed through the Spine from day one (superseding tickets 01/06/11's direct-POST
`eventsUrl` design, per `map.md`'s 2026-08-11 decision that card-return reroutes through the
Spine).

Symmetric precedent: `.scratch/tabletop-spine-sse-subscriber/spec.md` (Tabletop's own Spine
subscriber for `card.played`, landed 2026-08-18, commit `6c6f52cc`).

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

## Open / not yet asked

- Failure/observability semantics for the new subscriber and the Tabletop's send (expected:
  best-effort, matching `sendCardPlayedToSpineBestEffort`/the Tabletop subscriber's
  precedent — span attributes, `log.warn`, never blocks the gesture or the page).
- Testing approach (expected: fake SSE server precedent, no mocks, per fleet convention).
- Exact wire parsing approach on the Shuffler side (expected: same hand-rolled reader as
  `apps/tabletop/src/server/spineSubscriber.ts`, for the same many-concurrent-streams
  reason).

## Consulting

Mid-interview owner consults in progress: `fleet-is-observable-context` (new outbound
Tabletop→Spine send, new inbound Spine subscriber, new browser-facing SSE route — tracing/
propagation across all three hops), `animations-context` (the map's sketch flagged this: an
externally-triggered `game-state-updated` changes *when*/*why* the game area re-renders, not
just same-tab command responses), `two-faced-cards-context` (confirm the no-`face`-field
`card.returned.v1` payload, already decided in ticket 02, has no wrinkle once delivered via
the Spine's JSON round-trip instead of a direct POST).
