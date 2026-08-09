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
  the rewrite.
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

## `mtg-counter`: decided, not built (table-layout ticket 12, 2026-08-08)

`.scratch/tabletop-table-layout/issues/12-life-totals-and-commander-damage.md` (resolved
2026-08-08 — note this is a *different* "ticket 12" from the `tabletop-physics` ticket 12 that
landed the `mtg-card` rewrite) decided that a life counter is a **third custom shape type**,
working name `mtg-counter`: **locked furniture** whose `component()` renders a number with +/-
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
  pointer-events item. `mtg-counter` will be the first *locked* shape to exercise it: `mtg-zone`
  skipped step 4 because nothing clicks it, but the condition was always "is the component's
  content interactive," never "is the shape unlocked."
- **The typeable number field must shield keystrokes from tldraw's tool hotkeys** — a focused
  input inside the canvas otherwise triggers tool switches (e.g. a digit or letter keypress) as
  the player types a life total.
- Watch point 1 (the `onClick` selection-deferral quirk) does **not** apply: locked shapes never
  reach `PointingShape`, and the counter's interactivity lives in DOM handlers, not a ShapeUtil
  `onClick`.

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
