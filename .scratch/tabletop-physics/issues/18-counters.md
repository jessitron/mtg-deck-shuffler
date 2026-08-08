# 18 — Counters ride along on a card

Mountain: tabletop-replaces-mural
Ship: tabletop
Type: task
Status: ready-for-agent

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

- [ ] `mtg-counter` is a genuine shape type with free editable text, blank by default
- [ ] Dragging a counter onto a card attaches it, with a live hover-highlight during the drag
- [ ] Dragging a counter off a card detaches it (reparents to the page)
- [ ] Multiple counters on one card can overlap with no forced spacing
- [ ] The instant a host card leaves the battlefield, every counter on it detaches and lands at an
      open spot near the zone's edge — driven from the host's zone-transition code, not the
      counter's own hook
