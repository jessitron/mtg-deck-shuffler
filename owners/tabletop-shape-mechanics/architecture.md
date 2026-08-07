# Architecture

## Where a card shape comes from

`apps/tabletop/src/server/cardArrival.ts` handles `POST /api/tables/:tableName/cards` (the
Shuffler → Tabletop card-arrival endpoint). It mints the shape's identity once, at creation:

```
const assetId: TLAssetId = AssetRecordType.createId(arrival.card.instanceId);
const shapeId = createShapeId(`card-${arrival.card.instanceId}`);
...
meta: { instanceId: arrival.card.instanceId, scryfallId: arrival.card.scryfallId, cardName: arrival.cardName }
```

`meta.instanceId` is the identity every shape hook in `MtgCardImageShapeUtil` checks before
acting (`if (!shape.meta?.instanceId) return undefined`) — it's how the ShapeUtil distinguishes
a real card from other `image`-type shapes on the board (furniture backgrounds, stray dropped
JPEGs — see the "one util, three meanings" note under Ticket 02 below).

## The ShapeUtil today: `MtgCardImageShapeUtil`

`apps/tabletop/src/client/shapes/MtgCardImageShapeUtil.tsx` extends tldraw's built-in
`ImageShapeUtil` and overrides two hooks:

- **`onClick(shape)`** — tap/untap toggle (JES-144). Reads `shape.rotation`, flips between 0°
  and 90° (not a 4-way cycle), and recomputes `x`/`y` so the rotation pivots around the card's
  *center* rather than its top-left corner (tldraw rotates shapes around `x,y`, which is the
  top-left; `98f8bea` fixed a bug where the card swung around its corner instead of spinning in
  place).
- **`onTranslateEnd(_initial, current)`** — fires once, on the moved shape, when a drag settles.
  Two responsibilities live here:
  1. **Zone-entry detection** (`600cac1`): compares the shape's center against every other
     shape's `meta.zone` (via `zoneAt()`), and if the card entered a new zone, logs it and
     stamps `meta.zone` for next time. Debounced on `meta.zone` so staying in a zone, or a tiny
     in-zone nudge, doesn't refire.
  2. **Selection-state cleanup** (`959831c`, see the tldraw quirk below) — must run *before* the
     zone-equality early return, since some drags (e.g. two lands on the same playmat) hit that
     early return and would otherwise skip the cleanup.

`onClick` is declared *at all* — regardless of what it does — because its mere presence changes
how tldraw's own `SelectTool` behaves. See below.

## The tldraw quirk: `onClick` defers selection to pointer-up

tldraw's base `ShapeUtil.onClick` is declared as `onClick?(shape): TLShapePartial<Shape> | void`
— optional, no default implementation (`node_modules/@tldraw/editor/src/lib/editor/shapes/
ShapeUtil.ts:968`). `ImageShapeUtil` doesn't define it either. Whether a given ShapeUtil *has*
`onClick` at all — not what it does — changes tldraw's selection behavior:

- `PointingShape.onEnter` (`node_modules/tldraw/src/lib/tools/SelectTool/childStates/
  PointingShape.ts:33`) checks `this.editor.getShapeUtil(info.shape).onClick` — if truthy, it
  **defers** selecting the pointed-at shape until pointer-up (`didSelectOnEnter = false`), in
  case the gesture turns out to be a plain click rather than a drag.
- If the drag threshold is crossed before pointer-up, `startTranslating`
  (`PointingShape.ts:246`) has a safety net: `if (!this.didSelectOnEnter &&
  !this.editor.getSelectedShapeIds().length)` — it force-selects the actually-hit shape, but
  **only when nothing is currently selected**.
- tldraw leaves the just-dragged shape selected after a drag ends. So on a *second* drag (of a
  *different* shape), the safety net's guard is false — nothing gets reselected — and
  `Translating.onEnter` reads `getSelectedShapeIds()` (still pointing at the *first* shape) and
  translates it using the pointer deltas from the drag on the second shape.

**The fix**: `onTranslateEnd` calls `this.editor.setSelectedShapes([])` unconditionally, every
time a drag settles. That empties the selection, so the next drag's `startTranslating` safety net
correctly fires and reselects whatever shape is actually under the pointer.

**Anyone who defines `onClick` on a ShapeUtil inherits this quirk** and needs the equivalent
`setSelectedShapes([])` cleanup in their drag-settle hook — not just this one shape.

## Registration

`apps/tabletop/src/client/TablePage.tsx`:
```
const shapeUtils = [MtgCardImageShapeUtil];
...
<Tldraw store={store.store} deepLinks licenseKey={licenseKey} shapeUtils={shapeUtils} />
```
One custom ShapeUtil today. Zones/furniture (`tableFurniture.ts`) are drawn as stock, locked
`geo`/`image` shapes — no custom ShapeUtil of their own (see `MtgCardImageShapeUtil.tsx`'s own
comment on why `onTranslateEnd` rather than `onDragShapesOver`/`onDropShapesOver` was chosen for
zone detection: zones have nothing to hang a target-side hook on without giving them their own
ShapeUtil).

## Ticket 02: the coming rewrite

`.scratch/tabletop-physics/issues/02-what-a-card-is.md` (resolved 2026-08-07, `c956949`) decided
the card becomes a genuine custom shape type — `mtg-card` extending `BaseBoxShapeUtil`, not
`ImageShapeUtil` — rendering its own image rather than delegating to tldraw's image machinery.
Deciding argument: "one util, three meanings" — today's single `type: "image"` util serves real
cards, locked furniture, *and* stray dropped JPEGs, none of which share meaning.

Consequences for this owner's territory once implemented:
- The new `mtg-card` ShapeUtil **keeps `onClick`** (for tap), so it **inherits the same tldraw
  quirk** — the `setSelectedShapes([])` cleanup in `onTranslateEnd` must be ported forward. Not
  optional; without it, the drag-identity bug reopens on day one of the rewrite.
- `meta` empties out; identity and other card fields move into validated, migratable `props`
  instead (previously unvalidated/unmigratable in `meta`). Update `files.md`/`architecture.md`
  here once that lands — the `meta.instanceId` guard pattern documented above will change shape.
- The per-instance tldraw image *asset* goes away — flip becomes a pure shape-prop change (no
  asset mutation), which affects card-rendering territory (`two-faced-cards`), not this owner's
  selection mechanics.

## How to tell this owner's territory from `two-faced-cards`'s

If the question is "why does clicking/dragging/tapping do the wrong thing, or hit the wrong
shape" — this owner. If the question is "why does the card show the wrong image/face" — that's
`two-faced-cards`. A single file (`MtgCardImageShapeUtil.tsx`) currently serves both concerns;
don't let that fool you into consulting both owners for every change to it. See
`owners/two-faced-cards/interactions.md` watch point 16 for the cross-reference the other
direction.
