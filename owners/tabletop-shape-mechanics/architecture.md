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
  unchanged in substance. Since ticket 16 (multi-untap, 2026-08-09, `626ab6f`) the
  center-fixed pivot math lives in a private `tapPartial(shape, tapped)` helper, and `onClick`
  also pushes the clicked card's NEW state to the rest of a marquee selection via a
  `queueMicrotask`-deferred batch — see "Ticket 16" below for the undo-coalescing mechanism
  this depends on.
- **`onTranslateEnd(_initial, current)`** — fires once, on the moved shape, when a drag settles.
  Three responsibilities live here:
  1. **Zone-entry detection** (`600cac1`): resolves the zone under the card's center via
     `zoneAt()` (since ticket 18 returning the full `ZoneHit` — `{id, zone}` — not just the zone
     string, because eviction needs the zone shape's bounds), and if the card entered a new
     zone, logs it and stamps `meta.zone` for next time. Debounced on `meta.zone` so staying in
     a zone, or a tiny in-zone nudge, doesn't refire.
  2. **Selection-state cleanup** (`959831c`, see the tldraw quirk below) — must run *before* the
     zone-equality early return, since some drags (e.g. two lands on the same playmat) hit that
     early return and would otherwise skip the cleanup.
  3. **Counter eviction** (ticket 18, inside the zone-change branch, after the debounce): when
     the new zone is in `NON_BATTLEFIELD_ZONES` (`graveyard`/`exile`/`library`), `evictCounters`
     detaches the card's counter children to the page and animates them to open spots near the
     zone's edge. See "Ticket 18" below — including why the Stack is deliberately NOT in that
     set.
- **`canReceiveNewChildrenOfType` / `canRemoveChildrenOfType` / `onDragShapesIn` /
  `onDragShapesOut`** (ticket 18) — the card is a drop target and host for `mtg-counter` shapes,
  via tldraw's native drag-and-drop parenting. See "Ticket 18" below for the gates' narrowing
  (load-bearing) and the rotation-zeroing math in `onDragShapesIn`.
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

Zones/furniture used to be drawn as stock, locked `geo`/`image` shapes with no custom ShapeUtil of
their own — ticket 13 (below) gave them one, `mtg-zone`. `MtgCardShapeUtil.tsx`'s own comment
still explains why `onTranslateEnd` (card-side) rather than `onDragShapesOver`/`onDropShapesOver`
(zone-side) is the right place for zone detection, and that reasoning is unchanged by ticket 13:
`Editor.getDraggingOverShape` filters out locked shapes before checking drag-over hooks at all, so
a target-side hook on `MtgZoneShapeUtil` could never fire regardless of whether zones have their
own ShapeUtil now. The playmat/library background *pictures* remain stock `image` shapes layered
on top of the `mtg-zone` outline — those never participate in zone detection either way.

## Ticket 13: furniture becomes a genuine custom shape type, `mtg-zone`

`.scratch/tabletop-physics/issues/03-what-furniture-is.md` (buoyed alongside ticket 02, resolved
2026-08-08) asked the same "one shared type, several meanings" question ticket 02 asked about
cards — furniture used stock, locked `geo`/`image` shapes tagged with a freeform `meta.zone`
string, indistinguishable at the type level from a stray dropped JPEG or a `geo` shape drawn by a
player for some other reason. Ticket 13 gives furniture its own type, `mtg-zone`:
`apps/tabletop/src/shared/mtgZoneShape.ts` (props/validators/`TLGlobalShapePropsMap`
registration, same pattern as `mtgCardShape.ts`) and
`apps/tabletop/src/client/shapes/MtgZoneShapeUtil.tsx` (`BaseBoxShapeUtil<MtgZoneShape>`).
`props.zone` is a closed enum (`"playmat" | "library" | "graveyard" | "exile" | "stack" |
"command"`) plus `seatId` and `label` — validated, unlike the old bare `meta.zone` string that any
shape could carry.

**New working example of a pattern this KB only had in the abstract before: a locked shape needs
no interaction hooks at all.** `MtgZoneShapeUtil` defines none of `onClick`/`onTranslateEnd`/
`onDragShapesOver` — not because they'd be no-ops, but because they're genuinely unreachable for a
locked shape:
- Zones are minted `isLocked: true` in `tableFurniture.ts`'s `zoneShape()` builder, and stay that
  way — tldraw's own context-menu Lock/Unlock is the sole unlock affordance, per the ticket.
- `SelectTool`'s `Idle` state gates on `isLocked` before a shape ever reaches `PointingShape` — so
  a locked shape never enters the click/drag flow this owner's watch point 1 warns about.
  **Consequence worth naming explicitly: `mtg-zone` defining `onClick` later (e.g. some future
  unlock affordance) would NOT reopen the `mtg-card` selection-deferral quirk**, because that
  quirk's `PointingShape.onEnter` check is gated behind the same `isLocked` test — a locked shape
  with `onClick` still never reaches the code path that defers selection.
- `Editor.getDraggingOverShape` filters out locked shapes before checking for drag-over hooks —
  so `onDragShapesOver`/`onDropShapesOver` on the zone side could never fire either, locked or
  not. This is why zone-entry detection has always lived card-side (`onTranslateEnd`'s `zoneAt()`)
  and still does.

Confirmed against tldraw source during `-review`, not assumed from the pattern above.

**`zoneAt()` upgraded from a bare `meta.zone` string scan to matching real `mtg-zone` shapes.**
`MtgCardShapeUtil.tsx`'s private `zoneAt()` now filters `candidate.type === "mtg-zone"` (instead
of "any shape with a truthy `meta.zone`") and reads the validated `candidate.props.zone` (instead
of the unvalidated `meta.zone`). It also now resolves overlapping zones — previously undefined
behavior — by picking the **topmost-drawn zone**: comparing candidates' `index` (an `IndexKey`,
tldraw's fractional-indexing base62 string) with plain string `>` and keeping the greatest. Plain
string comparison already reflects z-order for `IndexKey`s — confirmed against
`@tldraw/utils`'s `fractionalIndexing.ts` source during `-review`, not just the docs. `meta.zone`
survives on the *card* shape only as the zone-entry dedup ("what zone was this card last known to
be in") — reading zone membership from the environment now goes through real `mtg-zone` shapes,
not a tag on the card.

**Registration follows the exact four-step pattern watch point 6 already generalized from
`mtg-card`** — `TLGlobalShapePropsMap` augmentation in `mtgZoneShape.ts`; client
`useSync({ shapeUtils: [...defaultShapeUtils, MtgCardShapeUtil, MtgZoneShapeUtil] })` in
`TablePage.tsx` (same array reused by the `<Tldraw shapeUtils={...}>` prop); server
`createTLSchema({ shapes: { ...defaultShapeSchemas, "mtg-card": {...}, "mtg-zone": {...} } })` in
`rooms.ts`. No new registration mechanic turned up this time — the pattern generalized cleanly to
a second shape type, which is itself worth recording as confirmation it's the right pattern.

**Visual treatment moved off a separate style-parameter machinery and into
`MtgZoneShapeUtil.component()`.** `tableFurniture.ts` used to carry a `RegionStyle`/
`DEFAULT_REGION_STYLE`/`PLAYMAT_REGION_STYLE` set of constants that got threaded through to style
the stock `geo` shapes' border. That's gone; `MtgZoneShapeUtil.component()` now branches directly
on `props.zone === "playmat"` to choose a solid black border vs. the other zones' dashed grey —
the visual decision lives with the shape that renders it, not in a server-side styling parameter
object. Ticket 14 (retokenizing to `--dark-pink`/armed-glow) will edit `component()` in place;
nothing about *this* ticket's plumbing anticipates that beyond leaving a comment pointing at it.

**Two incidental fixes rode along with the ticket, both worth recording here because they're
easy to reopen:**
- `ensureStackStripWidth` (`tableFurniture.ts`) used to call `nextIndex()` — minting a fresh,
  always-highest z-order index — on *every* call, including when widening an already-existing
  Stack strip for a newly-joined seat. That silently promoted the Stack to the top of z-order
  every time a seat joined, potentially covering shapes placed above it since. Fixed by reading
  the existing shape via `store.get(stackId)` inside `updateStore` and reusing its `.index` when
  present; `nextIndex()` is now called only on first creation. Not a `mtg-zone`-specific bug — it
  would have bitten the old `geo`-shape Stack too — but it surfaced while touching this code for
  the rewrite. **Superseded by table-layout ticket 14** (`5eeac70`, 2026-08-08):
  `ensureStackStripWidth` is now `ensureStackDrawn` — the Stack is a fixed 1000×1000 square drawn
  once (guard: `store.get(stackId)` existence, not seat count); later seat joins are a no-op, so
  the z-order-promotion bug can't recur *by construction* — there is no "widen the existing
  Stack" code path anymore.
- The seat name label (`tableFurniture.ts`, the `type: "text"` shape) was `isLocked: false`,
  meaning any player could drag or delete another player's name label. Now `isLocked: true`, same
  as the zones around it. Also not `mtg-zone`-specific (the label stayed a stock `text` shape,
  not converted to a zone), but fixed in the same pass.

**Addendum (2026-08-08, *table-layout* ticket 13 — a different ticket 13, see `history.md`):**
`zone: "command"` is no longer enum-only — `ensurePlayerArea` now draws a locked Command Zone
per seat (id `region-command-<table>-<seatId>`, two cards wide for partner commanders), with no
interaction hooks, per watch point 7. The same change made every pair of zone AABBs strictly
disjoint (20-unit `GAP`, exported from `cardLayout.ts`), pairwise-asserted in
`test/cardLayout.test.ts`, because an overlap would resolve via `topmostZoneAt()`'s draw-order
tiebreak — deterministic but semantically meaningless. See watch point 8.

**Addendum (2026-08-08, *table-layout* ticket 14, `5eeac70` — "the square", yet another
ticket-number collision with the zone-appearance ticket 14 below):** the row layout is gone.
Seats take compass slots (S, N, E, W by join order) around a fixed 1000×1000 Stack square
centered on the board origin (`STACK_SIZE`/`stackBounds()`/`playerAreaOrigin()` in
`cardLayout.ts`). The disjointness invariant above now holds **across all four seats and the
Stack**, strengthened to a ≥ `GAP` empty band between every pair of AABBs (`separation()` helper
in `test/cardLayout.test.ts`) — `STACK_SIZE` deliberately exceeds `PLAYMAT_H` so E/W areas never
overlap N/S. Most furniture now sits at **negative** page coordinates; `topmostZoneAt()` was
verified sign-agnostic during this owner's `-review`. The client compensates for the
centered-on-origin layout with `aimCameraAtTheTable()` in `TablePage.tsx` — since `96159be`
(same-day code-review fixes), one deterministic mount-time `editor.zoomToBounds(TABLE_EXTENT,
{ inset: 24 })` over the table's fixed extent, never a fit-to-content or a store listener (the
first cut zoomed on the first *remote* shape arrival, and that reactive zoom raced Playwright
measurements and flaked; `?d=` deep links still suppress the framing). This is what keeps
Playwright actionability working, and it matters doubly because tldraw culls off-viewport
shapes from the DOM — `.tl-shape` counts are only reliable with everything in view. Also
`96159be`: `playerAreaOrigin` throws past the new `MAX_SEATS` export (4) instead of wrapping a
fifth seat onto S, both `seatJoined.ts` and `cardArrival.ts` 409 first ("table is full: 4
seats"), and the disjointness invariant is additionally asserted over the actually-drawn
`mtg-zone` shapes at the handler seam (`test/seatJoined.test.ts`, 21 zones at a full table).
Watch point 8's "square" risk is resolved: the tiebreak question never had to be answered.

## Ticket 14: zone appearance (dashed at rest, glow when armed) — `topmostZoneAt` extracted, shared

`.scratch/tabletop-physics/issues/14-*.md` (landed 2026-08-08) gave zones a visual "armed" state —
glowing when the card currently being dragged is hovering over them — on top of ticket 13's
dashed-at-rest look. This needed the same topmost-zone-wins hit test `MtgCardShapeUtil.zoneAt()`
already did (drag-*settle* zone entry), but now also as a live drag-*in-progress* check (is a zone
under the card's center *right now*, mid-drag) — a second consumer, exactly what watch point 8's
prior wording anticipated when it said the tie-break "lives in one place." It now actually does:

`apps/tabletop/src/client/shapes/zoneHitTest.ts` (new) extracts the hit test into
`topmostZoneAt(editor, center)`, returning `{ id, zone }` for the topmost `mtg-zone` shape whose
page bounds contain `center` (same greatest-`index` tie-break as before, now with its rationale and
watch-point-8 caveat written once instead of duplicated per caller). `MtgCardShapeUtil.zoneAt()`
now calls `topmostZoneAt(...)?.zone` instead of walking shapes itself.

**New reactive-signal pattern**: the same file also exports `useIsZoneArmed(editor, zoneId)`, built
on one `computed()` per `Editor` instance (a lazy `WeakMap<Editor, Computed<TLShapeId | undefined>>`
— not one `computed` per zone shape). The computed checks `editor.isIn("select.translating")` (the
same `select.translating` state `Translating.ts` — see the drag-identity bug above — governs) and,
if in it, resolves `topmostZoneAt` against **the pointer's own current page point**
(`editor.inputs.currentPagePoint`), not against any selected shape's bounds — see "Corrected,
2026-08-08: armed zone is keyed on the pointer, not per selected shape" below for why. **Sharing
one signal across all zones, rather than each zone shape's `component()` independently rescanning,
is the point**: tldraw's `Translating` state updates shape position on every raw pointer-move (not
throttled), so N zones each doing their own O(zones) scan would be O(zones²) work per tick during a
drag; one shared computed makes it O(zones) regardless of how many zones exist. Confirmed against
tldraw source (`PointingShape.ts`'s `startTranslating` calls `this.parent.transition('translating',
info)` on the `select` tool node — i.e. exactly the string `"select.translating"`) and against a
live Playwright drag, not assumed from the state name.

### Corrected, 2026-08-08: armed zone is keyed on the pointer, not per selected shape

A code-review finding on the first cut of `useIsZoneArmed` argued that keying the armed signal on
a single selected shape's bounds missed a multi-card-drag case, and pushed toward computing a *set*
of armed zone ids — one per shape in `editor.getSelectedShapeIds()`. That landed briefly, then Jess
corrected it: selecting several cards and dragging one moves the whole selection together, as one
rigid group, to **one** destination — "select six cards, drag one to the graveyard — I want all of
them to go to the graveyard." A multi-card drag lighting up one zone per card misrepresents what's
actually about to happen; the "fix" solved a problem that isn't real for this app's mental model of
multi-select drag.

`zoneHitTest.ts` now computes a single armed zone id, unconditionally, keyed on
`editor.inputs.currentPagePoint` — the pointer's own page-space position, confirmed atom-backed and
reactive (`node_modules/@tldraw/editor/src/lib/editor/managers/InputsManager/InputsManager.ts:90`)
— rather than any selected shape's own bounds. This is deliberately robust to selection size: a
single-card drag and a six-card drag both arm exactly one zone, whichever one is under the cursor,
with no dependence on `getSelectedShapeIds()`'s iteration order (the thing the per-shape version
depended on to pick "the" shape when there were several). Regression test:
`verify-zone-armed.spec.ts`'s "dragging a multi-card selection arms only the one zone under the
pointer, not one per card" — selects two cards via shift-click and drags the group, asserting the
zone under the pointer arms and a second zone (that one of the other selected cards' own bounds
would otherwise have overlapped) does not. Uses `zoneHint: "battlefield"` rather than `"stack"` for
the two cards, because same-position stacking made click-selection of the second card ambiguous in
the test.

**First "read reactively, write nothing" hook in this KB.** Every prior `ShapeUtil.component()`
hook documented here (`onClick`, `onTranslateEnd`) *writes* to the store — a tap, a zone stamp, a
selection clear. `MtgZoneShapeUtil.component()` calls `useIsZoneArmed(this.editor, shape.id)`
unconditionally at the top, before any conditional branching, purely to *read* derived state for
rendering. It produces no store write and therefore no undo entry, no sync traffic, and (confirmed
with a two-browser-context Playwright test) no visibility on another client's copy of the same zone
shape — the armed glow is genuinely local to whichever browser is doing the dragging. Any future
hook that wants to render transient, per-viewer state (not game state) should follow this shape:
a shared `computed()` behind a `use*` hook, read in `component()`, never written to `props`/`meta`.

`MtgZoneShapeUtil` still defines no `onClick`/`onTranslateEnd`/`onDragShapesOver` — the armed-glow
feature lives entirely inside `component()`, consistent with watch point 7 (a locked shape needs no
interaction hooks; this ticket didn't need to add any to get a dynamic, drag-reactive appearance).

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

## The life counter: decided, not built — named `mtg-life-counter` (table-layout ticket 12, 2026-08-08)

**Naming collision, resolved 2026-08-08 by ticket 18 claiming the type string.** The
tabletop-physics spec assigns `mtg-counter` to the drag-onto-a-card counter, which ticket 18
built (see "Ticket 18" below) — an **unlocked, draggable, text-editable** shape, nearly the
opposite of the shape this section describes. The life counter is named `mtg-life-counter`
instead. Everything below is about the *life counter*, not the shape currently registered as
`mtg-counter`.

`.scratch/tabletop-table-layout/issues/12-life-totals-and-commander-damage.md` (resolved
2026-08-08 — note this is a *different* "ticket 12" from the `tabletop-physics` ticket 12 that
landed the `mtg-card` rewrite) decided that a life counter is a custom shape type:
**locked furniture** whose `component()` renders a number with +/-
buttons and a directly-typeable number field. Everyone can press anyone's buttons; state syncs
as ordinary shape props. **No code exists yet.** Three mechanics facts were established from
tldraw source during this owner's `-context` consult for that grilling session, and belong here
so the implementer doesn't re-derive them:

1. **Locking gates tldraw's gesture state machine, NOT DOM events inside `component()`.**
   `SelectTool`'s `Idle` state filters `isLocked` before a shape ever reaches `PointingShape`,
   and `Editor.getDraggingOverShape` filters `!isLocked` — but neither touches DOM event
   dispatch to the shape's rendered HTML. A locked shape can host fully working buttons and
   inputs. This is the load-bearing fact that makes "locked furniture with live controls" a
   coherent design at all.
2. **The canonical pattern for interactive controls inside a shape is tldraw's own
   `HyperlinkButton`** (the bookmark shape): `pointer-events: all` on the control, plus
   `editor.markEventAsHandled(e)` in `onPointerDown`/`onPointerUp` (`Editor.ts:10876`;
   `useCanvasEvents` checks `wasEventAlreadyHandled` and skips its own canvas handling).
   Preferred over the older `stopEventPropagation` util.
3. **tldraw sync is last-writer-wins state replication, not a CRDT.** Simultaneous prop writes
   to the same shape can lose one increment. Accepted for counters — rare, and self-evident on
   screen. This is also why story-quality life-change records need an explicit event per press
   rather than diffing synced state; that work is parked at
   `.scratch/tabletop-replaces-mural/parked/life-change-events.md` for Map 5 ("The table
   reports").

Implementation cautions, recorded now so they're not discovered mid-build:

- **The full four-step registration cost applies (watch point 6), *including* step 4** — the
  pointer-events item. The life counter will be the first *locked* shape to exercise it:
  `mtg-zone` skipped step 4 because nothing clicks it, but the condition was always "is the
  component's content interactive," never "is the shape unlocked."
- **The typeable number field must shield keystrokes from tldraw's tool hotkeys.** Ticket 18
  found the mechanism that handles this for free when editing goes through tldraw's own
  editing state: `areShortcutsDisabled` is true whenever `getEditingShapeId() !== null`
  (`useKeyboardShortcuts.ts`). The life counter's always-live input (no editing state — you just
  click and type) will NOT get that for free and still needs its own shield; the old caution
  stands for it specifically.
- Watch point 1 (the `onClick` selection-deferral quirk) does **not** apply: locked shapes never
  reach `PointingShape`, and the counter's interactivity lives in DOM handlers, not a ShapeUtil
  `onClick`.

## Ticket 18: `mtg-counter` — counters ride on cards (landed 2026-08-08, `4c64ef2`)

`.scratch/tabletop-physics/issues/18-counters.md`. A third custom shape type, `mtg-counter`
(`apps/tabletop/src/shared/mtgCounterShape.ts`, props `{w, h, text}`;
`apps/tabletop/src/client/shapes/MtgCounterShapeUtil.tsx`, `BaseBoxShapeUtil<MtgCounterShape>`):
an **unlocked, draggable disc** with free editable text, blank by default. Attachment to a card
is tldraw **parenting** (the counter's `parentId`), never a prop on either shape — the card's
util *mediates* the drop, but the parent relationship carries the state.

### The counter's own util is deliberately minimal

- **No `onClick`** — text editing is tldraw's stock double-click-to-edit (`canEdit(): true`),
  specifically so this util never triggers the `PointingShape` selection-deferral quirk.
- **But it still has `onTranslateEnd` calling `setSelectedShapes([])`, unconditionally, with no
  early return above it.** This is watch point 1's cleanup obligation *generalizing beyond
  `onClick`-bearing utils*: tldraw leaves any just-dragged shape selected, and the *card's*
  `startTranslating` safety net only reselects the pointed-at shape when nothing is selected —
  so a stale *counter* selection would make the next *card* drag silently translate the counter.
  Any unlocked draggable shape sharing a canvas with an `onClick`-bearing shape needs this
  cleanup. Regression test: `verify-counter.spec.ts`'s "after dragging a counter, dragging a
  card moves the card (stale-selection regression)".
- **Editing keystrokes are shielded from tool hotkeys for free**: tldraw's
  `areShortcutsDisabled` is true whenever `getEditingShapeId() !== null`
  (`useKeyboardShortcuts.ts`). This supersedes the always-live-input caution recorded for the
  life counter *for shapes that use tldraw's editing state*; an always-live input still needs
  its own shield. Enter/Escape must be handled in the input's own `onKeyDown`
  (`editor.complete()`) because the focused input swallows keys before tldraw's document-level
  handlers see them. Cursor-positioning clicks use `editor.markEventAsHandled(e)` in
  `onPointerDown` (the `HyperlinkButton` pattern, as predicted).
- **Focus on edit-start needs `setTimeout(0)`.** tldraw's own end-of-gesture focus management
  beats `autoFocus`, ref-callback focus, AND a bare `useEffect` focus — all three end with
  `document.activeElement === body` (verified empirically). The working fix: a `setTimeout(0)`
  inside the `isEditing` effect (`MtgCounterShapeUtil.tsx` has the comment; tldraw's own
  `useEditablePlainText` does a bare effect, but stock shapes apparently ride a different path).
- `isAspectRatioLocked(): true` keeps the box square, which is what makes `border-radius: 50%`
  draw a circle rather than an ellipse.
- Step 4 of the registration recipe (pointer-events) applies: the component wraps content in
  `.tl-image-container` with `pointerEvents: "all"`, or double-click-to-edit never reaches it.

### The card is the counter HOST — drag hooks on `mtg-card`

Defining *any* of the drag hooks makes every card a drag target for every unlocked dragged shape
(`getDraggingOverShape` checks only that hooks exist), so both `can*` gates are type-narrowed —
this narrowing is load-bearing, not tidiness:

- `canReceiveNewChildrenOfType(shape, type)` → `!shape.isLocked && type === "mtg-counter"`.
- `canRemoveChildrenOfType(_shape, type)` → `type === "mtg-counter"`. The default is `true` for
  ALL types — without this gate, dragging card A across card B fires
  `B.onDragShapesOut(B, [cardA])`.
- `onDragShapesIn(card, shapes)` — live reparent during the drag (the frame pattern), guarded by
  `hasAncestor`. **Then it zeroes each dropped counter's local rotation**: `reparentShapes`
  preserves *page* rotation, so a counter dropped on an already-tapped card would keep a
  compensating local rotation forever — visibly tilted after the card untaps. Zeroing uses the
  same center-preserving `halfExtent`/`center`/`topLeft` math as `onClick`'s tap pivot (watch
  point 4), because rotation pivots around the top-left corner.
- `onDragShapesOut(card, shapes, info)` — reparents to the page only the dragged shapes that are
  currently THIS card's children (`shapes.filter(s => s.parentId === card.id)` — the frame-style
  filter; a multi-shape drag containing someone else's counter must not be touched), and only
  when `!info.nextDraggingOverShapeId` (dragging card-to-card is a hand-off, not a detach).

### Battlefield-exit eviction

`NON_BATTLEFIELD_ZONES = {graveyard, exile, library}` — **NOT the stack, deliberately**: cards
ARRIVE on the Stack (`zoneHint`), so their first settled move fires a *stack* zone-entry, and
including it would strip counters attached there. Found empirically — the plan's first draft
included stack, and the Playwright test caught it.

Eviction is driven from the *card's* `onTranslateEnd` (zone-change branch, after the debounce)
because **a parented shape's own `onTranslateEnd` never fires when only its parent moves**.
`evictCounters` reparents the counters to the page and `editor.animateShapes` them to spots from
`findOpenSpotsNearZoneEdge` — a new pure-geometry seam
(`apps/tabletop/src/client/shapes/openSpotNearZoneEdge.ts`, no `Editor`, unit-tested in
`test/openSpotNearZoneEdge.test.ts`): nearest zone edge to where the card entered, slots
alternating outward (+1, −1, +2, −2…), "occupied" considering only `mtg-card`/`mtg-counter`
bounds — furniture is fair ground to sit on. Overlap beats failure: a hopelessly crowded table
stacks counters on the anchor slot rather than dropping them inside the zone.

`zoneAt()` was refactored to return the full `ZoneHit` (`{id, zone}`) instead of just the zone
string, because eviction needs the zone shape's page bounds.

### Creation: `MtgCounterTool` — the first custom tool

`apps/tabletop/src/client/shapes/MtgCounterTool.ts`, a `StateNode` with `id "mtg-counter"`:
click-to-place one counter, then back to the select tool. Registered in `TablePage.tsx` via
**three UI pieces**: `<Tldraw tools={[MtgCounterTool]}>`, `uiOverrides.tools` (adds the toolbar
item), and a custom `Toolbar` component (`ToolbarWithCounter`, prepending a `TldrawUiMenuItem`
to `DefaultToolbarContent`) passed through `components`. Sync registration is the usual three
places: the `useSync` `shapeUtils` const, `<Tldraw shapeUtils>`, and `rooms.ts`'s
`createTLSchema` shapes map.

### Ride-along tap catch-up: a passenger animating its host's tap needs to read the store, not the `shape` argument (added 2026-08-10)

Ticket 15's tap catch-up (`65276e6`) is a purely local WAAPI illusion on the CARD's own
`.tl-image-container`, keyed off `props.tapped` changing — it has no equivalent for a hosted
`mtg-counter`, which has no `props.tapped` of its own. tldraw already composes the host's
rotation into the counter's page transform for free (the "tilt along" visual above), so the
counter's *position* was never wrong; what was missing was replaying the *card's own* 500ms
ease-out illusion on the counter's *own* DOM node, or it just snapped to the new angle a frame
before the card's div started easing back.

`MtgCounterShapeUtil.component()` now has a second `useValue`, `hostCardTapped`, whose selector
does two chained store reads: `this.editor.getShape(shape.id)` for this counter's own current
record (to get a fresh `parentId`), then `this.editor.getShape(parentId)` for the host's
`props.tapped`. A `useLayoutEffect` keyed on that value plays the identical
counter-rotate-then-ease-to-0 animation (500ms, ease-out) on the same `rideAlongRef`
`.tl-image-container` div the pointer-events fix already wraps content in — seeded with the
mount-time value via a `prevHostTappedRef`, exactly like the card's own `prevTappedRef`, so
arriving already attached to a tapped card, or being dragged onto/off a card (a
defined↔undefined transition), doesn't spuriously animate; only an actual tapped-value flip on
an already-attached host does.

**New general fact about `component()`'s reactivity, not specific to counters**: a ShapeUtil's
`component(shape)` is only re-invoked with a *fresh* `shape` object when that shape's own
`props` change. A bare `parentId`/`x`/`y`/`rotation` write — which is exactly what a drag-attach
or a host's tap produces — is applied to the wrapping page-transform outside React and never
triggers a re-render. So closing over `shape.parentId` (or any field on the outer `shape`
argument other than `props`) inside a `useValue` selector captures a value frozen at whatever
the shape's last props-triggered render saw — it will not update on reparent or on watching an
ancestor's props change. The fix, demonstrated here: read the shape fresh from the editor
*inside* the selector (`this.editor.getShape(shape.id)`), not from the closed-over argument —
that's a genuine reactive signal read through the store, so `useValue` correctly re-runs whenever
the underlying record (or, chained, its parent's record) changes. Any future passenger-side hook
that needs to react to its *own* current parentId, or to an ancestor's props, needs this same
"read the editor inside the selector" shape. New watch point 20 in `interactions.md`.

### Playwright facts discovered (belong to anyone testing shapes)

- **A creation click followed within tldraw's double-click window by a grab at the same point
  classifies as a double-click and opens editing.** Tests need a ~500ms cooldown after creating
  a shape before dragging it (`verify-counter.spec.ts`'s `createCounter` helper).
- **`.nth()` on shape testids is paint order, and paint order changes when a shape reparents** —
  drag from known creation points instead of trusting locator index stability across a reparent.
- **At low zoom, a nearby passenger's hit-test margin can steal a click aimed at the card's
  exact center — even though `document.elementFromPoint` says "card."** (Found 2026-08-10,
  fixing the ride-along tap-catch-up bug above.) tldraw's own hit-test
  (`editor.getShapeAtPoint`/`getHoveredShapeId`) grows a shape's `hitTestMargin` in page-space as
  zoom decreases (`hitTestMargin / zoomLevel`); after a whole-table `zoomToFit`, a counter
  attached near a card's center can have a hit-test region reaching the card's own center pixel,
  so a `page.mouse.click()` there resolves to the counter, not the card, inside tldraw's own
  click handling — a pure test-construction hazard, not a product bug. `verify-counter.spec.ts`'s
  `topGrip()` helper (grab the card's top ~12% instead of center) already exists for exactly this
  reason; `verify-tap-animation.spec.ts` reuses the same pattern for its counter test. Any test
  that taps/clicks a card that has (or might have) a counter/note/passenger-card attached should
  grab near the top edge, not the center, especially at non-1:1 zoom.

## Ticket 19: notes ride along like counters — a stock ShapeUtil gains this owner's cleanup hook via subclass (landed 2026-08-10)

`.scratch/tabletop-physics/issues/19-notes.md`. Generalizes ticket 18's counter-hosting into a
"passenger" concept: `MtgCardShapeUtil`'s `canReceiveNewChildrenOfType`/`canRemoveChildrenOfType`
are now keyed on `PASSENGER_TYPES = new Set(["mtg-counter", "note"])` instead of a bare
`type === "mtg-counter"` check, and `evictCounters` is renamed `evictPassengers`. Notes attach to
cards, ride along, detach on battlefield exit — the exact mechanics ticket 18 built for counters,
now shared with tldraw's own stock `note` shape.

### The gap this owner's `-review` caught: a stock shape has no hook to clear its own selection

Adding `"note"` to the accept-list alone would have reopened watch point 1's drag-identity bug for
notes: stock tldraw's `NoteShapeUtil` defines no `onTranslateEnd`, so nothing clears a note's
selection after it's dragged. The next card drag would then hit exactly the stale-selection hazard
this KB has now documented three times over (drag-settle, the multi-untap click-batch, context-menu
close) — a fourth entry point, this time via a shape this owner doesn't control the source of.

### The fix: subclass the stock `ShapeUtil`, override only the missing hook

`apps/tabletop/src/client/shapes/SelectionClearingNoteShapeUtil.ts`:

```
import { NoteShapeUtil, TLNoteShape, TLShapePartial } from "tldraw";

export class SelectionClearingNoteShapeUtil extends NoteShapeUtil {
  override onTranslateEnd(): TLShapePartial<TLNoteShape> | undefined {
    this.editor.setSelectedShapes([]);
    return undefined;
  }
}
```

Everything else — rendering, double-click editing, `growY` auto-sizing, tldraw's own migrations —
stays exactly as tldraw ships it; only the one missing hook is added. **New reusable precedent for
this KB**: when a *stock* tldraw shape needs one of this owner's cleanup obligations and tldraw
gives no other extension point for it, subclass the stock `ShapeUtil` rather than reimplementing
the shape from scratch. This is a materially cheaper move than ticket 12/13's "own custom shape
type from the ground up" rewrite — appropriate here because notes need none of `mtg-card`'s or
`mtg-zone`'s domain-specific behavior, only this one piece of selection hygiene.

### The registration gotcha this surfaced: `useSync` throws on a duplicate `type`, `<Tldraw>` doesn't

Registering the subclass needs it to **replace** the stock `NoteShapeUtil` in the `shapeUtils`
array passed to `useSync` — not merely join it alongside. The two consumers of that array disagree
on how strict they are about a duplicate `type` string:

- `<Tldraw shapeUtils={...}>` merges via `mergeArraysAndReplaceDefaults` against
  `defaultShapeUtils` — last-wins, tolerant of a duplicate.
- `useSync`'s schema builder (`createTLSchemaFromUtils`) does **not** tolerate one: it throws
  `"Shape type 'note' is defined more than once"` at runtime if `defaultShapeUtils` is spread in
  (bringing the stock `NoteShapeUtil`) *and* `SelectionClearingNoteShapeUtil` is added separately
  without filtering the stock one out first.

Fixed in `apps/tabletop/src/client/TablePage.tsx`:
```
const shapeUtils = [
  ...defaultShapeUtils.filter((Util) => Util.type !== "note"),
  MtgCardShapeUtil, MtgZoneShapeUtil, MtgCounterShapeUtil,
  SelectionClearingNoteShapeUtil,
];
```
This is a new twist on watch point 6's registration recipe: replacing (not just adding to) a stock
shape's util needs the stock one filtered out of the `defaultShapeUtils` spread *before* the
replacement goes in — and the two array consumers' differing strictness about duplicates means this
bug surfaces at runtime (a thrown schema error), not at compile time.

### Generalizing to geometry instead of `props.w/h`

A stock `note`'s size comes from a style enum plus `growY`, not `w`/`h` props — so the counter-only
code that read `shape.props.w`/`shape.props.h` (in `onDragShapesIn`'s rotation-zeroing and in the
old `evictCounters`) doesn't generalize to it. Both now use
`this.editor.getShapeGeometry(shape).bounds`, which works for any `ShapeUtil` regardless of base
class or how it derives its own size.

### Regression test

`apps/tabletop/test/verification/verify-note.spec.ts` mirrors `verify-counter.spec.ts`'s
Hazard-A/stale-selection test: "after dragging a note, dragging a card moves the card
(stale-selection regression)" — drags a note (deliberately leaving it selected, with **no**
test-side `deselectAll` cleanup — the point is to prove the *product* clears selection, not the
test), then drags the card, and asserts the card moved rather than the note. Confirmed red without
the `SelectionClearingNoteShapeUtil` swap (the card didn't move — the note absorbed the drag
instead), green with it. Three other tests in the same file cover attach/ride/detach and
battlefield-exit eviction, exercising the same passenger mechanics ticket 18's counter tests do.

## Ticket 20: cards can tuck behind cards — a third passenger type that is NOT cosmetic (landed 2026-08-10)

`.scratch/tabletop-physics/issues/20-cards-behind-cards.md`. `PASSENGER_TYPES` widens a third time
— `new Set(["mtg-counter", "note", "mtg-card"])` — so a card can host another `mtg-card` the same
way it hosts counters and notes: pure tldraw parenting, mediated by the same drag hooks, no new
mechanism. Z-order control ("send backward"/"send to back" for the tucked card) is free from the
pre-existing `ReorderMenuSubmenu` (sibling z-order under a shared parent).

The one thing that isn't free: a counter or note tilting along with its tapped host is the
*intended* look (ticket 18); a tucked card visibly spinning every time its host taps is not — a
card's rotation is `props.tapped`'s visual encoding, not decoration, and its printed face is
something a player is tracking. Every new mechanism below exists to keep a tucked card's page
position and rotation fixed across the host's tap.

### Why a bare counter-rotation isn't enough: `(x, y)` is the rotation pivot, and it belongs to the parent's frame

Derived from `node_modules/@tldraw/editor`'s `Editor.ts` before writing any code, not guessed:
`getShapePageTransform` composes as `Mat.Compose(parentPageTransform,
getShapeLocalTransform(shape))`, and `getShapeLocalTransform` = `Mat.Identity().translate(x,y)
.rotate(rotation)` — rotation is applied first, around the *local* origin, then the shape is
translated. So a shape's own stored `(x, y)` is literally the fixed point its own rotation pivots
around (this is the source-level derivation of watch point 4's "rotation pivots around x,y, not
center," previously known only empirically). The consequence for a **child**: its local `(x, y)`
lives in its **parent's own local frame** — so when the parent's rotation changes (a tap), a
child that isn't centered on the parent's own pivot point doesn't just spin along, it *orbits*,
because `tapPartial`'s center-preserving pivot math already moves the host's `(x, y)` as part of
the tap write, and the child inherits that translation through the parent transform. A passenger
is rarely centered on its host — this is the common case, not an edge case — so a bare
counter-rotation on the passenger would leave it visibly swinging around the host's pivot.

### The fix: solve the passenger's new local pose from matrix composition, not a rotation delta

`apps/tabletop/src/client/shapes/cardTap.ts`'s new `passengerTapCompensation(passenger, oldHost,
newHost)`: the passenger's *page* transform must stay fixed across the host's tap, i.e.
`newHostLocalMat · newPassengerLocalMat == oldHostLocalMat · oldPassengerLocalMat`, so
`newPassengerLocalMat = newHostLocalMat⁻¹ · oldHostLocalMat · oldPassengerLocalMat`. Implemented
with tldraw's own `Mat` class (`localMat(pose) = Mat.Identity().translate(pose.x, pose.y)
.rotate(pose.rotation)`, matching `getShapeLocalTransform` exactly) — `.invert().multiply(...)
.multiply(...).decompose()` gives back the passenger's new local `x`/`y`/`rotation` directly. Pure
— no `Editor` argument — unit-tested in `apps/tabletop/test/passengerTapCompensation.test.ts`
without a store. `passengerCompensationPartials(editor, oldHost, newHost)` walks
`editor.getSortedChildIdsForParent(oldHost.id)`, filters to `type === "mtg-card"` children only
(counters/notes are untouched — their tilt-along is still ticket 18's intended visual), and maps
each through the solve. `tapPartialsForCards` (the function shared by `MtgCardShapeUtil.onClick`'s
multi-select propagation and the context menu's Tap/Untap item, since ticket 17) now calls this
for every card it taps, in the same batch as the tap writes themselves.

`MtgCardShapeUtil.onClick` was also loosened to always run its `queueMicrotask` propagation block
(previously gated on "other cards are selected") — ticket 20 needs it to fire even for a solo
click, so the clicked card's own passenger compensation lands in the same undo entry via the same
mechanism ticket 16 established (see that section above; the ordering facts are unchanged).

### Two existing hooks needed a `mtg-card` exemption, both for the same reason: rotation is not decoration on a card

- **`onDragShapesIn`'s zero-rotation-on-attach loop** (ticket 18, watch point 12) holds a
  counter/note's center fixed while zeroing its local rotation, for the "card-aligned on drop"
  look. That's wrong for a card passenger: `reparentShapes` preserves *page* rotation across the
  reparent, and for a card that page rotation *is* its tapped-state visual. Zeroing it would untap
  a tapped card's look while `props.tapped` stayed `true` — a silent disagreement between what the
  card shows and what it is. Fixed: the loop now skips `dropped.type === "mtg-card"` entirely,
  leaving `reparentShapes`' rotation-preservation as the whole story for a tucked card's initial
  look.
- **`evictPassengers`' `animateShapes` call** hardcoded `rotation: 0` for every evicted passenger
  — right for counters/notes (no host to be "relative to" anymore, upright is the natural rest
  state), wrong for a card for the identical reason. Fixed: a card passenger's `animateShapes`
  partial now reads its *current* (post-reparent, tapped-state-correct) rotation from a fresh
  `getShape` lookup instead of a hardcoded `0`; counters/notes are unaffected.

### The dedup problem: a passenger multi-selected alongside its own host must not get a stale ride-along on top of its own direct tap

Ticket 16's multi-select propagation and ticket 20's passenger compensation both write into the
same `updateShapes` batch, and they can target the same shape two different ways: a card that is
simultaneously (a) a passenger of some host being tapped in this gesture, and (b) directly
selected and tapped in the same gesture. Without a guard, it would get both its own direct
`tapPartial` (correct) and a stale ride-along `passengerTapCompensation` computed against the old
host pose (wrong, and which one "wins" depends on batch array order — silent and
non-deterministic). Fixed by computing a `directIds` set — every card directly in the tap batch —
and filtering compensation partials against it before appending them, in two places that both
need it independently: `cardTap.ts`'s `tapPartialsForCards` (its own internal `cards` argument)
and `MtgCardShapeUtil.onClick` (the clicked card plus its `queueMicrotask`-propagated selection).

### New tldraw facts, beyond the transform-composition one above

- **`onDragShapesIn`/`onDragShapesOut` fire only for `DragAndDropManager`'s top-level
  `shapesToActuallyMove`** — a passenger whose *host* is what's being dragged never itself enters
  that set; its move is 100% free page-transform composition through the parent, no hook call
  involved. And `animateShapes` never triggers `onTranslateEnd` (confirmed via
  `getChangesToTranslateShape`'s call sites — only nudge/align/distribute/stack/pack use it, the
  animation manager doesn't) — so `evictPassengers`' animated relocation of a passenger that
  itself hosts grandchildren (a passenger card with its own tucked passenger) can't cascade a
  spurious zone-entry/eviction chain through a chained `onTranslateEnd`.
- **`hasAncestor(card, id)` recurses the full ancestor chain, not one level** — the existing
  cycle guard at the top of `onDragShapesIn` (`shapes.some((s) => this.editor.hasAncestor(card,
  s.id))`) was dead code before this ticket (counters/notes can never have children), and is now
  genuinely load-bearing: without it, a card could be dragged onto its own descendant (a card
  tucked under a card tucked under it), forming a parenting cycle.

### Playwright fact worth generalizing beyond this one spec

Dropping two cards via `zoneHint: "stack"` puts same-seat cards only ~36px apart in page units —
at zoom-to-fit they render almost fully overlapping on screen, reliably triggering the tldraw
`PointingShape` stale-selection hazard (watch point 1) for the *test's own drags*, not a product
bug. `verify-cards-behind-cards.spec.ts` uses `zoneHint: "battlefield"` instead (spaced slots) and
pulls the grab/click point well clear of any overlap — a few px of gap isn't reliably enough
headroom against tldraw's hit-testing tolerance.

### Registration

No new registration step: `mtg-card` was already registered (ticket 12), and `PASSENGER_TYPES` is
a plain client-side `Set`, not part of the tldraw schema — widening it needed no client/server
schema change, unlike adding a genuinely new shape type (watch point 6).

## Ticket 16: multi-untap — clicking one selected card taps the whole selection (landed 2026-08-09, `626ab6f`)

`.scratch/tabletop-physics/issues/16-multi-untap.md` (plan in `plan-16.md`). With several cards
marquee-selected, clicking one propagates that card's **new** tapped state to every other
selected `mtg-card` — a **state push, not a per-card toggle**, so a mixed selection converges
(untapped B clicked → tapped B *and* tapped C, even though C was already tapped). All in
`MtgCardShapeUtil.onClick`; no new hooks, no new files beyond the test.

### The two ordering facts the implementation stands on

1. **The clicked card's own partial must still be RETURNED synchronously.** When `onClick`
   returns a change, `PointingShape.onPointerUp` early-returns — which is what lets the marquee
   selection *survive* the click. Returning `undefined` falls through to tldraw's selection
   logic, which collapses the selection to the clicked card. So the propagation cannot simply
   be "batch everything in one deferred write": the clicked card's change rides the synchronous
   return, the others ride the microtask.

2. **A `queueMicrotask` write from inside `onClick` coalesces into the SAME undo entry as the
   clicked card's change — the KB's first documented microtask-vs-undo case, confirmed
   empirically.** `PointingShape.onPointerUp` calls `markHistoryStoppingPoint('shape on click')`
   and *then* `updateShapes([change])`, both AFTER `onClick` returns. A *synchronous* write
   inside `onClick` would land BEFORE that mark and fuse into the *previous* undo entry; the
   microtask runs after the whole pointer-up handler — after the mark — so the propagated
   writes join the clicked card's change in one new entry. Result: **one Ctrl+Z reverts the
   whole multi-tap gesture** and leaves an earlier unrelated tap untouched. The code comment
   warns never to "upgrade" `queueMicrotask` to `setTimeout` — a macrotask can interleave with
   other input events. `verify-multi-untap.spec.ts` is the standing tripwire for a tldraw
   upgrade reordering any of this (see watch point 14).

### The propagation batch is defensive per card

Inside the microtask, each other selected id is **re-fetched fresh** via `editor.getShape(id)`
(the clicked card's update — and possibly remote changes — applied between `onClick` and the
microtask), skipped if deleted or not an `mtg-card` (a marquee can catch counters and other
shapes), and **skipped entirely if already at the target tapped state** — rotation is a delta
(watch point 4), so applying ±90° to an already-correct card would corrupt its free rotation.
Survivors get `tapPartial(card, tapped)` and land in one `updateShapes` batch.

`tapPartial(shape, tapped)` is the extracted center-fixed pivot solve formerly inline in
`onClick`, now used by both the synchronous return and the microtask batch. Note
`onDragShapesIn` still has its own inline copy of the same pivot math (for counter rotation
zeroing) — three conceptual call sites of that math exist, two via `tapPartial`.

### Boundaries and non-findings

- **Multi-untap only works marquee-then-click, by design of watch point 1's cleanup.**
  `onTranslateEnd`'s unconditional `setSelectedShapes([])` means a *drag* clears the selection
  — so there is no "drag a group somewhere then click to tap them all" flow. Untouched by this
  ticket, and the two features coexist fine; just know the gesture order matters.
- **Two-client undo independence verified** (`verify-multi-untap.spec.ts`'s third test): a
  remote peer's Ctrl+Z after another player's multi-untap is a no-op — remote sync changes
  never enter the local `HistoryManager` — while the acting player's own Ctrl+Z still reverts
  and syncs out.
- **Shift-click was NOT investigated** (out of scope for the ticket). The observation from the
  `-context` consult stands unconfirmed-but-likely: shift-clicking an `onClick`-bearing card
  probably taps it instead of extending the selection, per `PointingShape.ts` line ~93
  ordering. If someone wants shift-click-extend on cards, that's its own investigation.

## Ticket 17: first custom `ContextMenu` — right-click selection outlives the menu (landed 2026-08-09, `eb24a4f`/`ff5d58a`)

`.scratch/tabletop-physics/issues/17-flip-and-face-down.md` (plan in `plan-17.md`) added Flip,
Turn face down/up, and Tap/Untap as right-click menu items on `mtg-card`. Face/flip semantics
(what `faceDown`/`face` mean, the library-entry reset) are `two-faced-cards` territory; this
owner's stake is the **new interaction surface** — a context menu — and one hazard it reopens.

### Wiring: `TLComponents.ContextMenu`, children replace rather than add

`apps/tabletop/src/client/TablePage.tsx` passes `ContextMenu: TableContextMenu` in the
`components: TLComponents` object already used for `Toolbar`. `TableContextMenu`
(`apps/tabletop/src/client/CardContextMenu.tsx`) wraps tldraw's `DefaultContextMenu`:

```
<DefaultContextMenu {...props}>
  <CardMenuItems />                                    {/* new: mtg-card-actions group */}
  <TldrawUiMenuGroup id="modify"><ReorderMenuSubmenu /></TldrawUiMenuGroup>
  <ClipboardMenuGroup />
</DefaultContextMenu>
```

**The load-bearing fact for anyone touching this next**: `DefaultContextMenu`'s `children` prop
*replaces* `<DefaultContextMenuContent />` entirely — there is no additive slot, no way to render
the stock content plus extra items. Whatever isn't explicitly re-added is gone. Ticket 17
(Jess's explicit curation, recorded in the file's own doc comment) kept only `ReorderMenuSubmenu`
and `ClipboardMenuGroup` (Cut/Copy/Paste/Duplicate/Delete) and dropped `EditMenuSubmenu`
(Lock/Unlock), `ArrangeMenuSubmenu`, `MoveToPageMenu`, `ConversionsMenuGroup`, `SelectAllMenuItem`,
and `CursorChatItem`. **Losing Lock/Unlock here is a real capability loss worth naming**: per this
owner's own KB (watch point 7, `mtg-zone`'s "locked and stays that way" design), furniture is the
only thing that's ever locked, and zones mint locked and never expose an unlock affordance of
their own — tldraw's stock context-menu Lock/Unlock was the *only* unlock path documented
anywhere in this KB. Dropping it doesn't break anything today (nothing needs to unlock a zone),
but the next feature that wants to unlock furniture will find there is no menu item for it
anymore and will need to either restore `EditMenuSubmenu` or build a bespoke affordance.

### `CardMenuItems`: reads selection reactively, writes through one `commit()` helper

`CardMenuItems` calls `useEditor()` + `useValue(() => editor.getSelectedShapes().filter(type ===
"mtg-card"), [editor])` and renders `null` when the selection has no card — the menu's card
actions simply don't appear on a right-click over a zone or counter. Each action funnels through:

```
function commit(partials: TLShapePartial<MtgCardShape>[], label: string) {
  if (partials.length === 0) return;
  editor.markHistoryStoppingPoint(label);
  editor.updateShapes(partials);
  editor.setSelectedShapes([]);
}
```

### The hazard: right-click selects, and an unlocked card's selection survives menu close

Right-clicking a card runs it through the same `PointingShape`/selection machinery a left-click
does — the card becomes selected. `DefaultContextMenu`'s close callback clears selection for a
**locked** shape (tldraw's own behavior, presumably because a locked shape's context menu is the
only way it ever gets selected at all) but does **not** clear an **unlocked** shape's selection
when the menu closes without an action, or after most actions either. Without `commit()`'s
trailing `editor.setSelectedShapes([])`, a right-click-then-flip (or right-click-then-dismiss)
would leave the card selected exactly the way `onTranslateEnd`'s pre-existing
`setSelectedShapes([])` workaround exists to prevent after a drag (watch point 1) — the *next*
drag of a *different* card would silently hijack this one instead, because
`startTranslating`'s safety net only force-reselects when nothing is currently selected. `commit`
clears selection unconditionally after every menu action for exactly this reason — the same fix
as watch point 1, applied at a second gesture's exit point instead of the drag's.

**New watch point 15** records this as a second entry point into watch point 1's family of
hazards, alongside drag-settle (watch point 1) and multi-untap's click-batch (watch point 14):
context menu actions.

### `tapPartial` extracted to a standalone function

The Tap/Untap menu item needs the same center-fixed pivot math `MtgCardShapeUtil.onClick` already
used, but a menu item has no `this.editor` or ShapeUtil instance to call a private method on.
`tapPartial` (the pivot solve, previously a private method on `MtgCardShapeUtil`) moved to
`apps/tabletop/src/client/shapes/cardTap.ts` as a standalone pure function — verified pure during
review (reads only `shape.rotation`/`shape.props.{w,h}`, the module-level `TAP_ANGLE`, and the
imported `Vec` helper) — no behavior change. Both `onClick`'s synchronous return and its
`queueMicrotask` multi-select-propagation loop (ticket 16) now call the imported `tapPartial`
instead of `this.tapPartial`. This is now the third call site referencing the pivot math
(`onClick`, the context menu, `onDragShapesIn`'s inline copy for counter rotation-zeroing) — two
of the three share the extracted function.

### Regression test

`apps/tabletop/test/verification/verify-flip-face-down.spec.ts` — "flipping card A does not leave
a stale selection that hijacks a later drag of card B." Right-clicks card A, flips it via the
context menu, then drags card B, and asserts B (not A) moved. Failed before `commit`'s trailing
`setSelectedShapes([])` was added, passes after — the same shape of proof `verify-drag-identity`
established for the drag-only version of this bug.

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

## Table-layout ticket 18: commander arrives with owner and ghost — second mint seam, shared builder, decoy pattern

`.scratch/tabletop-physics/issues/18-commander-arrives-with-owner-and-ghost.md` (landed
2026-08-09). Three changes, only the second and third of which are this owner's territory (the
first — `owner`/`isCommander` becoming validated `MtgCardShapeProps` fields — is a fact the shape
carries, not a mechanic; it grants no capability and adds no hook):

- **A second mint seam.** `apps/tabletop/src/server/seatJoined.ts` now mints `mtg-card` shapes
  directly, via `entry.room.updateStore`, the same inline-`store.put` style `cardArrival.ts` uses
  — one seat.joined event carrying 0-2 commanders mints each commander plus its ghost (below).
  Identity minting was previously a one-seam fact this KB stated flatly ("minted once ... never
  elsewhere"); it's now two known seams, never a third. See "The `mtgCardShape()` builder" and
  watch point 15.
- **The `mtgCardShape()` builder** (`apps/tabletop/src/server/tableFurniture.ts`, next to the
  existing `zoneShape()` helper): both mint seams now call this instead of writing their own
  `store.put({...} as any)` literal. It's the single place every required `mtg-card` prop is
  listed — `MtgCardShapeArgs` mirrors `MtgCardShapeProps` — so a future required prop is added
  once, here, rather than drifting across two hand-written literals. See watch point 15.
- **The ghost mechanism** — a decoy shape sharing a type with the real thing, this KB's first
  example of that pattern. `seatJoined.ts` mints each commander as *two* `mtg-card` shapes at the
  identical Command Zone position: the real, draggable card (`isLocked: false`, default opacity),
  and a locked, faded ghost (`instanceId: `ghost:${instanceId}`\`, `isLocked: true`, `opacity:
  0.3`) that stays behind when the real card is dragged away, marking the spot as "this is where
  your commander lives." The ghost is minted via `nextIndex()` *before* the real card in the same
  `updateStore` call, so its `IndexKey` sorts lower and the real card paints on top — same
  topmost-wins z-order mechanism `topmostZoneAt()` uses for overlapping zones (watch point 8),
  applied here to two cards instead of two zones. The `ghost:` prefix keeps its `instanceId` a
  distinct string from the real card's, confirmed safe against `cardArrival.ts`'s
  `instanceAlreadyOnTable` dedup (exact-string match on `props.instanceId`). `isLocked: true` alone
  is sufficient to make the ghost fully inert to clicks, drags, selection, and counter-hosting —
  no new guard needed — because watch point 7's already-established chain (`SelectTool`'s `Idle`
  gates `isLocked` before `PointingShape`; `Editor.getDraggingOverShape` filters `!isLocked`)
  applies to *any* locked `mtg-card` exactly as it does to `mtg-zone`. `apps/tabletop/
  test/seatJoined.test.ts`'s "seat joined — commanders" describe block asserts the ghost's
  `isLocked`/`opacity`/index-ordering/distinct-instanceId facts at the data level; it does not
  drive a live pointer at the ghost, so the click-transparency claim rests on watch point 7's
  tldraw-source reading, not a fresh Playwright probe. See watch point 16 for the pattern written
  up generally.

Full detail in `interactions.md` (Shape identity section rewritten, new watch points 15-16) and
`history.md`.

## How to tell this owner's territory from `two-faced-cards`'s

If the question is "why does clicking/dragging/tapping do the wrong thing, or hit the wrong
shape" — this owner. If the question is "why does the card show the wrong image/face" — that's
`two-faced-cards`. A single file (`MtgCardShapeUtil.tsx`) serves both concerns; don't let that
fool you into consulting both owners for every change to it. See
`owners/two-faced-cards/interactions.md` watch point 16 for the cross-reference the other
direction.
