# Design the square — seats around the Stack instead of a row

Mountain: tabletop-replaces-mural
Type: grilling
Status: claimed

## Question

Graduated 2026-08-08 out of this map's fog, while resolving
[ticket 01](01-command-zone-and-player-area.md) — Jess confirmed mid-session she still
wants this: "I decided later that I want the four players in a square instead of a row."

`DESIGN.md`'s Deferred section already names the want and the reason it was set aside:
*"a circle of playmats — two facing each other, three as a triangle, four as a square —
with my mat in front of me and the stack in the middle. tldraw (as far as Jess knows)
can't rotate the view per viewer on a shared board. The row is the workaround, chosen
only because everything must be right side up for everyone."* That constraint has to be
revisited, not just reversed — confirm whether it still holds before designing around it.

Open, unformed until now:

- Does "square" mean a literal 2×2 arrangement of player areas facing inward (with 2 or
  3 players, what happens — do they still occupy square-ish positions, or does it
  collapse toward the old row/pair)?
- Where does the Stack sit relative to the square — literally in the middle, as Jess's
  original ramble pictured, or somewhere else that composes with "everything right side
  up for everyone"?
- Does `playerAreaX(seatIndex)`'s row-derivation in `cardLayout.ts` get replaced outright,
  or does the square coexist with a row fallback for 1–2 players?
- This ticket decided *after* ticket 01's column-widening — the square's seat-placement
  math will need to use ticket 01's new (wider) player-area dimensions, not the old ones.

Not blocked by ticket 01, but sequenced after it in practice — ticket 01 fixed the
per-seat rectangle's dimensions, which this ticket arranges in space.
