# Decide what a shape knows and announces, without wiring it anywhere

Mountain: tabletop-replaces-mural
Type: grilling
Status: resolved
Blocked by: 03

## Question

Zone entry is detected today and announced to `console.log` — an explicit descope
([zone-entry ticket](../../tabletop-card-shape/issues/01-zone-entry-events.md), 2026-08-06:
*"no callback/emitter/queue yet — nothing downstream consumes this"*). By the end of this map,
several more things will be observable that aren't today: a card tapped, flipped, turned
face-down, given a counter, tucked behind another card, and whatever furniture recognises when
something lands on it.

This ticket decides **what the physics layer knows and is willing to say** — the vocabulary and
the shape of the announcement — and deliberately stops short of the wire.

- **What is worth announcing?** Jess: the Spine gets *"a lot of them, not absolutely every
  move."* Physics is where the line is drawn, because only the shape layer can tell a meaningful
  gesture from a nudge. Which of the above are occurrences, and which are just pixels moving?
- **What identifies the thing it happened to** — `instanceId` alone, or does a counter or a note
  need identity of its own?
- **What's the surface?** One emitter, per-shape callbacks, or something the room subscribes to.
  The descope above deferred this until a consumer existed; map 5 is that consumer.
- **Where does it run?** The card hook is client-side, and there is no live span in scope for a
  pure browser drag gesture. `fleet-is-observable` cleared the temporary `console.log` on exactly
  that basis and flagged that a real consumer must route through a span attribute or `log.ts`.
  **Consult that owner** before deciding the surface.

**Explicitly not this ticket:** the `card.moved` contract payload, the Tabletop→Spine sender, and
making `contracts/` actually validate. Those are map 5, and its founding material is already
written — see `.scratch/tabletop-replaces-mural/parked/card-moved-contract-and-sender.md`. The
seam between the two maps is this ticket's answer: physics says what happened, map 5 decides how
it travels.

## Answer

Jess's default: announce everything, including in-zone repositioning and marks on custom shapes
physics has no name for — but only completed motions, never a per-frame drag position.

**Vocabulary.** Named words for the gestures physics already has semantics for: `card.tapped` /
`card.untapped`, `counter.attached` (a counter arrives on top of a card), `card.attachedBelow` /
`noteAttached` (ticket 07/08's tuck-behind mechanism, shared by counters, notes, and cards),
`card.zoneMoved` (crossed a zone boundary — the geometry ticket 09 already assigns to the card's
own `onTranslateEnd`), `card.flipped`, `card.turnedFaceDown`. Generic `shape.moved` /
`shape.created` / `shape.changed` covers everything else — repositioning within the same zone,
freeform doodles, anything physics can't tell a story about. This is deliberately not a curated
"meaningful gestures only" list: the bar for inclusion is "a completed motion happened," not
"physics judges it interesting."

**Identity.** Only cards (`instanceId`) and zones (`zone`/`seatId`, per ticket 03) carry identity.
Counters and notes carry their text as a plain attribute on the announcement — a counter or note
arriving or leaving is observable, but nothing tracks *which* counter across time, matching
ticket 07/08's decision that they carry no domain identity of their own.

**Card duplication is fog, not decided here.** Jess copies cards on Mural regularly and expects
to eventually here, but physics hasn't designed what a duplicated card *is* (token semantics,
what it inherits) — that's a real gap this map hasn't reached yet. The minimal answer for
whenever it does surface: `shape.created` plus a `copiedFrom` attribute pointing at the source
`instanceId`. No new named word, no token semantics, until that gets designed for real.

**Actor.** Every announcement carries `actor` — for now, tldraw's own per-session sync id
(ephemeral, per browser tab, zero new plumbing required). This is explicitly *not* a real
seat or player identity: the client today has no durable identity at all (`useSync` passes no
`user`, so tldraw assigns whatever anonymous default it likes per session), and `seatId` exists
only server-side. Giving the Tabletop real actor/seat identity is important and Jess is going to
find it a home, but it isn't this ticket's decision and doesn't block this map.

**Trigger mechanism — two different things, not a contradiction.** Detection stays exactly where
ticket 09 already put it: each shape's own hook computes its own gesture (the card's
`onTranslateEnd` runs the zone-containment geometry; `onClick` sets `tapped`; a drop handler sets
counter/note attachment) and writes the conclusion into the shape's own record. Separately, the
*announcement* is centralized: one `store.listen()` — sitting beside or extending
`useCardArrivalSpans.ts` — watches the whole tldraw document store for the resulting mutations,
including ones tldraw's undo manager causes by replaying a prior state, and translates each into
the vocabulary above via `inSpan()` (a short-lived span per occurrence, outcome as attributes —
this fleet's paved road for a browser gesture with no live parent span, per the
`fleet-is-observable` owner). Store mutation source is only ever `'user' | 'remote'` — tldraw
gives no `'undo'` tag — so a reverted change surfaces as an ordinary vocabulary event,
indistinguishable from a fresh action. Cheap, and enough for now.

**No distinct "this was an undo" marker.** Making undo forensically distinguishable from a fresh
action would require overriding tldraw's default undo action (the app uses stock `<Tldraw>` UI
with no app code between a keypress and `editor.undo()`) — that's UI-curation territory. Jess
doesn't like this limit but accepted it for this ticket; see map's Out of scope.

**Destination for now: Honeycomb telemetry only.** These are spans with attributes, nothing
more. Emitting to the Spine, the `card.moved` contract payload, and the sender are map 5's job —
unchanged from this ticket's original scope.
