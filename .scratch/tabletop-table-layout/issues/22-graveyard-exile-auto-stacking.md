# 22 — Cards put in the graveyard stack up neatly (exile too)

Mountain: tabletop-replaces-mural
Ship: tabletop
Type: task
Status: ready-for-agent
Blocked by: 13 — build command-zone redraw (the snap grid derives from the redrawn graveyard and exile bounds)

**What to build:** Every card *put into* the graveyard — discarded from the hand, or
dragged in from outside the zone — snaps to the next spot in line in a tidy row-based
stack. Discard two cards and they tile side by side. When the next spot would fall
outside the graveyard, start a new row; when the rows run out, wrap back to the
top-left. A card that's *already in* the graveyard and gets moved around stays exactly
where the player put it — entering the zone places a card; moving within it never does.

Exile behaves identically on entry, except its smaller footprint stacks cards directly
on top of one another (all slots coincide).

Implementer's choices: how the "next spot" is derived (per-zone counter vs. scanning
occupied slots) and the exact card spacing within the stack.

Design source of truth: the spec's "Graveyard/exile auto-stacking" implementation
decision (added 2026-08-08 from Jess's user stories 26–28 and 30).

Testing splits by seam: next-slot/row-wrap/wrap-around derivation is pure geometry —
unit-test it directly against the zone bounds. A card arriving via a server-handled
event asserts placement at the server event-handler seam. Drag-in snapping is client
zone-entry mechanics → Playwright, behavioral: discard two → they tile; reposition one
inside the zone, discard a third → the repositioned card hasn't moved and the new card
takes the next slot; overflow starts a new row.

Consult owners: `tabletop-shape-mechanics` (zone-entry detection, onTranslateEnd
placement).

- [ ] A card entering the graveyard (discard or drag-in) lands on the next slot in the stack
- [ ] Two discards tile neatly side by side
- [ ] Repositioning a card within the graveyard sticks; the next entry does not disturb it
- [ ] Next-slot overflow starts a new row; row overflow wraps to the top-left
- [ ] Exile entry stacks cards directly on top of each other
- [ ] Slot derivation covered by unit tests; drag-in snap covered by Playwright
