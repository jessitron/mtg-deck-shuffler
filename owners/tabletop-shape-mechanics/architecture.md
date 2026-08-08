# Architecture

## Where a card shape comes from

`apps/tabletop/src/server/cardArrival.ts` handles `POST /api/tables/:tableName/cards` (the
Shuffler → Tabletop card-arrival endpoint). It mints the shape's identity once, at creation, now
directly in the shape's validated `props` (no separate tldraw asset record — see "Ticket 12
landed" below):

```
const shapeId = createShapeId(`card-${arrival.card.instanceId}`);
...
props: { ..., instanceId: arrival.card.instanceId, scryfallId: arrival.card.scryfallId, cardName: arrival.cardName, ... }
meta: {} // empty at arrival; zone gets stamped here once the card is dragged
```

`props.instanceId` is now the identity signal — but it no longer needs a defensive guard in every
hook the way `meta.instanceId` used to (see "The `meta` guard is gone" below): `mtg-card` is its
own exclusive tldraw shape type, so every instance of it is a real card by construction. Furniture
and stray drops can no longer masquerade as one the way they could when everything shared
`type: "image"`.

## The ShapeUtil today: `MtgCardShapeUtil`

`apps/tabletop/src/client/shapes/MtgCardShapeUtil.tsx` extends tldraw's `BaseBoxShapeUtil<MtgCardShape>`
(not `ImageShapeUtil` — see "Ticket 12 landed" below) and overrides:

- **`onClick(shape)`** — tap/untap toggle (JES-144). Tap state lives in `props.tapped` (a real,
  validated boolean — no more reading it back out of `rotation` with a float-tolerance epsilon).
  Rotation is applied as a pure visual delta (`shape.rotation ± 90°`), so free rotation and tap
  compose independently instead of one clobbering the other's read of "is this tapped." Still
  recomputes `x`/`y` so the rotation pivots around the card's *center* rather than its top-left
  corner (tldraw rotates shapes around `x,y`, which is the top-left; `98f8bea` fixed a bug where
  the card swung around its corner instead of spinning in place) — that math carried forward
  unchanged in substance.
- **`onTranslateEnd(_initial, current)`** — fires once, on the moved shape, when a drag settles.
  Two responsibilities live here:
  1. **Zone-entry detection** (`600cac1`): compares the shape's center against every other
     shape's `meta.zone` (via `zoneAt()`), and if the card entered a new zone, logs it and
     stamps `meta.zone` for next time. Debounced on `meta.zone` so staying in a zone, or a tiny
     in-zone nudge, doesn't refire. `meta` is now used for *only* this — zone dedup — nothing
     else (ticket 13 will move even this to reading `mtg-zone` shapes' own props instead).
  2. **Selection-state cleanup** (`959831c`, see the tldraw quirk below) — must run *before* the
     zone-equality early return, since some drags (e.g. two lands on the same playmat) hit that
     early return and would otherwise skip the cleanup.
- **`component(shape)` / `getIndicatorPath(shape)`** — new, required by `BaseBoxShapeUtil`. The
  card renders its own `<img>` (front or back URL chosen from `props.face`) instead of delegating
  to tldraw's image machinery.

`onClick` is declared *at all* — regardless of what it does — because its mere presence changes
how tldraw's own `SelectTool` behaves. See below.

## The `meta` guard is gone

The old `MtgCardImageShapeUtil` shared tldraw's `type: "image"` with furniture backgrounds and
stray dropped JPEGs, so every hook opened with `if (!shape.meta?.instanceId) return undefined` to
tell a real card apart from those. `mtg-card` is now its own exclusive shape type — every instance
*is* a real card — so that guard was dead weight and was removed from `onClick`/`onTranslateEnd`.
Identity now lives in validated `props` (`instanceId`/`scryfallId`/`cardName`), not `meta`. `meta`
survives only for the zone-entry dedup described above.

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

Registering `mtg-card` needs **two** places to agree — client and server — and both have the same
shape of gotcha: the tldraw helper you'd reach for naturally does NOT fold in tldraw's own stock
shape types the way `<Tldraw shapeUtils={...}>` does. Miss either half and furniture (which still
uses stock `geo`/`image` shapes) breaks, not cards.

**Client** — `apps/tabletop/src/client/TablePage.tsx`:
```
const shapeUtils = [...defaultShapeUtils, MtgCardShapeUtil];
...
const store = useSync({ uri, assets: inlineAssets, shapeUtils });
```
`useSync`'s schema-building (`createTLSchemaFromUtils` in `@tldraw/editor`) does NOT merge in
tldraw's defaults the way `<Tldraw shapeUtils={...}>` does (that component merges via
`mergeArraysAndReplaceDefaults` against `defaultShapeUtils`; `useSync` just does
`checkShapesAndAddCore` against only what's passed, adding just `GroupShapeUtil`). Passing
`shapeUtils: [MtgCardShapeUtil]` alone would silently drop geo/image/text/etc. from the *client*
store's validation schema — any furniture using those types would fail to sync. Fix: spread
`defaultShapeUtils` in explicitly.

**Server** — `apps/tabletop/src/server/rooms.ts`:
```
const tableSchema = createTLSchema({
  shapes: { ...defaultShapeSchemas, "mtg-card": { props: mtgCardShapeProps } },
});
...
room: new TLSocketRoom({ schema: tableSchema, ... })
```
`createTLSchema({ shapes: {...} })` has the mirror gotcha: it does NOT default-fill omitted
shapes either. Miss `...defaultShapeSchemas` here and the *server's* schema rejects furniture,
not just cards — and unlike the client-side gap, this one disconnects the client outright rather
than degrading quietly, since `TLSocketRoom` validates every incoming record against `schema`.

Zones/furniture (`tableFurniture.ts`) are drawn as stock, locked `geo`/`image` shapes — no custom
ShapeUtil of their own (see `MtgCardShapeUtil.tsx`'s own comment on why `onTranslateEnd` rather
than `onDragShapesOver`/`onDropShapesOver` was chosen for zone detection: zones have nothing to
hang a target-side hook on without giving them their own ShapeUtil).

## Registering a shape into tldraw's own `TLShape` union

A hand-rolled `TLBaseShape<'my-type', Props>` is never a member of tldraw's closed `TLShape`
union on its own — and `BaseBoxShapeUtil<Shape>`'s generic constraint
(`TLBaseBoxShape = ExtractShapeByProps<{w,h}>`, which extracts from that same closed union) fails
to typecheck without it. tldraw's own documented fix (see `TLShape.ts`'s `TLGlobalShapePropsMap`
doc comment), used in `apps/tabletop/src/shared/mtgCardShape.ts`:
```
declare module "@tldraw/tlschema" {
  interface TLGlobalShapePropsMap {
    "mtg-card": MtgCardShapeProps;
  }
}
export type MtgCardShape = TLShape<"mtg-card">;
```
This is ambient module augmentation, not a runtime registration — it only affects typechecking.
The *runtime* registrations are the client/server schema wiring above; both are required, and
neither one implies the other.

## The `pointer-events` trap for anything rendered in `<HTMLContainer>`

tldraw's `.tl-html-container` CSS class is `pointer-events: none` by default, and `pointer-events`
is an inherited CSS property — so a bare `<img>` dropped straight inside `<HTMLContainer>`
inherits `none`, and Playwright's actionability check refuses to click it ("tl-background
intercepts pointer events"), timing out. This broke every click-based Playwright spec on first
implementation of `MtgCardShapeUtil.component()` until traced to this. tldraw's own stock
image/video shapes avoid it by wrapping content in `<div className="tl-image-container">`
(`tldraw.css` sets `pointer-events: all` on that class) and using `className="tl-image"` on the
`<img>` for sizing/positioning — `MtgCardShapeUtil.tsx` reuses those two stock classes rather than
inventing inline pointer-events styles. Any future custom shape that renders interactive content
in `<HTMLContainer>` needs the same treatment.

## Ticket 02/12: the rewrite, landed

`.scratch/tabletop-physics/issues/02-what-a-card-is.md` (resolved 2026-08-07, `c956949`) decided
the card becomes a genuine custom shape type — `mtg-card` extending `BaseBoxShapeUtil`, not
`ImageShapeUtil` — rendering its own image rather than delegating to tldraw's image machinery.
Deciding argument: "one util, three meanings" — the old single `type: "image"` util served real
cards, locked furniture, *and* stray dropped JPEGs, none of which shared meaning. Ticket 12
(landed 2026-08-08) implemented it:

- The new `mtg-card` ShapeUtil **keeps `onClick`** (for tap), so it **inherits the same tldraw
  quirk** — the `setSelectedShapes([])` cleanup was ported forward into the new
  `onTranslateEnd` unchanged. Not optional; without it, the drag-identity bug would have reopened
  on day one of the rewrite.
- `meta` emptied out as planned; identity and other card fields moved into validated, migratable
  `props` instead (previously unvalidated/unmigratable in `meta`). The old
  `if (!shape.meta?.instanceId) return undefined` guard was removed — see "The `meta` guard is
  gone" above. `meta` now carries only `zone`.
  Two additional tldraw registration mechanics turned up during implementation that weren't
  anticipated when ticket 02 was scoped — the `TLGlobalShapePropsMap` augmentation and the
  `useSync`/`createTLSchema` default-shapes gap, both documented above.
- The per-instance tldraw image *asset* is gone — flip is now a pure `props.face` write (no
  asset mutation, no re-fetch; both faces' URLs travel with the card from arrival). This affects
  card-rendering territory (`two-faced-cards`), not this owner's selection mechanics.

## How to tell this owner's territory from `two-faced-cards`'s

If the question is "why does clicking/dragging/tapping do the wrong thing, or hit the wrong
shape" — this owner. If the question is "why does the card show the wrong image/face" — that's
`two-faced-cards`. A single file (`MtgCardShapeUtil.tsx`) serves both concerns; don't let that
fool you into consulting both owners for every change to it. See
`owners/two-faced-cards/interactions.md` watch point 16 for the cross-reference the other
direction.
