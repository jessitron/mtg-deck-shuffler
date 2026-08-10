# Interactions

## Depends On

### tldraw's `SelectTool` state machine (read-only dependency)
- `PointingShape` and `Translating` (`node_modules/tldraw/src/lib/tools/SelectTool/childStates/`)
  own selection and drag-start behavior; this owner's ShapeUtil hooks react to tldraw's
  decisions, never override tldraw's own state machine.
- tldraw ships its TypeScript source in `node_modules` — read it when behavior surprises you,
  same as `architecture.md`'s drag-bug writeup did. Don't guess from the compiled output or from
  the docs site; the actual guard conditions (e.g. `startTranslating`'s
  `!this.didSelectOnEnter && !this.editor.getSelectedShapeIds().length`) are the ground truth.
- **A tldraw version bump can change these internals without a major-version signal** — this
  owner has no test that would catch tldraw changing `PointingShape`'s logic; only the
  regression test (`verify-drag-identity.spec.ts`) would notice the *symptom* resurfacing, not
  the cause changing. If a tldraw upgrade is ever done, re-read `PointingShape.ts`/
  `Translating.ts` for this class of change.
- **The string `"select.translating"`, used by `editor.isIn(...)`** (ticket 14's armed-zone
  check, `zoneHitTest.ts`) is the same state `PointingShape.ts`'s `startTranslating` transitions
  into (`this.parent.transition('translating', info)` on the `select` tool node) — confirmed
  against that source, not assumed from the string. A tldraw version bump that renames or
  restructures this state transition would silently break `useIsZoneArmed` (it would just always
  return `false`, the drag would still work) — no test currently guards this beyond
  `verify-zone-armed.spec.ts`'s happy-path check.
- **`PointingShape.onPointerUp`'s internal ordering** — `markHistoryStoppingPoint('shape on
  click')` then `updateShapes([onClick's returned change])`, both after `onClick` returns — is
  load-bearing for ticket 16's multi-untap (2026-08-09, `626ab6f`): the propagated writes are
  `queueMicrotask`-deferred specifically to land *after* that mark and coalesce into the same
  undo entry. Confirmed empirically, not just from source. Unlike the `useIsZoneArmed` gap
  above, this one HAS a regression tripwire: `verify-multi-untap.spec.ts`'s one-Ctrl+Z
  assertions fail if a tldraw upgrade reorders it. See watch point 14.

### Shape identity (`props.instanceId`)
- Minted at `apps/tabletop/src/server/cardArrival.ts` on arrival, or `seatJoined.ts` at seating for
  commanders — never a third site (table-layout ticket 18, "commander arrives with owner and
  ghost," 2026-08-09, added the second seam; both mint directly into the shape's validated `props`,
  moved out of `meta` by ticket 12, 2026-08-08). Both seams call the same `mtgCardShape()` builder
  in `tableFurniture.ts` rather than writing their own `store.put` literal — see watch point 15.
- No hook needs a defensive identity guard anymore: `mtg-card` is its own exclusive tldraw shape
  type (registered via the `TLGlobalShapePropsMap` augmentation in
  `apps/tabletop/src/shared/mtgCardShape.ts` — see `architecture.md`), so every instance of it is
  a real card by construction. The old `if (!shape.meta?.instanceId) return undefined` guard,
  needed only because cards/furniture/stray-drops used to share `type: "image"`, was removed.
- `meta` still exists on the *card* shape but now carries *only* `zone` (zone-entry dedup, see
  `onTranslateEnd`) — this is the card's own "what zone was I last known to be in," not a copy of
  anything on the zone shape. Ticket 13 (landed 2026-08-08) upgraded the *other* half — how
  `zoneAt()` finds the zone in the first place — from scanning any shape's bare `meta.zone` string
  to matching real `mtg-zone` shapes' validated `props.zone`; see the next section.

## Depended On By

### `two-faced-cards` (card rendering, not mechanics)
- Shares one file today (`MtgCardShapeUtil.tsx`) but a different concern: that owner cares what
  image/face renders, this owner cares whether the right shape responds to the pointer. See
  `owners/two-faced-cards/interactions.md` watch point 16 and `architecture.md`'s "How to tell
  this owner's territory from `two-faced-cards`'s" section.
- **Ticket 12's `mtg-card` rewrite landed as a joint change** (2026-08-08): the
  `setSelectedShapes([])` selection-cleanup was carried forward into the new ShapeUtil unchanged
  (any ShapeUtil with `onClick` inherits the tldraw quirk — watch point 1 below), and
  `two-faced-cards`'s props-based flip/identity model landed alongside it (flip is now a pure
  `props.face` write, no per-instance tldraw asset). Both owners' territory changed in the same
  commit; consult `owners/two-faced-cards/` for anything about *which face renders*, this owner
  for anything about *what responds to the pointer*.

### Zone detection (`tableFurniture.ts`, `MtgZoneShapeUtil.tsx`, `cardLayout.ts`)
- Furniture is now `mtg-zone`, a genuine custom shape type (ticket 13, landed 2026-08-08;
  `apps/tabletop/src/shared/mtgZoneShape.ts` + `apps/tabletop/src/client/shapes/
  MtgZoneShapeUtil.tsx`) — no longer stock, locked `geo`/`image` shapes stamped with a bare
  `meta.zone` string. `zoneAt()` in `MtgCardShapeUtil.tsx` now filters
  `candidate.type === "mtg-zone"` and reads the validated `candidate.props.zone`, instead of
  scanning every shape for a truthy `meta.zone`.
- **The hit test itself moved, ticket 14 (landed 2026-08-08).** `zoneAt()` no longer walks shapes
  itself — it calls `topmostZoneAt(this.editor, bounds.center)` from the new
  `apps/tabletop/src/client/shapes/zoneHitTest.ts`, which now resolves overlapping zones by
  picking whichever candidate has the greatest `index` (an `IndexKey`; plain string `>` comparison
  already reflects z-order for tldraw's fractional-indexing scheme), i.e. the topmost-drawn zone
  wins. That same function is now also the basis of `MtgZoneShapeUtil`'s armed-state check (below)
  — the second consumer watch point 8 anticipated. See `architecture.md`'s "Ticket 14" section.
- **The command zone is placed furniture now, and zone AABBs are strictly disjoint by tested
  invariant** (*table-layout* ticket 13, 2026-08-08 — a different ticket 13 from the
  `tabletop-physics` one; see `history.md`). `ensurePlayerArea` (`tableFurniture.ts`) draws a
  locked `mtg-zone` with `zone: "command"` per seat, no interaction hooks; `cardLayout.ts`
  guarantees a 20-unit gap between every pair of zone boxes — since table-layout ticket 14
  ("the square", `5eeac70`), across all four compass seats AND the centered Stack — asserted
  pairwise in `test/cardLayout.test.ts` — see watch point 8. Pre-existing tables keep their old furniture
  (no Command Zone) because `ensurePlayerArea` never redraws; detection degrades gracefully.
- **Zone heights changed 2026-08-09 (zone-label-band, `0d61890`) without touching detection.**
  Every card-holding zone now reserves `ZONE_LABEL_BAND` (40, exported from
  `shared/mtgZoneShape.ts`) of label headroom: library/command/exile are 278, graveyard 356. The
  disjointness invariant passed unchanged, and no hook or hit-test code moved — the working
  example that pure geometry edits to `cardLayout.ts` don't need this owner's machinery, only its
  invariant test. One coupling worth knowing: `COMMAND_ZONE_H` is defined as `LIBRARY_H` because
  the graveyard sits at `column.y + LIBRARY_H + GAP` spanning the full column width — a height
  drift between the two top boxes would erode the command zone's gap (asserted in
  `test/cardLayout.test.ts`).
- `MtgZoneShapeUtil` defines **no** `onClick`/`onTranslateEnd`/`onDragShapesOver` — see
  `architecture.md`'s "Ticket 13" section for why that's provably safe rather than just
  convenient: zones are always `isLocked: true`, `SelectTool`'s `Idle` state gates on `isLocked`
  before a locked shape ever reaches `PointingShape` (so watch point 1's quirk can't apply to it,
  even if it grew an `onClick` later), and `Editor.getDraggingOverShape` filters out locked shapes
  before checking drag-over hooks (so a target-side hook on the zone could never fire regardless).
  This is now the KB's concrete working example of "a locked shape needs no interaction hooks at
  all" — previously only asserted in the abstract (see watch point 7, new, below).

### Counter attachment (`mtg-counter`, ticket 18, 2026-08-08)
- A counter's attachment to a card IS tldraw parenting (`parentId`) — there is no attachment
  prop on either shape. So anything that reparents shapes (tldraw's own group/frame machinery,
  future features, undo) is silently also attach/detach for counters, and the drag hooks on
  `MtgCardShapeUtil` (`canReceiveNewChildrenOfType`/`canRemoveChildrenOfType`/`onDragShapesIn`/
  `onDragShapesOut`) are the mediating surface. Counter eviction on battlefield exit rides
  inside `MtgCardShapeUtil.onTranslateEnd`'s zone-change branch — changing the zone-entry
  debounce or the `NON_BATTLEFIELD_ZONES` set changes when counters detach. The Stack is
  deliberately not an evicting zone (cards *arrive* there; see `architecture.md`'s Ticket 18
  section).

## Watch Points

1. **Any ShapeUtil that defines `onClick` inherits the selection-deferral quirk — and the
   cleanup obligation extends to EVERY unlocked draggable shape on the same canvas.** If a new
   custom shape type defines `onClick` (tap, a button, anything), its equivalent of
   `onTranslateEnd`/drag-settle must also call `this.editor.setSelectedShapes([])` — otherwise
   the drag-picks-up-the-wrong-shape bug reopens for that shape type. This is the single most
   important watch point in this KB; it already bit — and was correctly ported forward into —
   ticket 12's `mtg-card` rewrite (see `architecture.md`). **Ticket 18 (2026-08-08) proved the
   obligation generalizes**: `MtgCounterShapeUtil` has NO `onClick`, yet its `onTranslateEnd`
   still unconditionally clears selection (no early return above it) — because a stale
   *counter* selection defeats the *card's* `startTranslating` safety net (`!getSelectedShapeIds
   ().length` is false) and the next card drag would silently move the counter. The rule as now
   understood: any shape a player can drag must clear selection on drag-settle, as long as any
   `onClick`-bearing shape shares the canvas. Regression test: `verify-counter.spec.ts`'s
   drag-counter-then-drag-card sequence. **Ticket 19 (2026-08-10) proved the obligation reaches
   stock tldraw shapes too, not just this app's own custom ones.** Adding tldraw's stock `note`
   type to `mtg-card`'s passenger accept-list reopened this exact hazard, because stock
   `NoteShapeUtil` has no `onTranslateEnd` of its own to clear selection. Fixed by subclassing it
   (`SelectionClearingNoteShapeUtil`, overriding only `onTranslateEnd`) rather than reimplementing
   the shape — see watch point 18 and `architecture.md`'s "Ticket 19" section. Regression test:
   `verify-note.spec.ts`'s drag-note-then-drag-card sequence, deliberately without test-side
   selection cleanup so the assertion proves the product's behavior, not the test's. **Ticket 20
   (2026-08-10) widened the accept-list a third time, to a shape this owner DOES already control
   the source of** — `mtg-card` itself, joining `PASSENGER_TYPES` alongside counters and notes.
   No new selection-cleanup gap here, because `MtgCardShapeUtil` already carries the
   `setSelectedShapes([])` cleanup in its own `onTranslateEnd` (it's the ShapeUtil watch point 1
   was written about in the first place) — the gap this ticket actually surfaced was different in
   kind, not this one: see watch point 19.

2. **The selection-clear must run before any early return in the drag-settle hook.** In
   `onTranslateEnd`, the zone-equality check (`if (zone === previousZone) return undefined`) is
   hit by ordinary same-zone drags (e.g. rearranging two lands on one playmat). The
   `setSelectedShapes([])` call is placed *before* that early return specifically so those drags
   still clear selection. Moving it after, or adding a new early return above it, silently
   reopens the bug for whatever drags hit that return.

3. **`mtg-card` is now its own exclusive tldraw shape type — no identity guard needed, but don't
   assume that generalizes.** Since ticket 12, every `mtg-card` shape is a real card by
   construction, so hooks no longer guard on `props.instanceId` before acting. If a *future*
   shape type is ever added that shares a tldraw `type` string across meanings again (unlikely,
   but it's exactly how the old `image`-sharing bug happened), that guard pattern needs to come
   back for it.

4. **Rotation pivots around `x,y` (top-left), not the shape's center.** Any new hook that moves
   or rotates a card must recompute `x`/`y` to hold the center fixed under the new rotation (see
   `98f8bea`'s fix and the `halfExtent`/`center`/`topLeft` math in `onClick`) — a naive
   `rotation` write alone swings the card around its corner.

5. **Each tldraw-quirk class of bug gets its own explicit test — coverage by association
   doesn't exist here.** `verify-drag-identity.spec.ts` covers exactly the drag-identity
   symptom (drag A, then drag B, B should move); since ticket 16 (2026-08-09),
   `verify-multi-untap.spec.ts` covers the once-named gap of multi-select interacting with
   `onClick`-bearing shapes (marquee + click propagation, one-undo coalescing, two-client undo
   independence). Still uncovered: shift-click on an `onClick`-bearing card (see the
   "unconfirmed-but-likely taps instead of extends selection" note in `architecture.md`'s
   ticket 16 section), and a tldraw upgrade changing `PointingShape`'s guard conditions
   themselves (the tests catch symptoms, not cause changes). Treat new drag/select/tap
   behavior as needing its own explicit test.

6. **Registering a new custom shape type needs FOUR separate steps, and missing any one fails
   differently.** (1) The `declare module "@tldraw/tlschema" { interface TLGlobalShapePropsMap`
   augmentation — miss it and `BaseBoxShapeUtil<Shape>` fails to *typecheck*, caught at build
   time. (2) Client `useSync({ shapeUtils: [...defaultShapeUtils, MyUtil] })` in `TablePage.tsx`
   — miss the `defaultShapeUtils` spread and *furniture* silently fails client-side validation,
   not the new shape. (3) Server `createTLSchema({ shapes: { ...defaultShapeSchemas, ... } })` in
   `rooms.ts` — miss the `defaultShapeSchemas` spread and the *server* schema rejects furniture,
   disconnecting clients outright. (4) The ShapeUtil's `component()` must wrap interactive content
   in `.tl-image-container`/`.tl-image` (or otherwise defeat `.tl-html-container`'s
   `pointer-events: none`) or clicks silently never land, which Playwright will report as "element
   intercepts pointer events" rather than anything shape-specific. See `architecture.md`'s
   Registration sections for all four. This bit on ticket 12's implementation (item 4, the
   pointer-events trap, broke every click-based Playwright spec until traced). **Item 4 is
   conditional on the component's content being interactive — NOT on the shape being unlocked**:
   ticket 13's `mtg-zone` generalized steps 1-3 cleanly (see `architecture.md`) but didn't need
   step 4 at all, because nothing ever clicks a zone — `MtgZoneShapeUtil.component()` renders a
   plain `<div>` with no `.tl-image-container` treatment and that's correct, not an oversight.
   The decided-but-unbuilt life counter (see `architecture.md`; now named `mtg-life-counter`,
   having formerly working-named itself `mtg-counter`, a string ticket 18 has since claimed
   for a different shape) is the
   counterexample that forced this precision: it will be *locked* yet its `component()` hosts
   buttons and an input, so it pays step 4 in full — locking gates tldraw's gesture state
   machine, not DOM events. Ticket 18's `mtg-counter` (unlocked, editable) exercised step 4 too:
   without `pointerEvents: "all"` on its container, double-click-to-edit never reaches it.
   **Ticket 19 (2026-08-10) added a fifth failure mode to this same recipe, specific to
   *replacing* a stock shape's util rather than adding a brand-new type**: `useSync`'s schema
   builder throws `"Shape type 'X' is defined more than once"` at runtime if `defaultShapeUtils`
   is spread in (bringing the stock util along) and a subclass meant to replace it is added
   without first filtering the stock one out of that spread. `<Tldraw shapeUtils={...}>`'s own
   merge (`mergeArraysAndReplaceDefaults`) is lenient about the same duplicate (last-wins), so
   this failure is invisible on that half of the registration and only surfaces via `useSync`.
   See watch point 18.

7. **A locked shape needs no interaction hooks — now demonstrated, not just asserted.**
   `MtgZoneShapeUtil` (ticket 13, `apps/tabletop/src/client/shapes/MtgZoneShapeUtil.tsx`) defines
   none of `onClick`/`onTranslateEnd`/`onDragShapesOver`, and that's correct by construction:
   zones are minted `isLocked: true` and stay that way (tldraw's context-menu Lock/Unlock is the
   sole unlock path), `SelectTool`'s `Idle` state gates on `isLocked` before a shape ever reaches
   `PointingShape` (so watch point 1's `onClick`-selection-deferral quirk is structurally
   unreachable for it), and `Editor.getDraggingOverShape` filters `!isLocked` before checking
   drag-over hooks (so a target-side hook could never fire either). **If `mtg-zone` ever grows an
   `onClick`** (e.g. a future custom unlock affordance), it still would NOT reopen watch point 1's
   quirk, because that quirk's gate (`PointingShape.onEnter`) sits behind the very same
   `isLocked` check — a locked shape with `onClick` never reaches the code path that defers
   selection in the first place. This distinction (locked-with-onClick vs. unlocked-with-onClick)
   is worth remembering exactly because it looks like it should matter and doesn't. **"No
   interaction hooks" does not mean "no interactivity"**: locking gates ShapeUtil hooks (the
   gesture state machine), not DOM events inside `component()` — a locked shape can still host
   working buttons via the `HyperlinkButton` pattern (see watch point 9 and `architecture.md`'s
   `mtg-counter` section).

8. **`topmostZoneAt()` is first-match-by-z-order-not-closest-match, with no orientation
   awareness — a new risk once zones cluster around a shared center.** The tie-break logic
   (originally inline in `MtgCardShapeUtil.zoneAt()`, extracted to
   `apps/tabletop/src/client/shapes/zoneHitTest.ts`'s `topmostZoneAt()` by ticket 14, 2026-08-08,
   when a second caller — the zone's own armed-state check — needed the identical hit test; see
   `architecture.md`) walks `getCurrentPageShapes()` and returns the *topmost-drawn* candidate
   shape whose bounds contain the given center — not the closest, not the
   smallest, not the one the player was visually dropping into. That was never a problem worth
   naming while zones (playmat/library/command-zone/graveyard/exile per seat) sat spread out in
   a row with clear gaps — and since the command-zone redraw (*table-layout* ticket 13,
   2026-08-08, commits `1046b93`+`b18bd16` — a different ticket 13 from the `tabletop-physics`
   one that created `mtg-zone`) that's a **tested invariant, not an accident of layout**: every
   pair of zone AABBs, within a seat's column and between player areas, keeps a 20-unit gap
   (`GAP`, exported from `cardLayout.ts`), asserted pairwise in
   `apps/tabletop/test/cardLayout.test.ts` with a comment naming exactly this watch point's
   reason — an overlap would resolve by draw order, deterministic but semantically meaningless.
   So today "first match" and "correct match" are the same thing by asserted construction.
   **"The square" is built now** (table-layout ticket 14, `5eeac70`, 2026-08-08 — designed in
   `.scratch/tabletop-table-layout/issues/10-the-square.md`, built by `issues/14-*.md`; see
   `apps/tabletop/DESIGN.md`): player areas sit in compass slots (S/N/E/W by join order) around a
   fixed 1000×1000 Stack square centered on the board origin (`playerAreaOrigin(seatIndex)` /
   `stackBounds()` in `cardLayout.ts`). **The tiebreak question this watch point raised never had
   to be answered** — the square's geometry keeps every zone AABB at least a `GAP`-wide (20-unit)
   empty band from every other, across ALL FOUR seats and the Stack. The load-bearing choice:
   `STACK_SIZE = 1000` deliberately exceeds `PLAYMAT_H` (952), so E/W areas (vertically centered,
   y in [-476, 476]) stay inside the Stack's vertical band and never overlap N/S areas (beyond
   ±600). Asserted pairwise in `apps/tabletop/test/cardLayout.test.ts` ("keeps every zone AABB at
   least a GAP apart, across all four seats and the Stack") via a `separation()` helper requiring
   `>= GAP` — strengthened from the old bare no-overlap check at this owner's `-review` ask. Two
   residual cautions: (a) most furniture now lives at **negative** page coordinates —
   `topmostZoneAt()` was verified sign-agnostic during that review (pure page-bounds comparison),
   but any future hit-test change must not assume positive coords; (b) if anyone shrinks
   `STACK_SIZE` below `PLAYMAT_H` or repacks the compass slots, the pairwise test fails loudly,
   which is the feature: it forces the tiebreak question (closest-match / smallest-containing-zone
   vs. z-order) to be answered explicitly rather than silently inherited. Since the same-day
   code-review fixes (`96159be`), the invariant is guarded at three layers: the pure geometry
   (`cardLayout.test.ts`), the event-handler seam over the actually-drawn `mtg-zone` shapes at a
   full 4-seat table (`test/seatJoined.test.ts`, 21 zones — catches `tableFurniture.ts` drifting
   from `cardLayout.ts`), and a runtime backstop — `playerAreaOrigin` **throws** past the new
   `MAX_SEATS` export (4) instead of wrapping a fifth seat onto the S slot's exact AABBs, with
   `seatJoined.ts`/`cardArrival.ts` refusing with 409 before the throw can ever fire. And (c),
   a testing caution that outlived ticket 14 itself: **reactive camera moves triggered by remote
   arrivals flake any spec that measures screen coordinates** — the first cut of
   `aimCameraAtTheTable()` zoomed on the first remote shape arrival and raced Playwright's
   measurements; the fix (`96159be`) is one deterministic `zoomToBounds` over the table's fixed
   extent at mount, camera never moving on its own after. tldraw also culls off-viewport shapes
   from the DOM, so `.tl-shape` counts are only reliable with the whole table in view.

9. **A new reactive-read pattern exists now — a `computed()` shared per-`Editor`, read via a
   `use*` hook, that writes nothing to the store.** `zoneHitTest.ts`'s `armedZoneIdSignal`/
   `useIsZoneArmed` (ticket 14, 2026-08-08) is the first hook in this KB that reads live
   drag-in-progress state (`editor.isIn("select.translating")`) purely to drive `component()`
   rendering, with no store write, no undo entry, and no sync traffic. It's keyed one-per-`Editor`
   in a `WeakMap`, not one-per-shape, specifically to avoid O(zones²) rescanning during a drag
   (tldraw's `Translating` state updates position on every raw pointer-move, unthrottled) — see
   `architecture.md`'s "Ticket 14" section. **Any future per-viewer, transient (not game-state)
   visual reaction to drag/selection state should follow this shape**, not invent a per-shape
   scan or a store write for something that's purely local render state.
   **The signal computes exactly one armed zone id, keyed on the pointer's own
   `editor.inputs.currentPagePoint`, not on any selected shape's bounds** — corrected 2026-08-08
   after a code-review finding briefly pushed it toward a *set* of armed zone ids, one per
   `getSelectedShapeIds()` entry, to "handle" multi-card drags. Jess corrected that: selecting
   several cards and dragging one moves the whole group together to **one** destination ("select
   six cards, drag one to the graveyard — I want all of them to go to the graveyard"), so arming
   one zone per selected card was wrong, not a missed edge case — and it also depended on
   `getSelectedShapeIds()`'s iteration order to mean anything. The pointer-keyed version is
   simultaneously correct for the app's mental model and more robust: single-card and six-card
   drags both arm exactly one zone, the one under the cursor, with no dependence on selection
   size or order. See `architecture.md`'s "Corrected, 2026-08-08" subsection and
   `verify-zone-armed.spec.ts`'s "dragging a multi-card selection arms only the one zone under the
   pointer, not one per card" for the regression test (uses `zoneHint: "battlefield"`, not
   `"stack"`, so the two selected cards land at distinct positions instead of stacking exactly on
   top of each other — same-position stacking made click-selecting the second card ambiguous).
   **Lesson for future code-review findings against this signal**: a finding that argues for
   *more* granularity (one armed zone per shape) needs to be checked against what a multi-select
   drag is actually supposed to do in this app, not assumed correct because it covers more cases
   — "handles more inputs" isn't the same as "matches the domain."
10. **Locked-but-interactive shapes: the life-counter pattern (decided 2026-08-08, not yet
    built — named `mtg-life-counter`, since `mtg-counter` was claimed by ticket 18 for the
    drag-onto-a-card counter).** A life
    counter will be a new locked custom shape whose `component()` renders +/-
    buttons and a typeable number field (see `architecture.md`'s life-counter section). Whoever
    builds it — or any future locked shape with live controls — has three
    specific hazards on record: (a) each control needs `pointer-events: all` plus
    `editor.markEventAsHandled(e)` in its pointer handlers (tldraw's own `HyperlinkButton`
    pattern; preferred over the older `stopEventPropagation` util) or the canvas swallows the
    press; (b) the typeable field must shield keystrokes from tldraw's tool hotkeys, or typing a
    life total switches tools — note ticket 18 showed shapes editing through tldraw's own
    editing state get this for free (`areShortcutsDisabled` while `getEditingShapeId() !==
    null`), but an *always-live* input (no editing state) still pays it; (c) tldraw sync is
    last-writer-wins, so simultaneous presses on
    the same counter can lose one increment — accepted for counters, and the reason
    story-quality life-change records need an explicit event per press (parked at
    `.scratch/tabletop-replaces-mural/parked/life-change-events.md`). Watch point 1 does NOT
    apply to it (locked shapes never reach `PointingShape`), but watch point 6's step 4 does.

11. **Defining ANY drag hook on a ShapeUtil makes every instance of that shape a drag target
    for every unlocked dragged shape — narrow both `can*` gates.** (Ticket 18, 2026-08-08.)
    `Editor.getDraggingOverShape` checks only that hooks *exist*; the filtering is the gates'
    job. `mtg-card`'s `canReceiveNewChildrenOfType` is narrowed to
    `!shape.isLocked && type === "mtg-counter"`, and `canRemoveChildrenOfType` to
    `type === "mtg-counter"` — the latter's default is `true` for ALL types, so omitting it
    means dragging card A across card B fires `B.onDragShapesOut(B, [cardA])`. Any future host
    shape (or new draggable type near cards) must re-check both gates. `onDragShapesOut` also
    needs the frame-style `parentId` filter (`shapes.filter(s => s.parentId === card.id)`) so a
    multi-shape drag containing another card's counter doesn't get touched.

12. **`reparentShapes` preserves PAGE rotation — a child reparented under a rotated parent gets
    a compensating local rotation that outlives the parent's rotation.** (Ticket 18.) A counter
    dropped on a tapped card would stay tilted forever after the card untaps. Fix in
    `onDragShapesIn`: zero each dropped child's local rotation, holding its center fixed with
    the same `halfExtent`/`center`/`topLeft` math as `onClick`'s tap pivot (watch point 4 —
    rotation pivots around the top-left, so a bare `rotation: 0` write swings the shape
    sideways). Also: **a parented shape's own `onTranslateEnd` never fires when only its parent
    moves** — anything that must happen to passengers on the parent's move (e.g. counter
    eviction) has to be driven from the *parent's* hooks. **Ticket 20 (2026-08-10) narrowed this
    fix's own scope**: the zero-rotation-on-attach loop, and `evictPassengers`' hardcoded
    `rotation: 0` on eviction, now both SKIP `mtg-card` passengers — for a card, the preserved
    page rotation isn't cosmetic tilt, it's `props.tapped`'s visual encoding, and zeroing it
    would make the card's look and its `tapped` prop silently disagree. See watch point 19 for
    the fuller consequence (the compensation math this same fact drove).

13. **Playwright-vs-tldraw facts for shape tests** (ticket 18, `verify-counter.spec.ts`):
    (a) a creation click followed within tldraw's double-click window by a grab at the same
    point classifies as a double-click and opens editing — wait ~500ms after creating a shape
    before dragging it (see the `createCounter` helper); (b) `.nth()` on shape testids is paint
    order, which reorders when a shape reparents — drag from known creation points instead of
    trusting locator indices across a reparent; (c) focusing a custom editing input needs
    `setTimeout(0)` inside the `isEditing` effect — `autoFocus`, ref-callback focus, and a bare
    effect all lose to tldraw's end-of-gesture focus handling (`document.activeElement` ends on
    `body`). The ride-along tap-catch-up fix (2026-08-10) added a fourth, found chasing a red
    herring while debugging it: (g) **at low zoom, a nearby passenger's hit-test margin can
    steal a click aimed at a card's exact center**, inside tldraw's own hit-test
    (`getShapeAtPoint`/`getHoveredShapeId`), even though `document.elementFromPoint` correctly
    says "card" — `hitTestMargin / zoomLevel` grows in page-space as zoom decreases, so after a
    whole-table `zoomToFit` a counter's margin can reach the card's center pixel.
    `verify-counter.spec.ts`'s `topGrip()` helper (grab the card's top ~12%, not its center)
    already existed for this; `verify-tap-animation.spec.ts`'s new counter test reuses it. Any
    test tapping/clicking a card that has or might have a passenger attached should grab near the
    top edge, not the center, especially at non-1:1 zoom. Ticket 16 (`verify-multi-untap.spec.ts`)
    added three more: (d) **marquee
    selection works by brushing from a point over locked furniture** — `SelectTool`'s `Idle`
    gates `isLocked` before `PointingShape`, so pointer-down on the playmat starts a brush,
    same as bare canvas; compute the brush rect from the cards' actual bounding boxes plus a
    margin. (e) The ~500ms double-click cooldown from (a) also applies **after a marquee
    mouse-up**, before a follow-up tap click. (f) **Assert tapped state as bounding-box
    orientation** (portrait cards: width > height means tapped) — camera-scale-proof, no
    rotation-matrix reading needed.

14. **Ticket 16's multi-untap rides on undocumented `PointingShape.onPointerUp` ordering —
    two facts, both load-bearing, one tripwire.** (2026-08-09, `626ab6f`.) (a) `onClick`
    returning a change makes `onPointerUp` early-return, which is the ONLY thing keeping the
    marquee selection alive through the click — the clicked card's own partial must stay a
    synchronous return, never folded into the deferred batch. (b) `onPointerUp` calls
    `markHistoryStoppingPoint` then `updateShapes` AFTER `onClick` returns, so the propagated
    writes are deferred via `queueMicrotask` to land after the mark and coalesce into the same
    new undo entry — one Ctrl+Z reverts the whole gesture. Never change `queueMicrotask` to
    `setTimeout` (a macrotask can interleave with input events). The propagation batch must
    stay defensive per card: fresh `getShape` re-fetch, `type === "mtg-card"` filter, and
    skip-if-already-at-target (rotation is a delta — watch point 4 — so a redundant ±90° write
    corrupts free rotation). `verify-multi-untap.spec.ts` is the standing tripwire for a
    tldraw upgrade reordering any of this. Also note the gesture-order constraint: watch
    point 1's drag-settle `setSelectedShapes([])` means multi-untap only works
    marquee-then-click; a drag in between clears the selection.

15. **A context menu is a third entry point into watch point 1's stale-selection family — right-
    click selects, and an unlocked shape's selection outlives the menu closing.** (Ticket 17,
    2026-08-09, `eb24a4f`.) `apps/tabletop/src/client/CardContextMenu.tsx` is the app's first
    custom `TLComponents.ContextMenu`. Right-clicking a card runs it through the same selection
    machinery a left-click does, so the card becomes selected — and tldraw's `DefaultContextMenu`
    clears selection on close **only for a locked shape**, not an unlocked one. Without an
    explicit clear, right-click-then-act (or right-click-then-dismiss) leaves the card selected,
    and the *next* drag of a *different* card silently hijacks this one instead (the same
    `startTranslating` safety-net gap watch point 1 describes: it only force-reselects when
    nothing is currently selected). **Mitigation pattern for any future menu item that mutates a
    shape**: route every write through a `commit(partials, label)` helper that ends with
    `editor.setSelectedShapes([])`, unconditionally, after `markHistoryStoppingPoint` +
    `updateShapes` — see `CardContextMenu.tsx`'s `commit()`. Regression test:
    `verify-flip-face-down.spec.ts`'s "flipping card A does not leave a stale selection that
    hijacks a later drag of card B." This is now the third documented entry point into the
    family: drag-settle (watch point 1, `onTranslateEnd`), the multi-untap click-batch (watch
    point 14, inside `onClick`), and now context-menu actions (here, at the menu's exit rather
    than a ShapeUtil hook). **The pattern generalizes**: any future custom menu, toolbar button,
    or other UI surface that mutates a card via `editor.updateShapes` while it might be selected
    needs the same trailing clear — the hazard isn't specific to drag or to `onClick`, it's
    "does this gesture leave an unlocked shape selected when it's done."
16. **The canonical pattern for adding a required `mtg-card` prop is now: edit `mtgCardShape()`
    in `tableFurniture.ts`, not each call site.** (Table-layout ticket 18, "commander arrives with
    owner and ghost," 2026-08-09.) Two server seams mint `mtg-card` records — `cardArrival.ts` for
    ordinary arrivals, `seatJoined.ts` for commanders and their ghosts — and until this ticket both
    wrote their own inline `store.put({...})` literal, listing every required prop by hand. Adding
    `owner`/`isCommander` to `MtgCardShapeProps` would have meant updating both literals plus the
    props interface — a three-way drift risk with no compiler check tying the literals to the type
    (the old code cast `as any`). Fixed by extracting `mtgCardShape(args: MtgCardShapeArgs)` in
    `tableFurniture.ts` (next to the existing `zoneShape()` helper): the one place that lists every
    required `mtg-card` prop, called by both `cardArrival.ts` and `seatJoined.ts` instead of each
    writing its own literal. **Future required props go in `mtgCardShape()`'s signature, not into a
    call site.** This is a narrower, `mtg-card`-specific instance of the general "registering a
    shape needs the props enumerated in one place" pressure watch point 6 already tracks for the
    `TLGlobalShapePropsMap`/schema layer — this is the mint-time layer, not the registration layer.

17. **A decoy/shadow shape can share a type with the real thing, distinguished by a prefixed
    `instanceId` and locked-vs-not — the KB's first example of this pattern.** (Table-layout
    ticket 18, 2026-08-09.) `seatJoined.ts` mints a commander as two `mtg-card` shapes at the same
    table position: the real, draggable card, and a `ghost:`-prefixed-`instanceId`, `isLocked:
    true`, `opacity: 0.3` copy underneath it (marking the Command Zone spot as occupied even after
    the real card is dragged away). Two facts worth carrying to any future "two shapes, same type,
    one spot" design:
    - **The ghost's `instanceId` (`` `ghost:${instanceId}` ``) is a distinct string from the real
      card's, confirmed safe against `cardArrival.ts`'s `instanceAlreadyOnTable` dedup check, which
      matches on exact `props.instanceId` string equality** — a prefix, not a shared or derived id,
      is what keeps the ghost from colliding with (or being mistaken for) the real card's identity.
    - **Paint order, not a z-index prop, decides which one is visible.** The ghost is minted via
      `nextIndex()` *before* the real card's mint call in the same `store.updateStore` — so the
      real card's `IndexKey` sorts strictly higher and paints on top, both shapes occupying the
      identical `x`/`y`. Same topmost-wins ordering `topmostZoneAt()` already relies on for
      overlapping zones (watch point 8) — this is the same mechanism applied to two cards instead
      of two zones.
    - **`isLocked: true` alone is sufficient to make the ghost fully inert to the player** — no new
      guard needed on the ghost side. This is watch point 7's claim ("a locked shape needs no
      interaction hooks") confirmed for a *second* locked shape type doing double duty as a decoy:
      `SelectTool`'s `Idle` state gates `isLocked` before `PointingShape`, so the ghost never enters
      click/drag/selection at all, and `Editor.getDraggingOverShape` filters it out as a drop
      target the same way it filters `mtg-zone`. `apps/tabletop/test/seatJoined.test.ts`'s "seat
      joined — commanders" describe block asserts the ghost's `isLocked`/`opacity`/index-ordering
      facts directly (it does not drive a live pointer at the ghost — the click-transparency claim
      rests on watch point 7's already-confirmed tldraw source reading, not a fresh Playwright
      probe for this ticket).

18. **Adding a stock tldraw shape to `mtg-card`'s passenger accept-list reopens watch point 1 for
    that shape, unless it gets this owner's cleanup hook too — and the fix is to subclass the
    stock `ShapeUtil`, not reimplement it.** (Ticket 19, 2026-08-10.) `PASSENGER_TYPES` widened
    from `{"mtg-counter"}` to `{"mtg-counter", "note"}`, but stock tldraw's `NoteShapeUtil` has no
    `onTranslateEnd` — nothing clears a note's selection after it's dragged, so a stale note
    selection would defeat the card's `startTranslating` safety net exactly like watch point 1
    describes for counters. This owner's `-review` caught the gap before it shipped. Fix:
    `apps/tabletop/src/client/shapes/SelectionClearingNoteShapeUtil.ts` extends tldraw's own
    `NoteShapeUtil` (imported from `"tldraw"`) and overrides only `onTranslateEnd` to call
    `this.editor.setSelectedShapes([])` — everything else (rendering, editing, `growY` sizing,
    tldraw's migrations) is untouched. **New reusable precedent: when a stock shape needs one of
    this KB's cleanup obligations and tldraw offers no other extension point, subclass the stock
    `ShapeUtil` rather than forking or reimplementing it.**
    - **Registering the subclass surfaced a new tldraw fact: `useSync` throws on a duplicate
      shape `type`; `<Tldraw shapeUtils={...}>` doesn't.** `<Tldraw>`'s own prop merges via
      `mergeArraysAndReplaceDefaults` (last-wins, tolerant of a duplicate `type`), but `useSync`'s
      schema builder throws `"Shape type 'note' is defined more than once"` if `defaultShapeUtils`
      is spread in *and* `SelectionClearingNoteShapeUtil` is added without first filtering the
      stock `NoteShapeUtil` out. `TablePage.tsx`'s `shapeUtils` array is now built as
      `[...defaultShapeUtils.filter((Util) => Util.type !== "note"), MtgCardShapeUtil,
      MtgZoneShapeUtil, MtgCounterShapeUtil, SelectionClearingNoteShapeUtil]` — a *replace*, not an
      *add*. This is a new twist on watch point 6's registration recipe, specific to replacing a
      stock shape's util rather than registering a brand-new type.
    - **The rotation-zeroing math in `onDragShapesIn` and the renamed `evictPassengers` (was
      `evictCounters`) now use `this.editor.getShapeGeometry(shape).bounds` instead of
      `props.w/h`** — a stock note has no `w`/`h` prop (size comes from a style enum plus
      `growY`), but every shape's geometry bounds work regardless of base class.
    - Regression test: `apps/tabletop/test/verification/verify-note.spec.ts`'s "after dragging a
      note, dragging a card moves the card (stale-selection regression)" — mirrors
      `verify-counter.spec.ts`'s Hazard-A test, deliberately with no test-side `deselectAll`
      cleanup after the note drag, so the assertion proves the product clears selection, not the
      test. Confirmed red without the subclass swap, green with it.

19. **A passenger that isn't cosmetic breaks the "counters/notes tilt along for free" assumption
    — and the fix needs full matrix composition, not a counter-rotation.** (Ticket 20,
    2026-08-10.) `PASSENGER_TYPES` widened to include `mtg-card` itself — a card can now host
    another card, tucked underneath. Every prior passenger type (`mtg-counter`, `note`) was
    cosmetic cargo: tilting along with a tapped host (ticket 18's intended "ride-along" visual)
    cost nothing to get for free from tldraw's own parent-child transform composition. A card
    passenger breaks that assumption twice over: its rotation is `props.tapped`'s visual
    encoding (not decoration), and visibly spinning/orbiting on every host tap is the wrong look
    for a tracked game object.
    - **Why a bare counter-rotation doesn't fix it**: `Editor.getShapeLocalTransform` =
      `translate(x,y)` then `rotate(rotation)` — a shape's own `(x,y)` is exactly its rotation's
      pivot point, and a *child's* `(x,y)` lives in its *parent's* local frame. `tapPartial`'s
      center-preserving pivot math already moves the host's own `(x,y)` as part of a tap write;
      a passenger not centered on the host's pivot inherits that translation through the parent
      transform and visibly orbits, not just spins. Confirmed from `Editor.ts` source before
      writing the fix, not assumed.
    - **The fix**: `cardTap.ts`'s `passengerTapCompensation(passenger, oldHost, newHost)` solves
      `newHostLocalMat⁻¹ · oldHostLocalMat · passengerLocalMat` via tldraw's own `Mat` class
      (mirroring `getShapeLocalTransform` exactly) for the passenger's new local pose that keeps
      its *page* transform fixed across the host's tap. Pure, no `Editor` — unit-tested in
      `test/passengerTapCompensation.test.ts`. Called from `tapPartialsForCards` (shared by
      `onClick`'s multi-select propagation and the context menu's Tap/Untap item) for every card
      it taps, and `onClick` now always runs its `queueMicrotask` block (previously gated on
      "other cards selected") so a solo tap's own passenger compensation still lands in the same
      undo entry via ticket 16's existing microtask-coalescing mechanism.
    - **Watch point 12's rotation-zeroing fix needed an exemption for the same reason** — see
      that watch point's ticket-20 addendum.
    - **A real dedup bug, fixed with a `directIds` set**: a passenger multi-selected alongside
      its own host in the same tap gesture would otherwise get both its own correct direct
      `tapPartial` AND a stale ride-along compensation computed against the pre-tap host pose —
      order-dependent on `updateShapes` batch order, silent. Fixed by excluding every directly-
      tapped card's id from the compensation partials, in both `tapPartialsForCards` and
      `onClick`.
    - **Two more tldraw facts worth carrying forward**: `onDragShapesIn`/`onDragShapesOut` fire
      only for `DragAndDropManager`'s top-level `shapesToActuallyMove` — a passenger whose host
      is what's being dragged never itself triggers either hook, its move is free transform
      composition — and `animateShapes` never fires `onTranslateEnd` (only nudge/align/
      distribute/stack/pack use `getChangesToTranslateShape`), so an evicted passenger that
      itself hosts a grandchild passenger can't cascade a spurious zone-entry chain through
      `animateShapes`. And `hasAncestor(card, id)`'s existing cycle guard in `onDragShapesIn` —
      dead code before this ticket, since counters/notes can't have children — is now genuinely
      load-bearing against card-on-card cycles.
    - **Test-positioning gotcha, general beyond this one spec**: `zoneHint: "stack"` puts two
      same-seat cards only ~36px apart, rendering them almost fully overlapping at zoom-to-fit —
      reliably triggering watch point 1's stale-selection hazard for the *test's own drags*.
      `verify-cards-behind-cards.spec.ts` uses `zoneHint: "battlefield"` and a grab point pulled
      well clear of any overlap instead — the same lesson `verify-zone-armed.spec.ts` recorded
      for a different reason (watch point 9).
    - Regression test: `apps/tabletop/test/verification/verify-cards-behind-cards.spec.ts` — 6
      tests covering attach/carry/independent-tap/no-rotate-on-host-tap, z-order via the context
      menu, detach + reconcile-to-upright, graveyard eviction, and tapped-state preservation
      across both attach and eviction.

20. **A ShapeUtil's `component(shape)` only gets a fresh `shape` object when that shape's OWN
    `props` change — closing over `shape.parentId` (or any non-`props` field) in a reactive
    selector freezes it at the last props-triggered render.** (Found 2026-08-10, fixing "the
    counter didn't participate in the tap animation, when the counter was on the card" —
    `MtgCounterShapeUtil.tsx`.) A bare `parentId`/`x`/`y`/`rotation` write — exactly what a
    drag-attach or a host's tap produces — is applied to the wrapping page-transform outside
    React and never re-renders `component()`. A `useValue` selector that reads `shape.parentId`
    from the outer closure therefore never sees a reparent or an ancestor's prop change; it just
    replays whatever was true at mount or the last unrelated props-triggered render. Confirmed by
    adding a temporary `window.__editor` debug hook: the naive closure version's effect fired
    exactly once, at mount, never again. **The fix: call `this.editor.getShape(shape.id)` INSIDE
    the `useValue` selector** to get a fresh, reactively-tracked record on every store change,
    then chain a second `this.editor.getShape(parentId)` read for an ancestor's props — both are
    genuine signal reads through the store, so `useValue` correctly re-runs on every relevant
    change (reparent OR ancestor prop write). Any future passenger-side hook that needs to react
    to its own current `parentId`, or to a host's/ancestor's props, needs this "read the editor
    inside the selector" shape, not a closure over the `shape` argument. See
    `architecture.md`'s "Ride-along tap catch-up" subsection.

## Not Related To

### Card face/image rendering
What image a card shows (front/back, Scryfall URL resolution, `CardDefinition`/`CardFace`) is
`two-faced-cards`'s territory, not this owner's — even though today it's the same source file.
A bug where the wrong *image* shows is that owner's; a bug where the wrong *shape* moves, taps,
or gets dragged is this owner's.

### Fleet visual design (colors, fonts, CSS)
`shuffler-looks-like-itself` owns the Tabletop's visual identity, including its own "tldraw
limits" list (font enum, focus rings, locked-shape drop targets, opaque-image z-order) — those
are *rendering/styling* limits, distinct from this owner's *interaction/selection* limits, even
though both are "things tldraw won't let us do." Consult that owner for appearance; this one for
gesture correctness.

### The Spine's event feed / table furniture placement
Where a card or zone gets *placed* on first arrival (`cardArrival.ts`, `tableFurniture.ts`,
`seatJoined.ts`) is the Tabletop's server-side geography, covered by `DESIGN.md` and the
`tabletop-physics` planning map — not this owner. This owner starts once a shape already exists
on the board and something clicks or drags it.
