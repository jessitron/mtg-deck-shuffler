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
- **`Translating.ts` writes to the document store on every raw pointer-move during a drag, not
  once at settle.** (Confirmed 2026-08-10, ticket 21's `-context` consult, reading
  `onPointerMove`/`moveShapesToPoint` in `node_modules/tldraw/src/lib/tools/SelectTool/
  childStates/Translating.ts`.) Each move calls `editor.updateShapes(...)` — a genuine store
  transaction, not batched to settle — so **any consumer outside this owner's own hooks that
  watches raw shape mutations (e.g. a `store.listen()`) sees per-frame noise for a plain drag**,
  not one event per completed motion. This owner's own hooks never see that noise because they're
  ShapeUtil callbacks (`onTranslateEnd` fires once, at settle, by tldraw's own contract) — the
  hazard is specifically for code reading the *store*, not the ShapeUtil. See watch point 20.

- **`Idle.onPointerDown` (`node_modules/tldraw/src/lib/tools/SelectTool/childStates/Idle.ts`) is
  the source of truth for `getHitShapeOnCanvasPointerDown`** (ticket 05, 2026-08-11,
  `clearStaleSelectionOnPointerDown.ts`) — it's the same hit-test helper `Idle` itself calls
  before recursing into `{ ...info, target: 'shape' }` internally. See watch point 24 for why a
  listener on `editor.on('event', ...)` must call this helper directly rather than trusting
  `info.target === 'shape'` to ever appear for a real gesture.

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
- Different concern, not always the same file anymore: that owner cares what image/face renders,
  this owner cares whether the right shape responds to the pointer. Before ticket 01 (2026-08-11,
  organizational split), both concerns shared one file, `MtgCardShapeUtil.tsx`; now `two-faced-
  cards`'s territory is mostly `cardRender.tsx`'s `CardFace` component, while this owner's spans
  `MtgCardShapeUtil.tsx` (the thin shell) and `cardTapClick.ts`/`cardPassengers.ts`/
  `cardZoneEntry.ts` — except the tap catch-up animation, which stayed in `cardRender.tsx` because
  it's about rendering, even though the *gesture* it reacts to is this owner's. See
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
- **Arming is no longer universally card-agnostic — command zones are the first exception
  (2026-08-10).** `ZoneHit` (`topmostZoneAt`'s return type) widened to carry `seatId` alongside
  `id`/`zone`, and `armedZoneIdSignal` now gates specifically on `hit.zone === "command"`: the
  zone only arms if `allDraggedCardsAreOwnersCommander(editor, hit.seatId)` — every currently
  selected `mtg-card` has `props.owner === seatId && props.isCommander`. Every other zone type
  (playmat, library, graveyard, exile, stack) still arms regardless of what's being dragged,
  exactly as ticket 14 built it. See watch point 19.
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
  `test/cardLayout.test.ts`). **Confirmed a second time, tabletop-architecture ticket 03
  (2026-08-11)**: extracting the pairwise-separation check into an exported `checkZonesDisjoint`
  and calling it at module load (see watch point 8's new paragraph below) touched only
  `cardLayout.ts` and its own test file — no ShapeUtil, gesture, or selection code, confirming
  again that this invariant's *territory* is pure geometry, even though its *consequence*
  (topmost-zone-wins staying meaningless-but-safe) is squarely this owner's concern.
- `MtgZoneShapeUtil` defines **no** `onClick`/`onTranslateEnd`/`onDragShapesOver` — see
  `architecture.md`'s "Ticket 13" section for why that's provably safe rather than just
  convenient: zones are always `isLocked: true`, `SelectTool`'s `Idle` state gates on `isLocked`
  before a locked shape ever reaches `PointingShape` (so watch point 1's quirk can't apply to it,
  even if it grew an `onClick` later), and `Editor.getDraggingOverShape` filters out locked shapes
  before checking drag-over hooks (so a target-side hook on the zone could never fire regardless).
  This is now the KB's concrete working example of "a locked shape needs no interaction hooks at
  all" — previously only asserted in the abstract (see watch point 7, new, below).

### Physics announcements (`usePhysicsAnnouncements.ts`, ticket 21, 2026-08-10)
- **First store-level `store.listen()` consumer of this owner's gesture detection.**
  `apps/tabletop/src/client/usePhysicsAnnouncements.ts` (owned by `fleet-is-observable`, not this
  owner) watches the shape mutations this owner's ShapeUtil hooks already produce — `mtg-card`'s
  `props.tapped`/`face`/`faceDown`/`meta.zone` changes from `onClick`/`onTranslateEnd`, and
  `parentId` changes from `onDragShapesIn` — and translates each into a named Honeycomb span
  (`card.tapped`/`card.untapped`, `card.flipped`, `card.turnedFaceDown`, `card.zoneMoved`,
  `counter.attached`, `noteAttached`). It reads this owner's mutations; it does not call into any
  ShapeUtil or change detection logic here. **Detection logic in `MtgCardShapeUtil.tsx` is
  unchanged** — the only change on this owner's side of the line was deleting the old
  `console.log('zone-entry ...')` line inside `onTranslateEnd`'s zone-hit branch, now that
  `card.zoneMoved` covers that notification via the listener instead.
- **The generic `shape.moved`/`shape.changed` fallback (for shapes/props this owner hasn't named
  a gesture for) has to defend against watch point 20's per-move-write noise with its own 300ms
  per-shape-id debounce** — a workaround the listener owns, not a change to any ShapeUtil hook.
  The named-gesture branches above are unaffected by that noise, because they come from this
  owner's existing single-shot hook writes (`onClick`, `onTranslateEnd`, `onDragShapesIn`), not
  from watching raw `x`/`y`.
- Full detail (span names, debounce rationale, the `store.listen({source: "user"})` scoping) is
  `fleet-is-observable`'s territory — consult that owner for changes to what gets announced or
  how; this owner only cares that the listener reads gesture results, never drives them.

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
   selection cleanup so the assertion proves the product's behavior, not the test's.

   **Superseded, ticket 05 (2026-08-11) — this is now the KB's go-to answer for any future
   `onClick`-bearing shape type, not "add another `onTranslateEnd` clear."** Every per-shape site
   above (`MtgCardShapeUtil.onTranslateEnd`, `MtgCounterShapeUtil.onTranslateEnd`,
   `CardContextMenu.tsx`'s `commit()`) and both stock-shape subclasses that existed solely to carry
   this hook (`SelectionClearingNoteShapeUtil`, `SelectionClearingImageShapeUtil`) were deleted.
   One centralized listener, `apps/tabletop/src/client/clearStaleSelectionOnPointerDown.ts`
   (registered at Tldraw mount, `TablePage.tsx`'s `onTldrawMount`), now clears a stale selection on
   every `pointer_down` whenever the hit shape isn't already selected — closing this watch point
   for every shape type, present and future, without a per-type hook. It also closes a gap none of
   the distributed sites could reach *at all*: a shape selected by a plain click with no drag (a
   stock shape with no `onClick`, selected on pointer-down) staying selected into the next drag of
   a different `onClick`-bearing shape — there's no `onTranslateEnd` to fire for a click with no
   drag, so no number of drag-settle sites could ever close it. **A brand-new custom ShapeUtil
   that defines `onClick` needs NO drag-settle cleanup of its own anymore** — the centralized fix
   already covers it, the moment the next pointer-down lands on a different shape. See
   `architecture.md`'s "Ticket 05" section and watch point 24 for the fix's own sharp edge.

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
   `seatJoined.ts`/`cardArrival.ts` refusing with 409 before the throw can ever fire.
   **A fourth guard layer since tabletop-architecture ticket 03 (2026-08-11): the pairwise-`GAP`
   check itself is now exported (`checkZonesDisjoint(zones, minGap)`, `cardLayout.ts`) and run
   against all four seats' zones plus the Stack at module load** (`assertLayoutInvariants()`,
   called unconditionally at the bottom of `cardLayout.ts`), not only from
   `test/cardLayout.test.ts`. A constant edit that breaks the invariant — including this watch
   point's own `STACK_SIZE`-vs-`PLAYMAT_H` case — now throws at import/server-boot time, before
   any test run or any card is ever placed, naming the two conflicting zones and the actual gap.
   `test/cardLayout.test.ts`'s existing "keeps every zone AABB apart" test now calls this same
   exported function instead of duplicating the separation logic locally — one disjointness
   check, two call sites (module load, test). No behavior change for the current valid
   constants; this is a stricter backstop, not a new invariant. And (c),
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
   — "handles more inputs" isn't the same as "matches the domain." **The "one zone, one
   destination for the whole group" rule this point describes is unchanged by watch point 19's
   command-zone gating** — a multi-card drag still arms at most one zone; watch point 19 only adds
   a further condition (all selected cards must be the owner's commander) that a command zone
   specifically checks before honoring that one zone.
10. **Locked-but-interactive shapes: the life-counter pattern (built 2026-08-10, table-layout
    ticket 20 — named `mtg-life-counter`, since `mtg-counter` was claimed by ticket 18 for the
    drag-onto-a-card counter).** The life
    counter is a locked custom shape whose `component()` renders +/-
    buttons and a typeable number field (see `architecture.md`'s life-counter section,
    `apps/tabletop/src/client/shapes/MtgLifeCounterShapeUtil.tsx`). Four hazards are now on
    record, the fourth found only during the build and not anticipated by the earlier grilling
    session: (a) each control needs `pointer-events: all` plus
    `editor.markEventAsHandled(e)` in its pointer handlers (tldraw's own `HyperlinkButton`
    pattern; preferred over the older `stopEventPropagation` util) or the canvas swallows the
    press; (b) the typeable field must shield keystrokes from tldraw's tool hotkeys, or typing a
    life total switches tools — note ticket 18 showed shapes editing through tldraw's own
    editing state get this for free (`areShortcutsDisabled` while `getEditingShapeId() !==
    null`), but an *always-live* input (no editing state) still pays it; (c) tldraw sync is
    last-writer-wins, so simultaneous presses on
    the same counter can lose one increment — accepted for counters, and the reason
    story-quality life-change records need an explicit event per press (parked at
    `.scratch/tabletop-replaces-mural/parked/life-change-events.md`); (d) **NEW — a locked
    shape's props are silently unwritable via the ordinary `editor.updateShape`/`updateShapes`
    call, even from a DOM handler inside that shape's own `component()`, unless the call is
    wrapped in `editor.run(fn, { ignoreShapeLock: true })` (or the partial itself unlocks the
    shape, which defeats the point).** This is a *separate* gate from (a)/watch point 7's
    gesture-state-machine gating — it lives in the public `Editor.updateShapes` method, not
    `SelectTool`. See watch point 22 and `architecture.md`'s life-counter section fact 4 for the
    full writeup; the symptom is a silent no-op (no exception, no console warning), which makes
    it easy to miss in testing if the assertion only checks "did it throw." Watch point 1 does
    NOT apply to the life counter (locked shapes never reach `PointingShape`), but watch point
    6's step 4 does — see watch point 23 for a caution about *how* it's satisfied.

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
    eviction) has to be driven from the *parent's* hooks. This watch point's scope is exactly
    `mtg-counter` and `note` — the only two types that ever join `PASSENGER_TYPES`.

13. **Playwright-vs-tldraw facts for shape tests** (ticket 18, `verify-counter.spec.ts`):
    (a) a creation click followed within tldraw's double-click window by a grab at the same
    point classifies as a double-click and opens editing — wait ~500ms after creating a shape
    before dragging it (see the `createCounter` helper); (b) `.nth()` on shape testids is paint
    order, which reorders when a shape reparents — drag from known creation points instead of
    trusting locator indices across a reparent; (g) **`.tl-selected` never matches anything, in
    this tldraw version** — selection paints on the `tl-canvas-overlays` canvas (confirmed against
    tldraw's own `ShapeIndicatorOverlayUtil.ts`/`SelectionForegroundOverlayUtil.ts` source), never
    as a DOM/SVG element carrying that class, so a locator-based assertion on it is silently
    vacuous — always passes regardless of actual selection state. Use this owner's existing
    behavioral-proxy convention instead (`verify-click-then-drag-selection.spec.ts` et al.): press
    `ArrowRight` and assert the shape's bounding box moved, since an arrow-key nudge only acts on
    the current selection. **Gotcha**: if the preceding action was a click on a DOM button/input
    rendered inside a shape's own `component()` (not a canvas click), DOM focus is left on that
    control, and tldraw's arrow-key handler listens on `.tl-container`, not the document — a bare
    `page.keyboard.press("ArrowRight")` right after goes nowhere. Refocus first:
    `page.locator(".tl-container").evaluate(el => el.focus())` (tldraw's own accessible "Move focus
    to canvas" skip-link exists for this but is off-screen and fails Playwright's actionability
    checks even with `{ force: true }`/`dispatchEvent`). Found 2026-08-11 fixing
    `verify-life-counter.spec.ts` — see `history.md`'s "Correction" entry of that date, which also
    corrects an earlier KB entry that had mistaken this same spec's deterministic furniture-image
    count bug for a flake. (c) focusing a custom editing input needs
    `setTimeout(0)` inside the `isEditing` effect — `autoFocus`, ref-callback focus, and a bare
    effect all lose to tldraw's end-of-gesture focus handling (`document.activeElement` ends on
    `body`). Ticket 16 (`verify-multi-untap.spec.ts`) added three more: (d) **marquee
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
    "does this gesture leave an unlocked shape selected when it's done." **Superseded by ticket 05
    (2026-08-11)**: `commit()`'s trailing `editor.setSelectedShapes([])` was deleted; the
    centralized fix (watch point 1, below) catches this at the next pointer-down instead. The
    pattern-generalization lesson still stands as exactly the reason ticket 05's fix had to be
    shape-agnostic rather than another per-surface clear.
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

19. **Zone arming is no longer universally card-agnostic — command zones are the first (and so
    far only) card-aware exception, and the rule is "all selected cards qualify, or none arm."**
    (2026-08-10.) Every zone type since ticket 14 armed regardless of what was being dragged —
    watch point 9 established that deliberately, keyed purely on the pointer's page point. That's
    still true for playmat/library/graveyard/exile/stack. Command zones now add a further check:
    `armedZoneIdSignal` (`zoneHitTest.ts`) only returns the hit id for `hit.zone === "command"`
    when a new private helper, `allDraggedCardsAreOwnersCommander(editor, hit.seatId)`, returns
    `true` — which filters `editor.getSelectedShapes()` to `mtg-card`s and requires **every** one
    of them to have `props.owner === hit.seatId && props.isCommander`. No cards selected, or any
    one card failing the check, means the zone does not arm at all.
    - **`ZoneHit` grew a field to make this possible**: `topmostZoneAt`'s return type is now
      `{id, zone, seatId}`, not `{id, zone}` — `seatId` comes straight off the winning `mtg-zone`
      candidate's `props.seatId` and is threaded through to both callers (`zoneAt()`'s drag-settle
      check ignores the new field; `armedZoneIdSignal`'s live-drag check is what actually reads
      it).
    - **This is an instance of watch point 9's existing "one destination, or none" rule, not a
      departure from it.** A multi-card drag toward a command zone still arms at most one zone;
      the new check just adds a further condition (ownership + commander-hood, checked against
      *every* dragged card) before that one zone is allowed to arm — the same "partial match
      doesn't count" posture watch point 9 already established for the group-destination question.
    - **No selection-timing race**: `editor.getSelectedShapes()` inside the gate is read while
      `editor.isIn("select.translating")` is already true (the signal's own first check), i.e.
      after tldraw's `PointingShape`/`startTranslating` transition has already settled the
      dragged-shape selection — same trust the existing pointer-keyed hit test already placed in
      reading `editor.inputs.currentPagePoint` mid-drag. Confirmed during this owner's `-review`.
    - **First command-zone-specific behavior in `zoneHitTest.ts`.** Every other zone-type check in
      this file has been type-agnostic; if a *second* zone type ever needs card-aware arming, the
      `if (hit.zone === "command") { ... }` branch shape here is the precedent to extend or
      generalize, not duplicate ad hoc.
    - Regression tests: `verify-zone-armed.spec.ts` — own commander arms the command zone; a
      non-commander card does not; another seat's commander does not arm this seat's command zone.

20. **A `store.listen()` consumer watching raw shape mutations sees every pointer-move during a
    drag, not one event per completed motion — unlike this owner's own ShapeUtil hooks.** (Ticket
    21, 2026-08-10, confirmed by reading `Translating.ts`'s `onPointerMove`/`moveShapesToPoint` in
    `node_modules/tldraw/src/lib/tools/SelectTool/childStates/Translating.ts` — see the "Depends
    On" section above.) This owner's own hooks (`onTranslateEnd`, `onClick`, `onDragShapesIn`)
    never see this noise because tldraw itself guarantees they fire once, at the right moment, by
    contract — the ShapeUtil hook layer is *already* the debounced/settled view. The hazard is
    specific to code that bypasses that layer and reads the document store directly (e.g.
    `apps/tabletop/src/client/usePhysicsAnnouncements.ts`, `fleet-is-observable`'s territory,
    ticket 21): such a listener must debounce or otherwise settle raw `x`/`y` diffs itself, the
    way `usePhysicsAnnouncements.ts` does with a 300ms per-shape-id timer on its generic fallback
    branch. **Any future store-level listener this KB's mechanics feed into inherits this same
    obligation** — it is not something this owner's hooks can or should absorb, since the noise
    only exists at the store layer, not the hook layer.

21. **Furniture must always be beneath everything — now structurally enforced via a separate
    index band, not just an accident of draw order or a per-move patch.** (2026-08-10.) Cards and
    furniture used to share one monotonically-increasing per-room `nextIndex(tableName)` counter
    (the `getIndexAbove`/`ZERO_INDEX_KEY` chain in `tableFurniture.ts`), so a furniture mint that
    happened after a card already existed — an ordinary late seat join — could land a higher
    `IndexKey` than that card, and watch point 8's greatest-index-wins tie-break would then paint
    the late playmat *over* the earlier card. Fixed with a second per-room counter,
    `lowestFurnitureIndexByRoom`, feeding `nextFurnitureIndex(tableName)`, which calls
    `getIndexBelow(...)` (from `@tldraw/utils`) chained off `null` instead of `ZERO_INDEX_KEY`.
    Because tldraw's fractional indexing is lexicographic, every key that chain produces sorts
    strictly below `ZERO_INDEX_KEY` ("a0") and everything `nextIndex`'s `getIndexAbove` chain ever
    builds from it — furniture is guaranteed beneath every card **by construction**, regardless of
    mint order across seats, not reasserted on every move. `nextIndex` is now used **only** by the
    two card-minting seams (`cardArrival.ts`, `seatJoined.ts`'s commander/ghost mints — both
    already only called it for `mtg-card` shapes); every furniture-minting call inside
    `ensurePlayerArea`/`ensureStackDrawn` calls `nextFurnitureIndex` instead. **This is the first
    time this KB has reasoned about two disjoint index bands rather than one shared sequence** —
    watch point 8's tie-break and watch point 17's paint-order decoy both assumed a single
    `nextIndex` counter; that assumption still holds *within* each band, it just no longer spans
    both. **If a future furniture-minting call site is ever added outside
    `ensurePlayerArea`/`ensureStackDrawn`, it must call `nextFurnitureIndex`, not `nextIndex`, or
    this invariant silently breaks for that shape** — nothing at runtime ties a shape's `type` to
    which band its `index` came from; the guarantee lives entirely in every call site's discipline.
    Regression test: `apps/tabletop/test/furnitureZOrder.test.ts` — seats an early player, plays a
    card for them, seats a late player, and asserts every `mtg-zone` shape's index sorts below the
    card's.

22. **`editor.updateShape`/`updateShapes` silently drops a partial targeting a locked shape —
    a second, separate lock-gate from the gesture-state-machine one, and it bites even DOM-driven
    writes from inside `component()`.** (Table-layout ticket 20, 2026-08-10.) Watch point 7
    established that locking gates `SelectTool`'s state machine (`Idle` before `PointingShape`,
    `getDraggingOverShape`'s `!isLocked` filter) but NOT DOM event dispatch inside a shape's own
    rendered HTML — that fact is what makes "locked furniture with live buttons" possible at all,
    and it's still correct. What it does NOT mean, and what this watch point adds: a locked
    shape's `props` are *also* unreachable through the ordinary public `Editor.updateShape`/
    `updateShapes` call, regardless of which code path triggers the write. That call silently
    filters out any partial whose target shape is locked, unless either the partial itself
    carries `isLocked: false` (unlocking it — wrong for furniture that must stay locked) or the
    call is wrapped in `editor.run(fn, { ignoreShapeLock: true })`. Found building the life
    counter (see `architecture.md`'s life-counter section, fact 4): `setValue`'s first draft
    called `this.editor.updateShape(...)` directly from a button's `onClick`, following the
    `HyperlinkButton`/`mtg-counter` pattern faithfully — it compiled and ran with no error, but
    the value never changed, because nothing in that pattern's documented facts (watch point 7,
    watch point 10's (a)) said anything about this second gate. **Any future locked shape whose
    own controls write to its own props needs `editor.run(fn, { ignoreShapeLock: true })`
    wrapping every such write** — reading/rendering (like `mtg-zone`'s armed-glow `computed()`,
    watch point 9) is unaffected, since it never calls `updateShapes` at all. The failure mode
    (silent no-op, no exception) makes this easy to miss without a Playwright assertion that
    actually reads the rendered value back, not just that the button click didn't throw.

23. **Don't reuse tldraw's own `.tl-image-container` class purely for its `pointer-events: all`
    side effect — a second shape carrying it can break a test that assumes the class means
    "this is a pasted image."** (Table-layout ticket 20, 2026-08-10.) `MtgCounterShapeUtil`
    wraps its content in `<div className="tl-image-container">` to inherit `pointer-events: all`
    from `tldraw.css` "for free," satisfying watch point 6's step 4. Doing the same for the life
    counter broke `apps/tabletop/test/verification/verify-image-selection.spec.ts`, whose locator
    (`` '[id^="shape\\:"]:not([id^="shape\\:card-"]) .tl-image-container' ``) assumes every
    non-card shape carrying that class IS a pasted image, for its stale-selection regression test
    — it found 2 matches instead of 1 once a second shape type carried the class, even though the
    life counter itself worked correctly. Fixed by setting `pointerEvents: "all"` inline on a
    plain `<div>` instead — the class was never load-bearing for that behavior (inline style
    wins), so dropping it costs nothing. **Any future custom shape satisfying watch point 6's
    step 4 should set `pointerEvents: "all"` inline, not reuse `.tl-image-container`**, unless it
    genuinely wants to be treated as a pasted image by tests or future code that keys off that
    class name. `MtgCardShapeUtil`'s own use of `.tl-image-container`/`.tl-image` (watch point 6,
    step 4's origin) is unaffected — that one predates and is unrelated to this caution; it's
    called out here only as the second example of the same class being reused, this time safely
    (cards are excluded from the regression test's locator by name).

24. **`editor.on('event', ...)` never observes `target: 'shape'` for a real pointer interaction —
    filtering on `TLPointerEventTarget`'s most obvious-looking case is a silent trap.** (Ticket 05,
    2026-08-11.) A real DOM pointer-down is always dispatched to `Editor.dispatch`/
    `editor.emit('event', ...)` with `target: 'canvas'`. `SelectTool/childStates/Idle.onPointerDown`
    does its own hit-test on that canvas-target event and, when it hits a shape, **recurses into
    itself** with a locally-constructed `{ ...info, target: 'shape', shape }` — that retargeted
    copy is internal to the state chart and never travels back through `Editor.dispatch`, so a
    listener on `editor.on('event', ...)` can never see `target: 'shape'` for a genuine gesture,
    only `target: 'canvas'`. The first implementation of `clearStaleSelectionOnPointerDown`
    filtered on `info.target === 'shape'` — it typechecked, ran, and even passed the new spec
    against that spec's own test shape, then broke `verify-drag-identity.spec.ts`'s
    drag-then-drag case outright (confirmed via console-logging a live gesture, then reading
    `Idle.ts`, not guessed). **The fix: do the same hit-test `Idle` itself does**, via the public,
    `@public`-exported `getHitShapeOnCanvasPointerDown(editor)` — which also already honors
    `editor.options.selectLockedShapes` (`false` by default), so a locked shape (all of this
    table's furniture) is never "hit," matching `Idle`'s own gate for free, no separate
    `isLocked` check needed. **Any future code reaching for `editor.on('event', ...)` to answer
    "what shape did the pointer hit" must call `getHitShapeOnCanvasPointerDown` itself on the
    `target: 'canvas'` event — never trust `info.target === 'shape'` to ever be true.** See
    `architecture.md`'s "Ticket 05" section for the full writeup, including why the listener runs
    strictly after `Editor.dispatch` (so it never fights `PointingShape.onEnter`'s own selection
    decision for the current gesture) and why `markEventAsHandled` callers (the life counter's
    buttons) are immune by construction — `useCanvasEvents.ts` checks `wasEventAlreadyHandled`
    before `editor.dispatch` is ever called, so `editor.emit('event', ...)` never fires for them.

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
