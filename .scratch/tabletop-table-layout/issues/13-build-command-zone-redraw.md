# 13 — Build the command-zone redraw of the player area

Mountain: tabletop-replaces-mural
Ship: tabletop
Type: task
Status: done
Blocked by: None — can start immediately

**What to build:** A player's area on the Tabletop gains a Command Zone: it takes the
old Exile spot beside the Library, sized for two cards side by side (partner
commanders). Exile drops to the bottom third of the old Graveyard footprint; Graveyard
keeps the top two-thirds. The right-hand column widens (~425 → ~545 canvas units), and
the ripple is in scope: every seat's placement re-derives from the widened player-area
width, so neighboring areas shift over instead of overlapping. Seats stay in today's
row — the square is ticket 14.

Design source of truth: [01 — command-zone geometry](01-command-zone-and-player-area.md)
and `apps/tabletop/DESIGN.md`'s geometry tables. Geometry constants live in the Tabletop
server's card-layout module; furniture drawing in its table-furniture module.

New/redrawn furniture lands through the `mtg-zone` self-rendering shape with the decided
zone look (dashed dark-pink at rest, Orbitron labels) — don't extend the stale stock-geo
approximation to the new zones (`zone-look-not-landed`).

Out of scope: "mat grows taller when lands overflow" (separately deferred runtime-resize
problem).

Test at the server event-handler seam (vitest, fake store): assert the shapes produced —
zone positions and sizes, widened column, seat shift, and disjoint zone bounding boxes
(card zone detection is first-match, not closest-match).

Consult owners: `tabletop-shape-mechanics` (zone AABBs), `shuffler-looks-like-itself`
(zone look on new furniture).

- [x] Command Zone renders beside the Library, two cards wide, in every player area
- [x] Graveyard occupies the top two-thirds and Exile the bottom third of the old Graveyard footprint
- [x] Player-area width re-derives everywhere; adjacent seats shift over, no overlap
- [x] All zone bounding boxes within and between player areas are disjoint (asserted in tests)
- [x] New furniture uses the decided `mtg-zone` look, not the stock-geo approximation
- [x] `apps/tabletop/DESIGN.md`'s "Delta from what's built today" table updated for what landed
