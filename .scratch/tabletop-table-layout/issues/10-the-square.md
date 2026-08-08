# Design the square — seats around the Stack instead of a row

Mountain: tabletop-replaces-mural
Type: grilling
Status: resolved

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

## Answer

Grilled with Jess, 2026-08-08. Decided (full geometry in `apps/tabletop/DESIGN.md`'s
new "The square" section, updated as part of this resolution):

- **No per-viewer rotation is still real, reconfirmed, and out of scope** — same
  posture as Mural ("Mural doesn't rotate"). Per-viewer rotation would need the
  canvas in an iframe or similar; not happening here.
- **"Square" is about position, not orientation.** Every player area keeps
  today's internal layout — upright, unrotated, same wide-short rectangle
  (playmat + library/Command Zone/Graveyard/Exile column, ticket 01's widened
  dimensions). Nothing rotates to face the Stack.
- **Seats take compass slots (N/E/S/W) around a central Stack, by join order:**

  | Seat count | Positions (join order) |
  | ---------- | ----------------------- |
  | 1          | S                       |
  | 2          | S, N                    |
  | 3          | S, N, E                 |
  | 4          | S, N, E, W              |

  N/S sit above/below the Stack (the row's existing relationship). E/W sit to
  the sides.
- **E/W areas will look "sideways"** — a wide-short rectangle parked at a side
  slot, not rotated to match — until per-viewer rotation exists someday. Known,
  accepted cosmetic quirk; not solved by giving E/W a different internal shape
  (that's a second layout to build for a purely cosmetic payoff). Recorded as
  deferred in `DESIGN.md`.
- **The Stack is a fixed-size square, centered**, same footprint regardless of
  player count. Occupied compass slots change as seats join/leave; the Stack
  doesn't.
- **`playerAreaX`'s row-derivation in `cardLayout.ts` is replaced outright** —
  the compass-slot model covers 1–4 players on its own, no row fallback mode.
- **Explicitly provisional** — Jess: "this is all gonna be tweaked after play
  experience." A first build to react to, not a final layout to defend.

**Not decided here** (implementation detail for whoever builds this): exact
margins/spacing between adjacent compass slots and the central Stack.
`tabletop-shape-mechanics` flagged that `zoneAt()` in `MtgCardShapeUtil.tsx` is
first-match-not-closest-match with no orientation awareness — if E/W zones pack
close to the Stack's corners, overlapping AABBs could cause wrong-zone
detection. Whoever builds this should keep zone AABBs disjoint; worth a note in
that owner's KB.

**Not touched**: `src/server/tableFurniture.ts` and `src/server/cardLayout.ts` —
this ticket decides the design (recorded in `DESIGN.md`); building it is
separate, unblocked work.
