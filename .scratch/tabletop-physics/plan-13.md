# Plan: ticket 13 — replace furniture with the `mtg-zone` custom shape

Scope: apps/tabletop only. Visual retokenizing (dashed --dark-pink, armed glow) is ticket 14's
job, blocked by this one — this plan keeps the current dashed-grey / solid-black-playmat look,
just moving it onto a real shape type.

## 1. `apps/tabletop/src/shared/mtgZoneShape.ts` (new)

Mirrors `mtgCardShape.ts`'s pattern exactly:

```ts
export interface MtgZoneShapeProps {
  w: number;
  h: number;
  zone: "playmat" | "library" | "graveyard" | "exile" | "stack" | "command";
  seatId: string | null;
  label: string;
}
declare module "@tldraw/tlschema" {
  interface TLGlobalShapePropsMap { "mtg-zone": MtgZoneShapeProps }
}
export type MtgZoneShape = TLShape<"mtg-zone">;
export const mtgZoneShapeProps: RecordProps<MtgZoneShape> = {
  w: T.nonZeroNumber,
  h: T.nonZeroNumber,
  zone: T.literalEnum("playmat", "library", "graveyard", "exile", "stack", "command"),
  seatId: T.string.nullable(),
  label: T.string,
};
```

`command` is in the enum (per ticket 13's literal prop spec) even though no server code places a
command zone yet — same posture as `mtg-card`'s validated-but-not-yet-all-wired props.

## 2. `apps/tabletop/src/client/shapes/MtgZoneShapeUtil.tsx` (new)

`extends BaseBoxShapeUtil<MtgZoneShape>`. No `onClick`, no `onTranslateEnd` — zones are locked,
passive, never enter tldraw's normal selection/pointing flow (confirmed with
tabletop-shape-mechanics-context: the onClick-selection-deferral quirk only applies to ShapeUtils
that define onClick).

- `getDefaultProps()`: `{ w: 100, h: 100, zone: "playmat", seatId: null, label: "" }`
- `isAspectRatioLocked()`: `false`
- `component(shape)`: `<HTMLContainer>` with a plain div — dashed grey border + label text,
  except `zone === "playmat"` gets a solid black border (today's `PLAYMAT_REGION_STYLE`
  equivalent). No pointer-events re-enable needed (non-interactive, default HTMLContainer
  pointer-events:none is fine — nothing needs to be clicked on a zone).
- `getIndicatorPath(shape)`: rectangle, same as `mtg-card`.

## 3. Registration (three sync places)

- `TablePage.tsx`: `shapeUtils = [...defaultShapeUtils, MtgCardShapeUtil, MtgZoneShapeUtil]`
- `rooms.ts`: `createTLSchema({ shapes: { ...defaultShapeSchemas, "mtg-card": {...}, "mtg-zone": { props: mtgZoneShapeProps } } })`
- (`<Tldraw shapeUtils>` reuses the same `shapeUtils` array as `useSync` — one edit covers both.)

## 4. `tableFurniture.ts` rewrite

- `Zone` type becomes `MtgZoneShapeProps["zone"]` (drop the separate hand-written union).
- `regionShape()` → `zoneShape()`: builds `type: "mtg-zone"` records with
  `props: { w, h, zone, seatId, label }`, `isLocked: true`. Drop `RegionStyle`/
  `DEFAULT_REGION_STYLE`/`PLAYMAT_REGION_STYLE` (styling moves into `MtgZoneShapeUtil.component`,
  branching on `props.zone === "playmat"` — dead code otherwise, per CLAUDE.md's "delete
  newly-unused code").
- `imageShape()`: drop the `zone` param and `meta.zone` — the playmat/library picture overlays
  stay stock `image` shapes and never participate in zone detection (only `mtg-zone`-typed shapes
  do), so tagging them was already vestigial.
- Every `zoneShape(...)` call site in `ensurePlayerArea` gets a `seatId` argument (the seat's
  real id) in place of the old bare `zone` string.
- Seat name label literal: flip `isLocked: false` → `true` (the ticket's named bug fix).
- `ensureStackStripWidth`: read the existing record first —
  `const existing = store.get(stackId); const index = existing ? existing.index : nextIndex(...)`
  — and pass `zone: "stack"`, `seatId: null`. This is the "preserve existing index" fix the
  ticket calls out by name.

## 5. `MtgCardShapeUtil.tsx` — `zoneAt()` rewrite

```ts
private zoneAt(shape: MtgCardShape): string | undefined {
  const bounds = this.editor.getShapePageBounds(shape);
  if (!bounds) return undefined;
  const center = bounds.center;
  let winner: { zone: string; index: string } | undefined;
  for (const candidate of this.editor.getCurrentPageShapes()) {
    if (candidate.type !== "mtg-zone") continue;
    const candidateBounds = this.editor.getShapePageBounds(candidate);
    if (!candidateBounds?.containsPoint(center)) continue;
    if (!winner || candidate.index > winner.index) {
      winner = { zone: (candidate.props as MtgZoneShapeProps).zone, index: candidate.index };
    }
  }
  return winner?.zone;
}
```

Plain string comparison on `index` (`IndexKey`, fractional-indexing base62, order-preserving) —
confirmed with the owner as the correct topmost-wins comparison; `getCurrentPageShapes()`'s own
iteration order isn't relied on. Everything else in `onTranslateEnd` (the `setSelectedShapes([])`
workaround, the `meta.zone` debounce on the *card*) is untouched — only the target-matching
predicate inside `zoneAt` changes, per the ticket ("stays card-side... upgraded... from matching
`meta.zone` to matching `type === 'mtg-zone'`").

## 6. Test fallout

- `test/seatJoined.test.ts`: `s.type === "geo"` → `s.type === "mtg-zone"`; the Stack-width
  assertions reading `s.props.richText` → `s.props.label === "The Stack"` (`props.label` replaces
  the geo shape's rich-text label).
- New vitest coverage in `test/seatJoined.test.ts` (or a focused new test) asserting
  `ensureStackStripWidth` preserves the Stack shape's `index` across a widen (join a second seat,
  assert `index` unchanged from after the first).
- `test/verification/verify-zone-entry.spec.ts`: unchanged in spirit (still locates furniture via
  `data-shape-id`, still asserts the `zone-entry <instanceId> <zone>` console line) — should keep
  passing unmodified since `mtg-zone` shapes are still locked and still get `data-shape-id`. Will
  add one Playwright case for "topmost zone wins on overlap" if two zones can be made to overlap
  cheaply in the existing layout (e.g. Stack widened over a playmat corner); otherwise this is
  covered adequately by the existing single-zone drags plus a unit-level reasoning check, and I'll
  say so rather than force a fragile geometry-overlap test.

## Open question I'm resolving myself (no need to interrupt Jess)

Ticket 13's checklist doesn't ask for a dedicated overlap-geometry Playwright test, just "a card
overlapping two zones lands in the topmost-drawn one" as a behavior guarantee. Given today's
layout has no naturally-overlapping zones, I'll cover this with a focused reasoning-level check
(construct two zone shapes at the same bounds with different indices via the test harness, drag a
card there) if practical inside the existing Playwright rig; if it's not practical without new
scaffolding, I'll note the gap explicitly rather than skip it silently.
