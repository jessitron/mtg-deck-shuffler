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

**Ticket 01 (2026-08-11, organizational split — see "Ticket 01" section below for the full
writeup).** `apps/tabletop/src/client/shapes/MtgCardShapeUtil.tsx` is now a thin shell: it still
extends tldraw's `BaseBoxShapeUtil<MtgCardShape>` (not `ImageShapeUtil` — see "Ticket 12 landed"
below) and still declares every override below — the override's mere *presence* is load-bearing
regardless of its body, see the `onClick`-defers-selection quirk further down — but each override's
body now lives in a sibling file and is called with `this.editor` passed through explicitly. The
mechanics described in the rest of this section are unchanged in substance; only the file each
body lives in moved:

- **`onClick(shape)`** (body: `handleCardClick`, `cardTapClick.ts`) — tap/untap toggle (JES-144). Tap state lives in `props.tapped` (a real,
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
- **`onTranslateEnd(_initial, current)`** (body: `handleTranslateEnd`, `cardZoneEntry.ts`) — fires once, on the moved shape, when a drag settles.
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
  `onDragShapesOut`** (ticket 18; bodies: `canReceivePassenger`/`canRemovePassenger`/
  `handleDragShapesIn`/`handleDragShapesOut`, `cardPassengers.ts`) — the card is a drop target and
  host for `mtg-counter` shapes, via tldraw's native drag-and-drop parenting. See "Ticket 18" below
  for the gates' narrowing (load-bearing) and the rotation-zeroing math in `onDragShapesIn`.
- **`component(shape)` / `getIndicatorPath(shape)`** (bodies: `CardFace`/`cardIndicatorPath`,
  `cardRender.tsx`) — new, required by `BaseBoxShapeUtil`. The card renders its own `<img>` (front
  or back URL chosen from `props.face`) instead of delegating to tldraw's image machinery.

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

**Superseded, ticket 05 (2026-08-11).** The per-shape `onTranslateEnd`/`commit()` clear described
above is no longer how this is fixed — `MtgCardShapeUtil.onTranslateEnd`'s
`setSelectedShapes([])` call was deleted outright, along with the equivalent calls on
`MtgCounterShapeUtil` and inside `CardContextMenu.tsx`'s `commit()`. A single centralized
listener, `clearStaleSelectionOnPointerDown`, now does this for every shape type at once,
including stock shapes that never had a hook to hang the old fix on. The mechanism above (why
`onClick`'s presence defers selection, why `startTranslating`'s safety net only fires when nothing
is selected) is unchanged and still the reason the bug exists — only *where* the fix lives moved.
See "Ticket 05" below for the new mechanism and why the distributed approach couldn't reach every
case.

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

### Command zones only arm for their owner's commander (2026-08-10)

TODO.md item: "Only your own commanders can land in your command zone. Any other card dragged
over it, it shouldn't light up." Landed entirely inside `zoneHitTest.ts`, reusing props that
already existed: `owner`/`isCommander` on `mtg-card` (table-layout ticket 18) and `seatId` on
`mtg-zone` (present since ticket 13). No new state.

`ZoneHit` widened from `{id, zone}` to `{id, zone, seatId}` — `topmostZoneAt` now reads the
winning candidate's `props.seatId` too, since the new check needs it. `armedZoneIdSignal`'s
computed body gets one new branch, placed after `topmostZoneAt` resolves a hit and before
returning it:

```
if (hit.zone === "command" && !allDraggedCardsAreOwnersCommander(editor, hit.seatId)) {
  return undefined;
}
return hit.id;
```

`allDraggedCardsAreOwnersCommander(editor, seatId)` filters `editor.getSelectedShapes()` to
`shape.type === "mtg-card"`, returns `false` if the filtered list is empty, and otherwise requires
every one of them to satisfy `props.owner === seatId && props.isCommander`. Every non-`command`
zone type is untouched by this branch and keeps arming card-agnostically, exactly as ticket 14
left it.

This is a refinement of, not an exception to, the "one destination for the whole rigid group, or
none" principle the "Corrected, 2026-08-08" subsection above already established for multi-card
drags: a partial match (some selected cards qualify, some don't) still doesn't arm, the same
posture a multi-select drag toward any other zone already has. Confirmed during this owner's
`-review` that there's no selection-timing race: `editor.getSelectedShapes()` is read only once
`editor.isIn("select.translating")` is already true, i.e. after tldraw's own
`PointingShape`/`startTranslating` transition has settled which shapes are actually being
dragged — the same trust the surrounding code already places in reading
`editor.inputs.currentPagePoint` mid-drag.

See `interactions.md` watch point 19 for the "arming is no longer universally card-agnostic"
consequence, and `history.md` for the full changelog entry.

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

## The life counter: built (table-layout ticket 20, 2026-08-10) — named `mtg-life-counter`

**Naming collision, resolved 2026-08-08 by ticket 18 claiming the type string.** The
tabletop-physics spec assigns `mtg-counter` to the drag-onto-a-card counter, which ticket 18
built (see "Ticket 18" below) — an **unlocked, draggable, text-editable** shape, nearly the
opposite of the shape this section describes. The life counter is named `mtg-life-counter`
instead.

`.scratch/tabletop-table-layout/issues/12-life-totals-and-commander-damage.md` decided (2026-08-08)
that a life counter is a custom shape type: **locked furniture** whose `component()` renders a
number with +/- buttons and a directly-typeable number field. Everyone can press anyone's
buttons; state syncs as ordinary shape props. Ticket 20 (2026-08-10) built it:
`apps/tabletop/src/shared/mtgLifeCounterShape.ts` (`MtgLifeCounterShapeProps = {w, h, value}`,
the standard `TLGlobalShapePropsMap` augmentation) and
`apps/tabletop/src/client/shapes/MtgLifeCounterShapeUtil.tsx` (`BaseBoxShapeUtil`, no interaction
hooks — same as `mtg-zone`). Minted at seat-join time in `tableFurniture.ts`'s
`ensurePlayerArea`, on the name row, far right, via `lifeCounterPosition()`/`LIFE_COUNTER_W`/
`LIFE_COUNTER_H` in `cardLayout.ts`, starting at `value: 40`. Registered via the standard
four-step pattern (props file, `TablePage.tsx`'s `shapeUtils` array, `rooms.ts`'s
`createTLSchema`).

Three mechanics facts were established from tldraw source during the earlier `-context` consult
and confirmed correct by the build. **A fourth, load-bearing fact was found only during
implementation** and did not exist in this KB before — it belongs here as the "life counter"
section's headline fact from now on, since it's *specific to a locked shape whose own controls
write to its own props*, not just to "locked shapes can be interactive":

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
   Preferred over the older `stopEventPropagation` util. `MtgLifeCounterShapeUtil.tsx` follows
   this exactly for its +/- buttons and the input's `onPointerDown`.
3. **tldraw sync is last-writer-wins state replication, not a CRDT.** Simultaneous prop writes
   to the same shape can lose one increment. Accepted for counters — rare, and self-evident on
   screen. This is also why story-quality life-change records need an explicit event per press
   rather than diffing synced state; that work is parked at
   `.scratch/tabletop-replaces-mural/parked/life-change-events.md` for Map 5 ("The table
   reports").
4. **NEW — a locked shape's props are NOT freely writable via `editor.updateShape`/
   `updateShapes`, even from inside that shape's own `component()`.** This is a *separate* gate
   from fact 1 above. Fact 1 is about the gesture state machine — `SelectTool`/`PointingShape`/
   `getDraggingOverShape` never being reached for a locked shape. This new fact is about the
   **public `Editor.updateShapes` method itself** (not the internal `_updateShapes`), which
   silently filters out any partial that targets a locked shape, unless either (a) the partial
   itself sets `isLocked: false` (which unlocks it — not what a shape that must *stay* locked
   wants), or (b) the call is wrapped in `editor.run(fn, { ignoreShapeLock: true })`. Found the
   hard way: an early version of `setValue` called `this.editor.updateShape(...)` directly,
   following the `HyperlinkButton`/`mtg-counter` DOM-event pattern faithfully — it compiled, ran,
   and threw nothing, but the value silently never changed on screen. The fix, in
   `MtgLifeCounterShapeUtil.tsx`'s `setValue`:
   ```
   this.editor.run(
     () => this.editor.updateShape<MtgLifeCounterShape>({ id: shape.id, type: shape.type, props: { ...shape.props, value: next } }),
     { ignoreShapeLock: true },
   );
   ```
   **This is now THE load-bearing fact for "locked furniture with live controls that mutate
   their own props"** — any future locked shape whose buttons/inputs write to its own shape
   record (not just read/render, the way `mtg-zone`'s armed-glow computed does) needs this
   wrapper, or the write is a silent no-op with no exception and no console warning.

Watch point 1 (the `onClick` selection-deferral quirk) does **not** apply to the life counter:
locked shapes never reach `PointingShape`, and its interactivity lives entirely in DOM handlers,
not a ShapeUtil `onClick`. Watch point 6's step 4 (the pointer-events registration cost) applies
in full, as anticipated — but the life counter does NOT reuse tldraw's `.tl-image-container`
class the way `MtgCounterShapeUtil` does; see the new caution below.

### A second, smaller finding: don't reuse tldraw's own `.tl-image-container` class name just for its `pointer-events: all` side effect

`MtgCounterShapeUtil` wraps its content in a `<div className="tl-image-container">` to get
`pointer-events: all` "for free" from `tldraw.css`. `MtgLifeCounterShapeUtil` deliberately does
**not** do this — it sets `pointerEvents: "all"` inline instead, on a plain unstyled `<div>`.
Reusing the class would have broken
`apps/tabletop/test/verification/verify-image-selection.spec.ts`'s locator
(`` '[id^="shape\\:"]:not([id^="shape\\:card-"]) .tl-image-container' ``), which assumes every
non-card shape carrying that class IS a pasted image, for its stale-selection regression test —
confirmed by trying it first (2 matches instead of 1, even though the life counter itself worked
correctly). The class was never load-bearing for the `pointer-events: all` behavior — inline
style wins regardless — so setting it directly is sufficient and doesn't collide with tests (or
any future code) that key off tldraw's own class names for shape-type inference. **Any future
custom shape doing "wrap in `.tl-image-container` for the free pointer-events" should set the
style inline instead**, unless it actually IS meant to look like a pasted image to that
regression test.

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

### Playwright facts discovered (belong to anyone testing shapes)

- **A creation click followed within tldraw's double-click window by a grab at the same point
  classifies as a double-click and opens editing.** Tests need a ~500ms cooldown after creating
  a shape before dragging it (`verify-counter.spec.ts`'s `createCounter` helper).
- **`.nth()` on shape testids is paint order, and paint order changes when a shape reparents** —
  drag from known creation points instead of trusting locator index stability across a reparent.

## Furniture gets its own index band, below every card, by construction (2026-08-10)

`tableFurniture.ts` used to mint every shape — cards and furniture alike — through one per-room
counter, `nextIndex(tableName)`, an `IndexKey` chain built with `getIndexAbove(...)` off
`ZERO_INDEX_KEY`. Watch point 8 already established that overlapping shapes resolve their z-order
by comparing `IndexKey`s as plain strings, greatest wins. That tie-break is exactly what made a
late furniture mint dangerous: a seat joining after a card was already in play could mint a
playmat whose `IndexKey` sorted *above* that card's, so the card painted underneath its own
opponent's playmat — a bug, not a feature, discovered via a dragged card visually vanishing.

The fix adds a second per-room counter, `lowestFurnitureIndexByRoom`, and a
`nextFurnitureIndex(tableName)` function that calls `getIndexBelow(...)` (also from
`@tldraw/utils`) chained off `null` instead of `ZERO_INDEX_KEY`:

```
const lowestFurnitureIndexByRoom = new Map<string, IndexKey>();
function nextFurnitureIndex(tableName: string): IndexKey {
  const next = getIndexBelow(lowestFurnitureIndexByRoom.get(tableName) ?? null);
  lowestFurnitureIndexByRoom.set(tableName, next);
  return next;
}
```

**Why this is a structural guarantee, not a reassertion per move**: tldraw's fractional indexing
is lexicographic — `getIndexBelow(null)` and every key chained beneath it sort strictly below
`ZERO_INDEX_KEY` ("a0"), and every key `nextIndex`'s `getIndexAbove` chain ever produces starts at
or above `ZERO_INDEX_KEY`. The two sequences occupy disjoint, non-overlapping ranges of the same
ordering space, so no comparison between a furniture `index` and a card `index` can ever come out
the wrong way, regardless of which was minted first, second, or a hundredth. This is the first
time this KB's z-order reasoning has needed two bands instead of one shared sequence — watch
points 8 (topmost-zone tie-break) and 17 (ghost-under-real-card paint order) both still reason
correctly within a single band; they just never had to consider a second one before.

Every furniture-minting call site inside `ensurePlayerArea` and `ensureStackDrawn` — the playmat
outline, the playmat image, the library zone and its image, the command zone, the graveyard, the
exile zone, the seat name label, and the Stack — was switched from `nextIndex` to
`nextFurnitureIndex`. `nextIndex` itself needed no change and is now exclusively a card-minting
counter: `cardArrival.ts`'s ordinary arrivals and `seatJoined.ts`'s commander/ghost mints
(table-layout ticket 18) already only ever called it for `mtg-card` shapes.

**Nothing enforces the discipline at runtime.** There's no assertion tying a shape's `type` to
which counter minted its `index` — the invariant holds only because every current call site
respects the convention. A future furniture-minting call site added outside `ensurePlayerArea`/
`ensureStackDrawn` that calls `nextIndex` by habit would silently reopen this bug for that one
shape, with no compiler or test to catch it except a broad regression test noticing the symptom.
See `interactions.md` watch point 21.

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

## Ticket 05: one centralized listener replaces five distributed workaround sites (2026-08-11)

Every prior fix for watch point 1's
stale-selection quirk lived on the shape being dragged: `MtgCardShapeUtil.onTranslateEnd`,
`MtgCounterShapeUtil.onTranslateEnd`, `CardContextMenu.tsx`'s `commit()`, plus two ShapeUtil
subclasses that existed *solely* to carry the hook for stock shapes that had none of their own —
`SelectionClearingNoteShapeUtil` (ticket 19) and `SelectionClearingImageShapeUtil` (the
pasted-image fix, 2026-08-10). Five sites, one obligation, and — the reason this ticket exists —
a gap none of the five could structurally reach: `onTranslateEnd` fires only when a drag settles,
so a shape selected by a **plain click with no drag** (a stock `image`/`note`, selected
immediately on pointer-down since neither defines `onClick`) stays selected into the next drag of
a different `onClick`-bearing shape (a card), and no number of `onTranslateEnd` sites can close
that — there's no drag to settle.

All five sites are now deleted. The fix is one function,
`apps/tabletop/src/client/clearStaleSelectionOnPointerDown.ts`, registered once at Tldraw mount
time (`TablePage.tsx`'s `onTldrawMount`, renamed from `aimCameraAtTheTable` since it now does two
things at mount, not one):

```
export function clearStaleSelectionOnPointerDown(editor: Editor): void {
  editor.on("event", (info: TLEventInfo) => {
    if (info.type !== "pointer" || info.name !== "pointer_down" || info.target !== "canvas") return;
    const hitShape = getHitShapeOnCanvasPointerDown(editor);
    if (!hitShape) return;
    if (editor.getSelectedShapeIds().includes(hitShape.id)) return;
    editor.setSelectedShapes([]);
  });
}
```

On every `pointer_down`, it works out which shape (if any) the pointer actually landed on and, if
that shape isn't already part of the current selection, clears the selection right there — before
any later event in the same gesture (a drag-threshold `pointer_move`, or a plain click's
`pointer_up`) can act on stale state. This reaches the click-with-no-drag gap the five old sites
couldn't: the clear now happens at the START of the next gesture, keyed on what's actually under
the pointer, not at the END of the previous one, keyed on "did anything just get dragged."

### The gotcha that broke the first implementation attempt: `target: 'canvas'`, never `'shape'`

The first cut filtered `editor.on('event', ...)` on `info.target === 'shape'` — the
`TLPointerEventTarget` union's most obvious-looking case for "the pointer hit a shape." It
**typechecked, ran, and even passed the new spec** against that spec's own test shape — and still
broke `verify-drag-identity.spec.ts`'s drag-then-drag case outright (the second card failed to
move at all). Root cause, confirmed by both console-logging a live gesture and reading tldraw
source: a real DOM pointer-down is **always** dispatched to `Editor.dispatch`/`editor.emit('event',
...)` with `target: 'canvas'` — never `'shape'`. `SelectTool/childStates/Idle.onPointerDown`
(`node_modules/tldraw/src/lib/tools/SelectTool/childStates/Idle.ts`) does its own hit-test on that
canvas-target event and, when it hits a shape, **recurses into itself** with a
locally-constructed `{ ...info, target: 'shape', shape }` — that retargeted copy is internal to
the state chart and never travels back through `Editor.dispatch`. `editor.on('event', ...)` only
ever sees what was actually dispatched, so it can never observe `target: 'shape'` for a real
interaction — only `target: 'canvas'`.

**The fix had to do its own hit-test**, using the same public helper `Idle` itself calls:
`getHitShapeOnCanvasPointerDown` (exported from tldraw's package root, `@public`). This also
turned out to be the right helper for a second reason: it already honors
`editor.options.selectLockedShapes` (`false` by default), so a locked shape — every piece of this
table's furniture, `mtg-zone` included — never counts as "hit," matching `Idle`'s own gate for
free. No separate `isLocked` check was needed.

**Lesson for anyone else who reaches for `editor.on('event', ...)` in this app**: don't filter on
`TLPointerEventTarget`'s `'shape'` case from how the type looks — for a real pointer-down it never
fires. If you need "what shape did the pointer hit," call `getHitShapeOnCanvasPointerDown(editor)`
yourself on the `target: 'canvas'` event, the way `Idle` does internally. See `interactions.md`
watch point 24.

### Ordering: runs after `Editor.dispatch`, so it never fights `onEnter`'s own decision

`editor.on('event', ...)` fires once `Editor.dispatch` has already run the event through the
whole state chart for this tick (`_flushEventForTick` in `@tldraw/editor`) — so by the time this
listener runs, `PointingShape.onEnter` for this same pointer-down has already executed and already
made its own selection decision for the shape just hit. The listener never overrides that: if
`onEnter` already selected the hit shape (the common case — a stock shape with no `onClick`), this
listener's own hit-test finds that shape already in `getSelectedShapeIds()` and no-ops. It only
cleans up staleness left over from a **previous** gesture, never fighting the current one.

### Why `markEventAsHandled` callers (e.g. the life counter) are immune by construction

The life counter's +/- buttons call `editor.markEventAsHandled(e)` in their pointer handlers
(watch point 10/22's `HyperlinkButton` pattern). `useCanvasEvents.ts` checks
`wasEventAlreadyHandled` **before** ever calling `editor.dispatch` for that DOM event — so
`editor.emit('event', ...)` never fires at all for a press on one of those buttons. This new
centralized listener structurally cannot be disturbed by locked-shape UI that opts out of
`Editor.dispatch` this way; no special-casing was needed to keep the two features apart.

### Test coverage

`apps/tabletop/test/verification/verify-click-then-drag-selection.spec.ts` (new) reproduces
exactly the click-with-no-drag gap: drop a pasted image, click it once with **no** drag (tldraw
selects it immediately on pointer-down since stock `image` has no `onClick`), then drag a card,
and assert the card — not the image — moves. Confirmed red before the fix. Existing
selection-adjacent specs (`verify-drag-identity`, `verify-multi-untap`, `verify-image-selection`,
`verify-note`'s drag-then-drag case) all still pass unmodified, plus the full `./verify.sh` suite
and `npx vitest run`. A targeted regression assertion was also added to
`verify-life-counter.spec.ts` (pressing +/- doesn't clear an unrelated existing selection),
confirming the `markEventAsHandled` immunity above empirically, not just by source-reading.

## Ticket 01: `MtgCardShapeUtil.tsx` split by hook, organizational only (2026-08-11)

Worktree `ticket-01-split-cardshapeutil`. `MtgCardShapeUtil.tsx` had grown to 388 lines across 21
commits, holding every `ShapeUtil` hook's full body inline. The review that spawned this ticket
originally proposed a **CardPhysics/interop architectural split** — pull tldraw plumbing away from
domain rules into two layers.

**Grilling on the ticket found no clean seam of that kind exists in this file.** Every hook mixes
a tldraw quirk with a card-domain rule inseparably — `onClick` is tap/untap (domain) *and* the
`queueMicrotask` undo-coalescing trick that only exists because of `PointingShape.onPointerUp`'s
internal ordering (pure tldraw); `onTranslateEnd` is zone-entry (domain) *and* the debounce shape
tldraw's settle-once contract demands; `onDragShapesIn` is counter-attachment (domain) *and*
`reparentShapes`' page-rotation-preservation quirk (pure tldraw). Attempting the physics/interop
split would have meant inventing a boundary this file's actual logic doesn't have — exactly the
kind of false purity watch point 7's "no interaction hooks ≠ no interactivity" distinction already
warns against manufacturing.

**Jess's call was explicitly organizational instead**: split by hook, for navigability of a big,
long-lived file — not a domain/tldraw-purity boundary. Four sibling files, each taking `editor:
Editor` and the relevant shape(s) as explicit parameters instead of reading `this.editor` (the same
pattern `cardTap.ts`'s `tapPartial` already used, ticket 17):

- **`cardRender.tsx`** — `component()`'s JSX body (`CardFace({shape})`), `getIndicatorPath`'s body
  (`cardIndicatorPath(shape)`), and the tap catch-up `useLayoutEffect`.
- **`cardTapClick.ts`** — `onClick`'s full body (`handleCardClick(editor, shape)`), including
  ticket 16's `queueMicrotask` undo-coalescing trick for multi-untap propagation, preserved
  verbatim with its ordering-hazard comment.
- **`cardPassengers.ts`** — `PASSENGER_TYPES`, the two `can*` gates
  (`canReceivePassenger`/`canRemovePassenger`), and `onDragShapesIn`/`onDragShapesOut`'s bodies
  (`handleDragShapesIn`/`handleDragShapesOut(editor, ...)`), including the rotation-zeroing math
  for `reparentShapes`' page-rotation-preservation quirk.
- **`cardZoneEntry.ts`** — `NON_BATTLEFIELD_ZONES`, `onTranslateEnd`'s body
  (`handleTranslateEnd(editor, current)`), and its two former-private helpers `zoneAt`/
  `evictPassengers`, now module-level functions taking `editor` explicitly.

`MtgCardShapeUtil.tsx` itself shrank to 83 lines: still `extends BaseBoxShapeUtil<MtgCardShape>`,
still declares every override, each body now a one-line delegation. **The override's presence is
still what matters to tldraw**, regardless of how thin its body is — see "The tldraw quirk" section
above; nothing about that mechanism changed.

**Confirmed zero behavior change**: 110/110 vitest tests pass before and after; 43/44 Playwright
`verify.sh` specs pass before and after — the one failure, `verify-life-counter.spec.ts:102`,
reproduces identically on unmodified `main` (at the time, assumed pre-existing flakiness,
unrelated to this change — **corrected 2026-08-11: it was a deterministic furniture-image-count
bug, not a flake; see `history.md`'s "Correction" entry of that date**).

**What this means for future work in this file**: the four-way split is now the map — a hook's
mechanics live in its own sibling file, not in `MtgCardShapeUtil.tsx` itself. Every watch point and
mechanism this KB documents for `onClick`/`onTranslateEnd`/`onDragShapesIn`/`onDragShapesOut`
(the selection-deferral quirk, the undo-coalescing microtask, the rotation-zeroing math, the
zone-entry debounce) is unchanged in substance — only which file to open changed. Don't read this
split as an invitation to look for a physics/interop boundary elsewhere in this owner's territory;
the grilling finding above is specific to this file's actual coupling, not a general principle that
one doesn't exist.

## How to tell this owner's territory from `two-faced-cards`'s

If the question is "why does clicking/dragging/tapping do the wrong thing, or hit the wrong
shape" — this owner. If the question is "why does the card show the wrong image/face" — that's
`two-faced-cards`. Before ticket 01 (2026-08-11), a single file (`MtgCardShapeUtil.tsx`) served
both concerns; after the split, `two-faced-cards`'s territory (what image/face renders) lives
mostly in `cardRender.tsx`'s `CardFace` component, while this owner's territory (what responds to
the pointer) is spread across `MtgCardShapeUtil.tsx` (the shell) and `cardTapClick.ts`/
`cardPassengers.ts`/`cardZoneEntry.ts`. The file boundary now tracks the concern boundary more
closely than it used to, but it's still not exact — `cardRender.tsx`'s tap catch-up animation is
this owner's territory (it's about the *tap* gesture, not the *face*), living in the same file as
`CardFace`. Don't let file location alone decide which owner a question belongs to. See
`owners/two-faced-cards/interactions.md` watch point 16 for the cross-reference the other
direction.
