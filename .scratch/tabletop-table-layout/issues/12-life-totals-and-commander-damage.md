# Life totals and commander damage

Mountain: tabletop-replaces-mural
Ship: tabletop
Type: grilling
Status: claimed

## Question

Numbers a player can modify: a life total per player, and a commander-damage count per
opponent. Nothing exists in code. The core decision: **what kind of object is a modifiable
number here** — furniture (locked `mtg-zone`-style shapes with their own interaction, like
the Command Zone), a new custom shape type, or something outside the canvas entirely (React
UI floating over tldraw)?

Downstream of that choice:

- Who can change whose life total? (The fleet principle is "the players own the game
  experience; the app doesn't enforce" — but a misclick on someone else's life is easy.)
- Where does it live in the player area's geometry (the square from
  [Design the square](10-the-square.md), the widened column from
  [Design command-zone geometry](01-command-zone-and-player-area.md))?
- Commander damage is per attacker — up to 3 extra numbers per player at a 4-seat table.
  Always visible, or expandable?
- Does a life change land in the event log someday (Mountain 2 wants the story), and does
  that shape the object choice now?

Graduated 2026-08-08 from the map's fog — was waiting on map 1 (Physics), which is fully
resolved.
