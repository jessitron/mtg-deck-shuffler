# Files

## Client (the ShapeUtil itself)

- `apps/tabletop/src/client/shapes/MtgCardImageShapeUtil.tsx` — the whole territory today:
  `onClick` (tap/untap), `onTranslateEnd` (selection cleanup + zone-entry detection), `zoneAt()`
  (private helper). **Will be replaced/renamed** when ticket 02's `mtg-card` `BaseBoxShapeUtil`
  rewrite lands — update this file list then.
- `apps/tabletop/src/client/TablePage.tsx` — registers `shapeUtils = [MtgCardImageShapeUtil]`
  with the `<Tldraw>` component. Add new custom ShapeUtils here.

## Server (identity is minted here, mechanics is not)

- `apps/tabletop/src/server/cardArrival.ts` — mints `meta.instanceId` at shape creation
  (`createShapeId`, `AssetRecordType.createId`). Not this owner's mechanics territory per se, but
  the identity contract every hook in `MtgCardImageShapeUtil` depends on.
- `apps/tabletop/src/server/tableFurniture.ts` — draws zone shapes (`meta.zone` stamped, stock
  locked `geo`/`image` shapes). Consulted by `zoneAt()` but not itself a custom ShapeUtil.

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
