# Design command-zone geometry and redraw the player area

Mountain: tabletop-replaces-mural
Type: grilling
Status: resolved

## Question

`TODO.md`'s `playmat-command-zone` line: the Tabletop's player area is missing a
command zone (`apps/tabletop/DESIGN.md` doesn't have one). Jess: "the Tabletop drawing
needs to change: I forgot the command zone. Move exile down to replace the bottom third
of the Graveyard, instead." What should the redrawn player area's geometry actually be —
where exactly does the command zone sit, what shrinks or moves to make room, and does
this finally take on the "mat grows taller when lands overflow" edge case DESIGN.md has
deferred since 2026-08-01?

Ripple to resolve as part of this: `apps/tabletop/DESIGN.md` is the spec for the player
area, so it changes first, then `src/server/tableFurniture.ts` and the geometry table in
`cardLayout.ts`. Library/graveyard/exile/label are fixed offsets off the mat's bounds,
and seats sit in a row at fixed x offsets by join order — growing one mat re-derives that
seat's whole column *and* shifts every player area to its right. Decide whether that
ripple is in scope for this pass or deferred again.

Unblocks [Place the commander in the command zone at
load](08-commander-in-command-zone.md), which needs a command zone to exist first.

## Answer

Grilled with Jess, 2026-08-08. Decided (full geometry in `apps/tabletop/DESIGN.md`'s
Vocabulary/Picture/Geometry sections, updated as part of this resolution):

- **Where it sits**: the Command Zone takes the **old Exile spot** — next to the
  Library, top-right of the column.
- **Sized for two cards** side by side, not one — "some commanders have partner."
- **What moves**: Exile drops down into the **bottom third** of the old Graveyard
  footprint; Graveyard shrinks to the **top two-thirds** of that same space.
- **The ripple is in scope.** The column widens (~425 → ~545) to fit Library + a
  two-card Command Zone, which widens the whole player area and shifts every seat
  to the right of a widened one over — decided explicitly, not deferred again.
- **"Mat grows taller" stays deferred**, separately — a runtime resize problem
  (different shape than this ticket's static redraw), kept as its own item rather
  than folded in, to keep this ticket's ripple reviewable on its own.

**New scope surfaced, captured elsewhere rather than resolved here:**
- Commander *identity and arming* (a "Play commander" event from the Shuffler, a
  special property on the commander card, the zone arming only for that player's
  own commander) — appended as a comment on
  [ticket 08](08-commander-in-command-zone.md), which already asks this question.
- The **square** (players arranged around the Stack instead of a row) — Jess
  confirmed she still wants it, mid-session. Graduated out of this map's fog into
  its own ticket, [10 — Design the square](10-the-square.md).

**Not touched**: `src/server/tableFurniture.ts` and `src/server/cardLayout.ts` —
this ticket decides the design (recorded in `DESIGN.md`); building it is separate,
unblocked work.
