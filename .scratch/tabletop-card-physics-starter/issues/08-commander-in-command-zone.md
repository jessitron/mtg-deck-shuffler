# Place the commander in the command zone when the Tabletop loads

Mountain: tabletop-replaces-mural
Type: grilling
Status: open
Blocked by: 01

## Question

`TODO.md`'s `commander-in-command-zone` line: "When the Tabletop loads, have the
commander appear in the command zone. Also place a transparent version of the commander
in its spot, one that doesn't move when they play the commander." The ghost copy is the
interesting half — it marks *where the commander lives* so the zone still reads as the
commander's home once the real card is out on the table. Decide: how does the Tabletop
know which card is the commander (does this ride the existing card-arrival payload, or
need a new flag), and how is the ghost rendered (a second shape at reduced opacity? a
`meta` flag on the furniture?) so it survives the real commander moving in and out of
the zone.

Blocked by [Design command-zone geometry and redraw the player
area](01-command-zone-and-player-area.md) — there's no command zone shape to place
anything in yet.
