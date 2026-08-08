# Files

**Rewritten wholesale 2026-08-08** in two tickets. Ticket 12 (`.scratch/tabletop-physics/
issues/12-*.md`) landed the `mtg-card` custom-shape rewrite decided by ticket 02, deleting
`MtgCardImageShapeUtil.tsx`. Ticket 13 (`.scratch/tabletop-physics/issues/13-*.md`) did the same
for furniture, adding `mtg-zone` alongside it — no file was deleted for this one since furniture
was never its own file (it lived inside `tableFurniture.ts`'s shape-builder functions).

## Shared (each shape's type/props definition)

- `apps/tabletop/src/shared/mtgCardShape.ts` — `MtgCardShapeProps` (the validated prop shape:
  `w`, `h`, `instanceId`, `scryfallId`, `cardName`, `frontImageUrl`, `backImageUrl`, `face`,
  `faceDown`, `tapped`), the `TLGlobalShapePropsMap` module augmentation that registers `mtg-card`
  into tldraw's `TLShape` union, and `mtgCardShapeProps` (the `RecordProps` validators, imported
  by both client `MtgCardShapeUtil.tsx` and server `rooms.ts`).
- `apps/tabletop/src/shared/mtgZoneShape.ts` — the same pattern for furniture (ticket 13):
  `MtgZoneShapeProps` (`w`, `h`, `zone` — a closed enum `"playmat" | "library" | "graveyard" |
  "exile" | "stack" | "command"` — `seatId`, `label`), the `TLGlobalShapePropsMap` augmentation
  registering `mtg-zone`, and `mtgZoneShapeProps` validators, imported by client
  `MtgZoneShapeUtil.tsx`, server `rooms.ts`, and server `tableFurniture.ts` (for the `Zone` type
  alias it re-exports).

## Client (the ShapeUtils themselves)

- `apps/tabletop/src/client/shapes/MtgCardShapeUtil.tsx` — the whole card territory: extends
  `BaseBoxShapeUtil<MtgCardShape>`; `onClick` (tap/untap, now toggling `props.tapped` with
  rotation as a pure visual delta), `onTranslateEnd` (selection cleanup + zone-entry detection),
  `zoneAt()` (private helper — since ticket 13, matches real `mtg-zone` shapes by
  `candidate.type === "mtg-zone"` and reads validated `candidate.props.zone`, resolving overlaps
  by greatest `index`), `component()`/`getIndicatorPath()` (renders its own `<img>`).
- `apps/tabletop/src/client/shapes/MtgZoneShapeUtil.tsx` — **new, ticket 13**: extends
  `BaseBoxShapeUtil<MtgZoneShape>`; defines no interaction hooks at all (`onClick`/
  `onTranslateEnd`/`onDragShapesOver` are all absent — see `architecture.md`/`interactions.md`
  watch point 7 for why that's safe); `component()` renders a plain `<div>` (solid black border
  for `playmat`, dashed grey for everything else) and `getIndicatorPath()`.
- `apps/tabletop/src/client/TablePage.tsx` — registers
  `shapeUtils = [...defaultShapeUtils, MtgCardShapeUtil, MtgZoneShapeUtil]`, passed to both
  `useSync` and the `<Tldraw shapeUtils={...}>` prop (this app uses the sync hook directly, which
  is why `defaultShapeUtils` must be spread in explicitly; see `architecture.md`). Add new custom
  ShapeUtils here.

## Server (identity is minted here, mechanics is not)

- `apps/tabletop/src/server/cardArrival.ts` — mints `props.instanceId` (moved out of `meta` by
  ticket 12) at shape creation (`createShapeId`; no longer mints a tldraw asset record — flip is
  a pure `props.face` write now). Not this owner's mechanics territory per se, but the identity
  contract every hook in `MtgCardShapeUtil` depends on.
- `apps/tabletop/src/server/rooms.ts` — builds the server-side `TLSocketRoom` schema via
  `createTLSchema({ shapes: { ...defaultShapeSchemas, "mtg-card": {...}, "mtg-zone": {...} } })`.
  The server-side twin of `TablePage.tsx`'s client registration; same "must spread the defaults
  explicitly" gotcha applies here, on the schema-validation side (see `architecture.md`).
- `apps/tabletop/src/server/tableFurniture.ts` — **ticket 13**: `zoneShape()` now builds real
  `mtg-zone` shape records (`type: "mtg-zone"`, `props: { w, h, zone, seatId, label }`, always
  `isLocked: true`) instead of stock `geo`/`image` shapes tagged with `meta.zone`; the old
  `RegionStyle`/`DEFAULT_REGION_STYLE`/`PLAYMAT_REGION_STYLE` styling machinery was deleted
  (visual treatment now lives in `MtgZoneShapeUtil.component()`). `imageShape()` (the playmat/
  library background *pictures*, still stock `image` shapes, unchanged) stays separate and never
  participates in zone detection. `ensureStackStripWidth()` was also fixed here (see
  `architecture.md`'s "Ticket 13" section) to reuse an existing Stack shape's `.index` instead of
  minting a fresh top-of-z-order one on every seat join. The seat name label (`type: "text"`,
  built inline in `ensurePlayerArea`) is now `isLocked: true` (was `false` — any player could
  previously drag/delete another player's name label). Consulted by `zoneAt()` but not itself a
  custom ShapeUtil.

## Tests

- `apps/tabletop/test/verification/verify-drag-identity.spec.ts` — regression test for the
  `959831c` drag-identity bug. Plays two lands, drags first, drags second, asserts only the
  second moved.

## Read-only dependency (not owned, but load-bearing — read when things surprise you)

- `node_modules/tldraw/src/lib/tools/SelectTool/childStates/PointingShape.ts` — selection-on-enter
  deferral logic (`onClick` truthiness check), `startTranslating`'s force-reselect safety net.
- `node_modules/tldraw/src/lib/tools/SelectTool/childStates/Translating.ts` — what happens once a
  drag is confirmed; reads `getSelectedShapeIds()` to decide what to move.
- `node_modules/@tldraw/editor/src/lib/editor/shapes/ShapeUtil.ts:968` — the base `onClick?`
  declaration (optional, no default implementation) that makes the truthiness check above mean
  "does this ShapeUtil define onClick at all," not "what does it do."
