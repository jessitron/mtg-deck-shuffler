# Plan — ticket 14: build the square (compass seats around a centered Stack)

Ticket: `.scratch/tabletop-table-layout/issues/14-build-the-square.md`
Design source: `.scratch/tabletop-table-layout/issues/10-the-square.md` and
`apps/tabletop/DESIGN.md` "The square" section.

## What changes

Player areas leave the row and take compass slots around a fixed, centered Stack
square: 1 player → S; 2 → S, N; 3 → S, N, E; 4 → S, N, E, W, by join order.
Every player area keeps its internal layout (ticket 13's widened 2202 × 952
rectangle), upright and unrotated. Row derivation is deleted, not shadowed.

## Geometry (implementer's choice, per the ticket)

All coordinates centered on the board origin (0,0) — tldraw's canvas is
infinite, negative coordinates are fine.

- `STACK_SIZE = 1000`: the Stack is a 1000 × 1000 square centered at the
  origin, i.e. bounds `{x: -500, y: -500, w: 1000, h: 1000}`. **Why 1000:** it
  must exceed `PLAYMAT_H` (952) so that E/W player areas — vertically centered
  on the origin, spanning y ∈ [-476, 476] — stay inside the Stack's vertical
  band and never overlap the N/S areas, which start beyond ±500. This is the
  disjointness constraint.
- `SLOT_MARGIN = GAP + NAME_LABEL_HEIGHT + GAP = 100`: gap between the Stack's
  edge and each player area, sized so the S seat's name label (drawn above its
  playmat) fits between the Stack and the mat. Used on all four sides for
  symmetry.
- Player-area origins (top-left of the 2202 × 952 area):
  - **S**: `(-PLAYER_AREA_W/2, STACK_SIZE/2 + SLOT_MARGIN)` = (-1101, 600)
  - **N**: `(-PLAYER_AREA_W/2, -(STACK_SIZE/2 + SLOT_MARGIN + PLAYMAT_H))` = (-1101, -1552)
  - **E**: `(STACK_SIZE/2 + SLOT_MARGIN, -PLAYMAT_H/2)` = (600, -476)
  - **W**: `(-(STACK_SIZE/2 + SLOT_MARGIN + PLAYER_AREA_W), -PLAYMAT_H/2)` = (-2802, -476)

Disjointness check at 4 players (AABBs):
- S: x ∈ [-1101, 1101], y ∈ [600, 1552]
- N: x ∈ [-1101, 1101], y ∈ [-1552, -600]
- E: x ∈ [600, 2802], y ∈ [-476, 476]
- W: x ∈ [-2802, -600], y ∈ [-476, 476]
- Stack: x, y ∈ [-500, 500]

E/W clear the Stack horizontally (600 > 500); E/W clear N/S vertically
(476 < 600). All pairwise disjoint, asserted in tests across all 4 seats.

## Code changes (all in `apps/tabletop/`)

- `src/server/cardLayout.ts`:
  - Delete `MARGIN_X`, `STACK_Y`, `PLAYMAT_Y`, `playerAreaX`, `STACK_HEIGHT`,
    `stackStripBounds(seatCount)`.
  - Add `STACK_SIZE`, `stackBounds(): Bounds` (fixed, no seat-count argument),
    `playerAreaOrigin(seatIndex): {x, y}` implementing the compass table.
  - All zone-bounds functions (`playmatBounds`, `libraryBounds`,
    `commandZoneBounds`, `graveyardBounds`, `exileBounds`, `nameLabelPosition`,
    `landPosition`, `graveyardCardPosition`) derive from `playerAreaOrigin`
    instead of `playerAreaX`/`PLAYMAT_Y`. Internal layout unchanged.
  - `stackCardPosition(stackCount)` loses its `seatIndex` parameter: cards
    cascade from the Stack square's top-left (`stack.x + GAP + n*36`,
    `stack.y + GAP + n*14`) instead of over the owning seat's playmat — there
    is no "over the owning seat" in a square.
- `src/server/tableFurniture.ts`: `ensureStackStripWidth` becomes
  `ensureStackDrawn` — creates the fixed square once; a later call is a no-op
  (no widening exists anymore). Keeps the deterministic shape id.
- `src/server/cardArrival.ts`: call `stackCardPosition(count)` without seatIndex.
- Tests (`test/cardLayout.test.ts`, `test/seatJoined.test.ts`,
  `test/cardArrival.test.ts`): replace row/widening assertions with compass
  assertions — join 1–4 seats via the event endpoint, each lands in its slot,
  existing seats never move when a new one joins, Stack fixed and centered at
  every count, all zone AABBs disjoint at 4 players.
- `apps/tabletop/DESIGN.md`: status header, "The picture", "How a table comes
  into being" step wording, delta table — row replaced by the square.

## Question for tabletop-shape-mechanics

Does anything in `zoneAt()` / drop detection assume non-negative coordinates,
or assume the Stack is above all playmats, that this layout would break? And
the ticket says your KB wants a note recorded about the disjointness
constraint — I'll send that via `-update` after the change lands.
