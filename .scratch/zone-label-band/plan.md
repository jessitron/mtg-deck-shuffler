# Plan: zone label band on the Tabletop

Mountain: overhead (a fix to the built player-area geometry; serves Mountain 2's "physics of Magic" table)

## Problem (Jess, 2026-08-09)

On the Tabletop's player area, the zone titles are unreadable:

- **Library**: the card-back pile image insets only 12 units from the zone box on
  all sides, so the "Library" label (fontSize 24, drawn inside the box's top-left)
  is covered even before any card moves. Jess: "You can't see Library's title now."
- **Command Zone**: exactly one card tall (`COMMAND_ZONE_H = CARD_H = 238`), so a
  commander card placed there covers the title completely.
- **Exile**: `EXILE_H = 225` — shorter than a card (238). A card can't even sit
  inside it.

Jess floated two directions: "make all these zones bigger, buuuut maybe we make the
cards smaller?"

## Decision: taller zones (a label band), not smaller cards

Card size anchors the table's physical scale — `CARD_W/CARD_H = 170×238` is
2.5″×3.5″ at 68 canvas units/inch, and the playmat (9.6 × 4 cards) and every zone
are *derived from* card size (`cardLayout.ts`). Shrinking cards shrinks the zones
proportionally and leaves the title exactly as covered. The missing element is
headroom for the label, so we add it explicitly.

## Change

All in `apps/tabletop/` (DESIGN.md-first, per that ship's CLAUDE.md).

1. **New shared constant** `ZONE_LABEL_BAND = 40` in `src/shared/mtgZoneShape.ts`
   (next to `LIBRARY_PILE_INSET`; shared because both the server's geometry and the
   client's sleeve-pile rendering need it). 40 = fontSize 24 + padding + breathing
   room; also matches `NAME_LABEL_HEIGHT`.

2. **`src/server/cardLayout.ts`**:
   - `LIBRARY_H = CARD_H + ZONE_LABEL_BAND` (278)
   - `COMMAND_ZONE_H = CARD_H + ZONE_LABEL_BAND` (278)
   - `EXILE_H = CARD_H + ZONE_LABEL_BAND` (278) — a card must fit below the label
   - `GRAVEYARD_H` = what remains of the column under the library row:
     `PLAYMAT_H - LIBRARY_H - GAP - EXILE_H - GAP` = 952 − 278 − 20 − 278 − 20 = **356**
     (was 449; still 1.5 cards tall, still the biggest box). This replaces the
     "two-thirds graveyard / one-third exile" split with "exile gets card+band,
     graveyard fills the rest" — the column still exactly matches the playmat's
     height, so the player area stays a clean rectangle and no other zone moves.
   - `graveyardCardPosition`: cards pile from `box.y + ZONE_LABEL_BAND + 10` instead
     of `box.y + 10`, so the pile stops covering the "Graveyard" label.

3. **`src/server/tableFurniture.ts`**: the library card-back image insets
   `ZONE_LABEL_BAND` from the top (12 from the other three sides), so the label
   shows above the pile.

4. **`src/client/shapes/MtgZoneShapeUtil.tsx`**: the sleeve pile (ticket 17) gets the
   same top inset, so a sleeved library shows its label too.

5. **`DESIGN.md`**: update the Geometry table (Library/Command Zone/Graveyard/Exile
   heights) and the graveyard/exile split sentence.

## What does NOT change

- `CARD_W/CARD_H`, playmat size, column width, player-area width, Stack size,
  compass-slot origins. The player-area rectangle is identical (the column already
  matched the playmat's height and still does).
- Zone-AABB disjointness: gaps between boxes stay ≥ GAP (asserted in
  `test/cardLayout.test.ts` — the assertion should keep passing across all four
  seats).
- The label's own rendering in `MtgZoneShapeUtil` (position, font, size) — the band
  makes room for it; it doesn't move.

## Verification

- `test/cardLayout.test.ts` disjointness assertions still pass.
- New unit assertions: every card-holding zone (library, command, graveyard, exile)
  is at least `CARD_H + ZONE_LABEL_BAND` tall; graveyard card pile starts below the
  band; column height still equals `PLAYMAT_H`.
- `npx vitest run` green; `./verify.sh` for the Playwright pass if furniture specs exist.

## Questions for owners

- **tabletop-shape-mechanics**: zone detection resolves by shape bounds
  (`onTranslateEnd` on cards). Growing library/command/exile heights and shrinking
  graveyard keeps all AABBs disjoint (≥20-unit gaps). Any detection assumption I'm
  missing — e.g. anything keyed to the old 2/3-1/3 split, or to zone tops aligning
  with card placement?
- **shuffler-looks-like-itself**: the label band reserves 40 units at the top of
  each dashed zone box; content (pile, cards) starts below it. Label rendering
  itself is untouched. Any design-language concern — e.g. should the exile box
  visibly read as "smaller than graveyard" per DESIGN.md's original intent, which
  this change weakens (356 vs 278, still smaller but less dramatically)?
