# Design command-zone geometry and redraw the player area

Mountain: tabletop-replaces-mural
Type: grilling
Status: claimed

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
