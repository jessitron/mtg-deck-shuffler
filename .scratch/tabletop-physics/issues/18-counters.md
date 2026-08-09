# 18 — Counters ride along on a card

Mountain: tabletop-replaces-mural
Ship: tabletop
Type: task
Status: done

**What to build:** A new custom shape type, `mtg-counter` — a genuine `ShapeUtil`, not a stock
geo circle and not a prop on the card. Carries free editable text, blank by default (not a
numeric field). No domain identity of its own beyond its text.

Attach is card-hosted, native tldraw drag-and-drop: `mtg-card` implements
`canReceiveNewChildrenOfType`/`onDropShapesOver` so attaching a counter gives a live
hover-highlight during the drag. This is a deliberate, narrow exception to "the card carries
nothing about its passengers" — the card's `ShapeUtil` mediates the drop, but the resulting
parent relationship (not a list on the card's props) is what carries the state. Detach is
dragging the passenger off the card's bounds, reparenting it to the page wherever it's dropped.
No auto-spacing when a card already has multiple counters — they can overlap.

Battlefield-exit rule: the instant a host card's own zone-transition detection fires a move to
any non-battlefield zone (graveyard, exile, hand, library), every counter parented to that card
detaches and stays on the table, nudged to an open spot near the zone's edge. This can't be the
counter watching its own zone transition (a parented shape's own `onTranslateEnd` never fires
when only its parent moves) — it must be driven from the host card's own zone-transition code
path. The concrete open-spot-finding/collision algorithm and whether it animates is
implementation's call.

Loose, player-level counters (poison, energy, experience — not attached to any card) are out of
scope.

**Blocked by:** 12, 13 (needs the upgraded zone-entry detection for the battlefield-exit rule)

- [x] `mtg-counter` is a genuine shape type with free editable text, blank by default
- [x] Dragging a counter onto a card attaches it, with a live hover-highlight during the drag
- [x] Dragging a counter off a card detaches it (reparents to the page)
- [x] Multiple counters on one card can overlap with no forced spacing
- [x] The instant a host card leaves the battlefield, every counter on it detaches and lands at an
      open spot near the zone's edge — driven from the host's zone-transition code, not the
      counter's own hook

## Outcome (2026-08-08)

Built as planned (`.scratch/tabletop-physics/plan-18.md` has the full plan + owner reviews).
Verified by `test/verification/verify-counter.spec.ts` (4 Playwright tests, real mouse drags)
and `test/openSpotNearZoneEdge.test.ts` (5 unit tests on the placement seam). Decisions made in
implementation, for the record:

- **The Stack does NOT evict counters.** The plan initially extrapolated "leaves the battlefield"
  to include the stack; in practice cards *arrive* on the Stack, so their first settled move
  fires a stack zone-entry and would strip counters the moment one attached there. Detach zones
  are exactly the ticket's list: graveyard, exile, library (no hand zone exists yet).
- **Creation affordance (assumption, needs Jess's eye):** one toolbar item (stock tldraw chrome,
  stock ellipse icon) — pick the tool, click the table, get a blank counter. The spec never said
  how a player obtains a counter; this was the smallest thing that made the feature usable.
- **Appearance (staged on `/design`, § "Tabletop counter disc", pending sign-off):** the
  `.hand-count` disc recipe — deep-space fill, narrow dark-pink ring, light-pink Orbitron text,
  44px circle, proportional on resize.
- **Name collision flagged:** table-layout ticket 12's life-total shape had `mtg-counter` as a
  working name; this shape now owns the type string per this map's spec. Buoyed as
  `life-counter-needs-own-name` in TODO.md.
- **Counters are card-aligned:** local rotation zeroes (center-preserved) on attach, so they tilt
  with a tap and sit upright on the card regardless of the card's tap state when dropped.
- Detach fires only on zone *change* — a counter attached to a card already sitting in the
  graveyard stays until the card moves somewhere and back.
- **The hover-highlight (story 15) was verified by eye, not automation**: tldraw draws the hint
  as a thicker outline on a canvas overlay (no DOM to assert), so a mid-drag screenshot was
  captured and inspected — the card shows a clear hint outline while a counter is dragged over
  it. The attach hooks use `onDragShapesIn`/`onDragShapesOut` (tldraw's frame pattern, live
  reparent + free hinting) rather than the ticket's named `onDropShapesOver` — same mechanism
  family, better feedback.
