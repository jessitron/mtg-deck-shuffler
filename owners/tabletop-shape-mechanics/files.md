# Files

**Rewritten wholesale 2026-08-08** in two tickets. Ticket 12 (`.scratch/tabletop-physics/
issues/12-*.md`) landed the `mtg-card` custom-shape rewrite decided by ticket 02, deleting
`MtgCardImageShapeUtil.tsx`. Ticket 13 (`.scratch/tabletop-physics/issues/13-*.md`) did the same
for furniture, adding `mtg-zone` alongside it — no file was deleted for this one since furniture
was never its own file (it lived inside `tableFurniture.ts`'s shape-builder functions). Ticket 14
(`.scratch/tabletop-physics/issues/14-*.md`, same day) added `zoneHitTest.ts`, extracting the
zone hit test into a function shared by both `MtgCardShapeUtil` and `MtgZoneShapeUtil`. Ticket 18
(`.scratch/tabletop-physics/issues/18-counters.md`, 2026-08-08, `4c64ef2`) added the third shape
type `mtg-counter` plus its creation tool and the eviction-geometry seam.

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
- `apps/tabletop/src/shared/mtgCounterShape.ts` — the same pattern for counters (ticket 18):
  `MtgCounterShapeProps` (`w`, `h`, `text` — free string, blank by default; no domain identity
  beyond its text), the `TLGlobalShapePropsMap` augmentation registering `mtg-counter`, and
  `mtgCounterShapeProps` validators, imported by client `MtgCounterShapeUtil.tsx` and server
  `rooms.ts`. Its doc comment carries the naming-collision note (table-layout ticket 12's life
  counter used `mtg-counter` as a working name; that shape needs its own name — see `TODO.md`).

## Client (the ShapeUtils themselves)

- `apps/tabletop/src/client/shapes/MtgCardShapeUtil.tsx` — the whole card territory: extends
  `BaseBoxShapeUtil<MtgCardShape>`; `onClick` (tap/untap, now toggling `props.tapped` with
  rotation as a pure visual delta), `onTranslateEnd` (selection cleanup + zone-entry detection +
  counter eviction on entering graveyard/exile/library — `NON_BATTLEFIELD_ZONES`, deliberately
  excluding the Stack), `zoneAt()` (private helper — since ticket 14, a thin wrapper around
  `zoneHitTest.ts`'s `topmostZoneAt()`, below; since ticket 18 returning the full `ZoneHit`,
  id+zone), the counter-hosting drag hooks (`canReceiveNewChildrenOfType`/
  `canRemoveChildrenOfType`, both type-narrowed to `mtg-counter`; `onDragShapesIn` with the
  rotation-zeroing math; `onDragShapesOut` with the `parentId` filter), `evictCounters()`
  (private — calls `findOpenSpotsNearZoneEdge`, below), and `component()`/`getIndicatorPath()`
  (renders its own `<img>`).
- `apps/tabletop/src/client/shapes/MtgZoneShapeUtil.tsx` — extends `BaseBoxShapeUtil<MtgZoneShape>`
  (ticket 13); still defines no interaction hooks at all (`onClick`/`onTranslateEnd`/
  `onDragShapesOver` are all absent — see `architecture.md`/`interactions.md` watch point 7 for why
  that's safe). `component()` renders a plain `<div>` — solid black border for `playmat`, dashed
  `--dark-pink` for everything else — and, since ticket 14 (2026-08-08), reads
  `useIsZoneArmed(this.editor, shape.id)` from `zoneHitTest.ts` to add a glow (`box-shadow` +
  tinted background/border color) while a dragged card is hovering over it. `getIndicatorPath()`.
- `apps/tabletop/src/client/shapes/zoneHitTest.ts` — **new, ticket 14; corrected same day
  (`05235aa`)**: `topmostZoneAt(editor, center)`, the topmost-zone-wins hit test extracted out of
  `MtgCardShapeUtil.zoneAt()` so a second caller (`MtgZoneShapeUtil`, above) can share it; and
  `useIsZoneArmed(editor, zoneId)`, a `use*` hook backed by one `computed()` per `Editor` (lazy
  `WeakMap<Editor, Computed<...>>`) that checks `editor.isIn("select.translating")` plus
  **`editor.inputs.currentPagePoint` — the pointer's own position, not any selected shape's
  bounds** — against `topmostZoneAt` to decide which single zone (if any) is currently "armed" for
  the in-progress drag. Arms exactly one zone regardless of selection size, matching "drag one of
  several selected cards moves them all to one destination." Read-only: writes nothing to the
  store. Imported by both `MtgCardShapeUtil.tsx` (`zoneAt()`, drag-settle) and
  `MtgZoneShapeUtil.tsx` (`component()`, live armed-glow rendering).
- `apps/tabletop/src/client/shapes/MtgCounterShapeUtil.tsx` — **new, ticket 18**: extends
  `BaseBoxShapeUtil<MtgCounterShape>`. Deliberately no `onClick` (text editing is stock
  double-click-to-edit via `canEdit()`, avoiding the selection-deferral quirk), but
  `onTranslateEnd` still clears selection unconditionally (watch point 1's generalized cleanup).
  `component()` renders the disc (or, while editing, an `<input>` with the `setTimeout(0)` focus
  workaround, `markEventAsHandled` on pointer-down, and Enter/Escape → `editor.complete()`);
  `isAspectRatioLocked()` keeps it square. Exports `COUNTER_SIZE` (44).
- `apps/tabletop/src/client/shapes/MtgCounterTool.ts` — **new, ticket 18**: `StateNode` with id
  `"mtg-counter"`; click-to-place one counter at the pointer, then back to the select tool. The
  minimal creation affordance (flagged as an assumption in the ticket outcome).
- `apps/tabletop/src/client/shapes/openSpotNearZoneEdge.ts` — **new, ticket 18**:
  `findOpenSpotsNearZoneEdge(request)`, pure geometry over plain `Rect`s (no `Editor`, unit-
  tested) — picks the zone edge nearest the card's entry point and alternates slots outward,
  skipping occupied rects; overlap beats failure. Used only by `evictCounters`.
- `apps/tabletop/src/client/TablePage.tsx` — registers
  `shapeUtils = [...defaultShapeUtils, MtgCardShapeUtil, MtgZoneShapeUtil, MtgCounterShapeUtil]`,
  passed to both
  `useSync` and the `<Tldraw shapeUtils={...}>` prop (this app uses the sync hook directly, which
  is why `defaultShapeUtils` must be spread in explicitly; see `architecture.md`). Add new custom
  ShapeUtils here. Since ticket 18 also wires the counter tool: `tools={[MtgCounterTool]}`,
  `overrides` (`uiOverrides.tools` adds the toolbar item), and `components`
  (`ToolbarWithCounter`, a `DefaultToolbar` with the counter item prepended).

## Server (identity is minted here, mechanics is not)

- `apps/tabletop/src/server/cardArrival.ts` — mints `props.instanceId` (moved out of `meta` by
  ticket 12) at shape creation (`createShapeId`; no longer mints a tldraw asset record — flip is
  a pure `props.face` write now). Not this owner's mechanics territory per se, but the identity
  contract every hook in `MtgCardShapeUtil` depends on.
- `apps/tabletop/src/server/rooms.ts` — builds the server-side `TLSocketRoom` schema via
  `createTLSchema({ shapes: { ...defaultShapeSchemas, "mtg-card": {...}, "mtg-counter": {...},
  "mtg-zone": {...} } })`.
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
  previously drag/delete another player's name label). Since *table-layout* ticket 13
  (2026-08-08, a different ticket 13 — see `history.md`), `ensurePlayerArea` also draws a
  Command Zone per seat (`zone: "command"`, id `region-command-<table>-<seatId>`, locked, no
  interaction hooks). Consulted by `zoneAt()` but not itself a custom ShapeUtil.
- `apps/tabletop/src/server/cardLayout.ts` — placement geometry, mostly *not* this owner's
  territory, except for one invariant zone detection leans on (since table-layout ticket 13):
  every pair of zone bounding boxes is strictly disjoint, with a 20-unit gap (`GAP`, exported,
  along with a `Bounds` interface), asserted pairwise in `apps/tabletop/test/cardLayout.test.ts`
  — because overlapping AABBs would make `topmostZoneAt()`'s draw-order tiebreak decide zone
  membership, which is deterministic but meaningless (watch point 8).

## Tests

- `apps/tabletop/test/verification/verify-zone-armed.spec.ts` — **new, ticket 14**: verifies the
  armed-glow appearance during a live drag, and (via a two-browser-context setup) that the armed
  state is genuinely local/unsynced — dragging on client A never shows armed styling on client B's
  copy of the same zone shape.
- `apps/tabletop/test/verification/verify-drag-identity.spec.ts` — regression test for the
  `959831c` drag-identity bug. Plays two lands, drags first, drags second, asserts only the
  second moved.
- `apps/tabletop/test/verification/verify-counter.spec.ts` — **new, ticket 18**: counter
  attach/ride/detach, the stale-counter-selection regression (drag counter, then drag card —
  the card must move), two counters evicting to the graveyard's edge when the host card dies,
  and in-place text editing. Its `createCounter` helper carries the ~500ms
  post-creation cooldown (tldraw's double-click window; see watch point 13).
- `apps/tabletop/test/openSpotNearZoneEdge.test.ts` — **new, ticket 18**: unit tests for the
  pure eviction geometry.

## Read-only dependency (not owned, but load-bearing — read when things surprise you)

- `node_modules/tldraw/src/lib/tools/SelectTool/childStates/PointingShape.ts` — selection-on-enter
  deferral logic (`onClick` truthiness check), `startTranslating`'s force-reselect safety net.
- `node_modules/tldraw/src/lib/tools/SelectTool/childStates/Translating.ts` — what happens once a
  drag is confirmed; reads `getSelectedShapeIds()` to decide what to move.
- `node_modules/@tldraw/editor/src/lib/editor/shapes/ShapeUtil.ts:968` — the base `onClick?`
  declaration (optional, no default implementation) that makes the truthiness check above mean
  "does this ShapeUtil define onClick at all," not "what does it do."
