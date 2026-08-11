# 22 — A "stack up" option tidies the graveyard (and exile)

Mountain: tabletop-replaces-mural
Ship: tabletop
Type: task
Status: ready-for-agent
Blocked by: 13 — build command-zone redraw (the snap grid derives from the redrawn graveyard and exile bounds)

**What to build:** Cards entering the graveyard — discarded from the hand, or dragged in
from outside the zone — land where they land: at the drop point, with no automatic
snapping. The graveyard (and separately, exile) gets a "stack up" control that, on
demand, arranges every card currently in that zone into a tidy row-based stack: first
slot, then the next spot in line; when the next spot would fall outside the zone, start
a new row; when the rows run out, wrap back to the top-left. Cards moved around after a
stack-up stay exactly where the player put them until "stack up" is used again.

Exile gets its own "stack up" control, behaving identically except its smaller
footprint stacks cards directly on top of one another (all slots coincide).

Implementer's choices: where the "stack up" control lives on each zone (button
placement/label), how the "next spot" is derived (per-zone counter vs. scanning
occupied slots) and the exact card spacing within the stack.

Design source of truth: the spec's "Graveyard/exile stack-up" implementation decision
(added 2026-08-08 from Jess's user stories 26–28 and 30; revised 2026-08-11 to a
manual, on-demand control instead of automatic entry-snapping).

Testing splits by seam: next-slot/row-wrap/wrap-around derivation is pure geometry —
unit-test it directly against the zone bounds. Discard/drag-in arrival is client zone
mechanics, but no longer snaps — cards should land at their drop point, not the next
slot; assert that at the arrival seam. "Stack up" is a user action → Playwright,
behavioral: drop two cards anywhere in the graveyard, click "stack up" → they tile
neatly; reposition one afterward, click "stack up" again → it returns to the stack
(this ticket does not exempt manually-moved cards from a fresh stack-up; if that turns
out to be wanted, it's a follow-up).

Consult owners: `tabletop-shape-mechanics` (zone-entry detection, onTranslateEnd
placement).

- [ ] A card entering the graveyard (discard or drag-in) lands where it's dropped — no automatic snapping
- [ ] The graveyard has a "stack up" control; using it arranges all cards in the zone into the tidy stack
- [ ] Exile has its own "stack up" control, with the same effect but coincident slots (cards land directly on top of one another)
- [ ] After a stack-up, repositioning a card sticks until "stack up" is used again
- [ ] Next-slot overflow starts a new row; row overflow wraps to the top-left
- [ ] Slot derivation covered by unit tests; the "stack up" action covered by Playwright
