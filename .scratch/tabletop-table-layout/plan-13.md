# Plan — ticket 13: build the command-zone redraw of the player area

Ticket: `.scratch/tabletop-table-layout/issues/13-build-command-zone-redraw.md`
Design source: `.scratch/tabletop-table-layout/issues/01-command-zone-and-player-area.md`
and `apps/tabletop/DESIGN.md` (Geometry section, updated 2026-08-08).

## What changes

All inside `apps/tabletop/`. Server-side geometry + furniture only; no client changes.

### 1. `src/server/cardLayout.ts` — geometry

New constants (scale stays 68 units/inch, CARD_W=170, CARD_H=238, GAP=20):

- `COMMAND_ZONE_W = 2 * CARD_W + GAP` = **360** — two cards side by side (partner
  commanders) with breathing room. `COMMAND_ZONE_H = CARD_H` = 238.
- `COLUMN_W = LIBRARY_W + GAP + COMMAND_ZONE_W` = **550** (was 425; DESIGN.md says
  "~545" — 550 is the exact derivation with a GAP between Library and Command Zone).
  `PLAYER_AREA_W` re-derives automatically (1632 + 20 + 550 = 2202).
- Space under the Library row: `PLAYMAT_H - LIBRARY_H - GAP` = 694, now split with a
  GAP between Graveyard and Exile so their AABBs are strictly disjoint:
  - `GRAVEYARD_H = round((694 - GAP) * 2/3)` = **449** (top two-thirds)
  - `EXILE_H = 694 - GAP - GRAVEYARD_H` = **225** (bottom third)
  - `GRAVEYARD_W = EXILE_W = COLUMN_W` = 550 (Exile widens from 240 to full column)
  - Exile's bottom edge still lands exactly on the playmat's bottom edge (clean
    player-area rectangle preserved: 238+20+449+20+225 = 952).

New/changed bounds functions:

- `commandZoneBounds(seatIndex)` — new: `{ x: columnX + LIBRARY_W + GAP, y: PLAYMAT_Y, w: 360, h: 238 }`
  (old Exile spot, beside the Library, now with a GAP so Library/Command Zone AABBs
  are strictly disjoint — the old Exile touched the Library edge-to-edge).
- `exileBounds(seatIndex)` — moves to `{ x: columnX, y: PLAYMAT_Y + LIBRARY_H + GAP + GRAVEYARD_H + GAP, w: 550, h: 225 }`.
- `graveyardBounds` — same position, new w/h.

The ripple is automatic and in scope: `playerAreaX(seatIndex)` derives from
`PLAYER_AREA_W`, so every seat shifts over; `stackStripBounds` likewise.

### 2. `src/server/tableFurniture.ts` — draw the Command Zone

In `ensurePlayerArea`: one more `zoneShape` — id `region-command-${tableName}-${seatId}`,
`zone: "command"` (already in `MtgZoneShapeProps`' validated enum), label
"Command Zone", `seatId` set. Rendered by the existing `MtgZoneShapeUtil`
self-rendering shape (dashed dark-pink at rest, Orbitron label) — no stock-geo,
no new CSS, no new look invented.

### 3. Tests (vitest, at the existing seams)

- `test/cardLayout.test.ts`: update exact-number assertions (COLUMN_W 550,
  GRAVEYARD_H 449); Command Zone beside Library at top of column; Exile in the
  bottom third below Graveyard; Exile bottom flush with playmat bottom; NEW
  pairwise-disjointness assertion over all six zone AABBs of one seat AND across
  two adjacent seats (zone detection is first-match, not closest-match — overlap
  would misroute cards).
- `test/seatJoined.test.ts`: the "draws a full player area" test additionally
  asserts a `mtg-zone` shape with `zone: "command"` at `commandZoneBounds(0)`.

### 4. `apps/tabletop/DESIGN.md`

Update Status (redraw built), Geometry table (exact numbers: column 550, command
zone 360×238, graveyard 550×449, exile 550×225), and the "Delta from what's built
today" table per the ticket's acceptance criteria.

## Out of scope

- "Mat grows taller when lands overflow" (separately deferred).
- The square (ticket 14). Seats stay in a row.
- Commander identity/arming (tickets 08/18/19).

## Questions for owners

- **tabletop-shape-mechanics**: zone detection is first-match over shape AABBs —
  is strict disjointness (GAPs between all zone boxes) the right guarantee, and is
  there anything in zone detection that assumes the old exile position/size or
  edge-to-edge adjacency? Any concern with a new locked `mtg-zone` of zone
  "command" per seat?
- **shuffler-looks-like-itself**: the Command Zone lands as a standard `mtg-zone`
  shape (dashed dark-pink, Orbitron label "Command Zone"), same as Graveyard/Exile.
  Any concerns about label text or the zone look applied to this new furniture?
