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

## Comments

- 2026-08-08, Jess, surfaced while resolving ticket 01 (the command zone is its own area,
  separate from the library, so dragging a commander in and out of it needs its own rules):
  the Shuffler needs to send a **"Play commander" event**; the Tabletop receives it and
  creates a commander object — a card with a special property marking it as the commander.
  The Command Zone should light up (arm) only when **a commander card belonging to that
  player** is dragged over it — not any card, and not another player's commander. This is
  a partial answer to this ticket's open question ("how does the Tabletop know which card is
  the commander") — the ghost-copy half is still open. New scope for whoever resolves this:
  a Shuffler → Tabletop contract change (a new event, or a flag on an existing one) and an
  owner-aware arming rule, which is new territory — `tabletop-physics` ticket 02 gave `mtg-card`
  no owner/seat field at all, and ticket 03 gave `mtg-zone` a `zone` but no per-seat identity
  either. Consult `two-faced-cards` (card props/contract) and `tabletop-shape-mechanics`
  (arming/zone-detection hooks) before resolving.
