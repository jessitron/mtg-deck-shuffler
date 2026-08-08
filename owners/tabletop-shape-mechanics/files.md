# Files

**Rewritten wholesale 2026-08-08** when ticket 12 (`.scratch/tabletop-physics/issues/12-*.md`)
landed the `mtg-card` custom-shape rewrite decided by ticket 02. `MtgCardImageShapeUtil.tsx` is
deleted; its replacement is split across a shared props/type file and the ShapeUtil itself.

## Shared (the shape's type/props definition)

- `apps/tabletop/src/shared/mtgCardShape.ts` — `MtgCardShapeProps` (the validated prop shape:
  `w`, `h`, `instanceId`, `scryfallId`, `cardName`, `frontImageUrl`, `backImageUrl`, `face`,
  `faceDown`, `tapped`), the `TLGlobalShapePropsMap` module augmentation that registers `mtg-card`
  into tldraw's `TLShape` union, and `mtgCardShapeProps` (the `RecordProps` validators, imported
  by both client `MtgCardShapeUtil.tsx` and server `rooms.ts`).

## Client (the ShapeUtil itself)

- `apps/tabletop/src/client/shapes/MtgCardShapeUtil.tsx` — the whole territory today: extends
  `BaseBoxShapeUtil<MtgCardShape>`; `onClick` (tap/untap, now toggling `props.tapped` with
  rotation as a pure visual delta), `onTranslateEnd` (selection cleanup + zone-entry detection),
  `zoneAt()` (private helper), `component()`/`getIndicatorPath()` (new — renders its own `<img>`
  since it no longer delegates to tldraw's image machinery).
- `apps/tabletop/src/client/TablePage.tsx` — registers
  `shapeUtils = [...defaultShapeUtils, MtgCardShapeUtil]`, passed to `useSync` (not `<Tldraw>` —
  this app uses the sync hook directly, which is why `defaultShapeUtils` must be spread in
  explicitly; see `architecture.md`). Add new custom ShapeUtils here.

## Server (identity is minted here, mechanics is not)

- `apps/tabletop/src/server/cardArrival.ts` — mints `props.instanceId` (moved out of `meta` by
  ticket 12) at shape creation (`createShapeId`; no longer mints a tldraw asset record — flip is
  a pure `props.face` write now). Not this owner's mechanics territory per se, but the identity
  contract every hook in `MtgCardShapeUtil` depends on.
- `apps/tabletop/src/server/rooms.ts` — builds the server-side `TLSocketRoom` schema via
  `createTLSchema({ shapes: { ...defaultShapeSchemas, "mtg-card": { props: mtgCardShapeProps } } })`.
  The server-side twin of `TablePage.tsx`'s client registration; same "must spread the defaults
  explicitly" gotcha applies here, on the schema-validation side (see `architecture.md`).
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
