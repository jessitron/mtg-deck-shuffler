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
  `faceDown`, `tapped`, `sleeveColor`, and, since table-layout ticket 18 (2026-08-09), `owner`
  (seatId) and `isCommander` — facts the shape carries, granting no capability), the
  `TLGlobalShapePropsMap` module augmentation that registers `mtg-card` into tldraw's `TLShape`
  union, and `mtgCardShapeProps` (the `RecordProps` validators, imported by client
  `MtgCardShapeUtil.tsx`, server `rooms.ts`, and server `tableFurniture.ts`'s `mtgCardShape()`
  builder, below).
- `apps/tabletop/src/shared/mtgZoneShape.ts` — the same pattern for furniture (ticket 13):
  `MtgZoneShapeProps` (`w`, `h`, `zone` — a closed enum `"playmat" | "library" | "graveyard" |
  "exile" | "stack" | "command"` — `seatId`, `label`), the `TLGlobalShapePropsMap` augmentation
  registering `mtg-zone`, and `mtgZoneShapeProps` validators, imported by client
  `MtgZoneShapeUtil.tsx`, server `rooms.ts`, and server `tableFurniture.ts` (for the `Zone` type
  alias it re-exports). Also home to two shared layout constants both sides must agree on:
  `LIBRARY_PILE_INSET` (12) and, since zone-label-band (2026-08-09, `0d61890`),
  `ZONE_LABEL_BAND` (40) — the headroom every card-holding zone reserves at the top so its label
  stays readable; imported by `cardLayout.ts`, `tableFurniture.ts`, and `MtgZoneShapeUtil.tsx`.
- `apps/tabletop/src/shared/mtgCounterShape.ts` — the same pattern for counters (ticket 18):
  `MtgCounterShapeProps` (`w`, `h`, `text` — free string, blank by default; no domain identity
  beyond its text), the `TLGlobalShapePropsMap` augmentation registering `mtg-counter`, and
  `mtgCounterShapeProps` validators, imported by client `MtgCounterShapeUtil.tsx` and server
  `rooms.ts`. Its doc comment carries the naming-collision note (table-layout ticket 12's life
  counter used `mtg-counter` as a working name; that shape is now named `mtg-life-counter`).

## Client (the ShapeUtils themselves)

- `apps/tabletop/src/client/shapes/SelectionClearingNoteShapeUtil.ts` — **new, ticket 19
  (2026-08-10)**: a thin subclass of tldraw's own `NoteShapeUtil` (imported from `"tldraw"`)
  overriding only `onTranslateEnd` to call `this.editor.setSelectedShapes([])` — supplies the
  drag-settle selection cleanup (watch point 1) that stock notes lack, now that `mtg-card` hosts
  them as passengers alongside counters. Registered in `TablePage.tsx` **in place of** the stock
  `NoteShapeUtil`, not alongside it (watch point 18). Everything else about how a note renders,
  edits, and syncs is untouched tldraw behavior.
- `apps/tabletop/src/client/CardContextMenu.tsx` — **new, ticket 17 (2026-08-09, `eb24a4f`)**:
  the app's first custom `TLComponents.ContextMenu`, wired in `TablePage.tsx`. `TableContextMenu`
  wraps `DefaultContextMenu`, replacing its default content (children replace, not add) with the
  new `mtg-card-actions` group (Flip/Turn face down-up/Tap-Untap, via `CardMenuItems`) plus a
  trimmed stock menu (`ReorderMenuSubmenu` + `ClipboardMenuGroup`). `CardMenuItems` reads the
  selection reactively (`useEditor()` + `useValue(getSelectedShapes().filter(mtg-card))`) and
  routes every action through a `commit(partials, label)` helper
  (`markHistoryStoppingPoint` → `updateShapes` → unconditional trailing
  `editor.setSelectedShapes([])`) — the fix for the stale-selection-after-menu-close hazard, watch
  point 15. See `architecture.md`'s "Ticket 17" section.
- `apps/tabletop/src/client/shapes/cardTap.ts` — **new, ticket 17**: `tapPartial(shape, tapped)`,
  the center-fixed pivot solve (watch point 4) extracted out of `MtgCardShapeUtil` as a
  standalone pure function so the context menu's Tap/Untap item can share it — a menu item has
  no `this.editor`/ShapeUtil instance to call a private method on. Imported by both
  `MtgCardShapeUtil.tsx`'s `onClick` and `CardContextMenu.tsx`.
- `apps/tabletop/src/client/shapes/MtgCardShapeUtil.tsx` — the whole card territory: extends
  `BaseBoxShapeUtil<MtgCardShape>`; `onClick` (tap/untap toggling `props.tapped` with rotation
  as a pure visual delta; since ticket 16, 2026-08-09, also pushes the clicked card's new state
  to the rest of a marquee selection via a `queueMicrotask`-deferred batch — the clicked card's
  own partial stays a synchronous return; see `architecture.md`'s "Ticket 16"; since ticket 17,
  calls the standalone `tapPartial` from `cardTap.ts` instead of a private method),
  `onTranslateEnd` (selection cleanup + zone-entry detection +
  passenger eviction on entering graveyard/exile/library — `NON_BATTLEFIELD_ZONES`, deliberately
  excluding the Stack), `zoneAt()` (private helper — since ticket 14, a thin wrapper around
  `zoneHitTest.ts`'s `topmostZoneAt()`, below; since ticket 18 returning the full `ZoneHit`,
  id+zone), the passenger-hosting drag hooks (`canReceiveNewChildrenOfType`/
  `canRemoveChildrenOfType`, both type-narrowed via `PASSENGER_TYPES` — since ticket 19, `{
  "mtg-counter", "note" }`, was `mtg-counter`-only; `onDragShapesIn` with the rotation-zeroing math,
  since ticket 19 using `getShapeGeometry(...).bounds` instead of `props.w/h` so it covers a stock
  note's `growY`-derived size too; `onDragShapesOut` with the `parentId` filter), `evictPassengers()`
  (private, renamed from `evictCounters` by ticket 19 — calls `findOpenSpotsNearZoneEdge`, below),
  and `component()`/`getIndicatorPath()` (renders its own `<img>`).
- `apps/tabletop/src/client/shapes/MtgZoneShapeUtil.tsx` — extends `BaseBoxShapeUtil<MtgZoneShape>`
  (ticket 13); still defines no interaction hooks at all (`onClick`/`onTranslateEnd`/
  `onDragShapesOver` are all absent — see `architecture.md`/`interactions.md` watch point 7 for why
  that's safe). `component()` renders a plain `<div>` — solid black border for `playmat`, dashed
  `--dark-pink` for everything else — and, since ticket 14 (2026-08-08), reads
  `useIsZoneArmed(this.editor, shape.id)` from `zoneHitTest.ts` to add a glow (`box-shadow` +
  tinted background/border color) while a dragged card is hovering over it. `getIndicatorPath()`.
  Since zone-label-band (2026-08-09, `0d61890`), the sleeve pile it renders for a sleeved library
  starts `ZONE_LABEL_BAND` below the box's top (rendering only — still no hooks).
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
  `shapeUtils = [...defaultShapeUtils.filter((Util) => Util.type !== "note"), MtgCardShapeUtil,
  MtgZoneShapeUtil, MtgCounterShapeUtil, SelectionClearingNoteShapeUtil]`,
  passed to both
  `useSync` and the `<Tldraw shapeUtils={...}>` prop (this app uses the sync hook directly, which
  is why `defaultShapeUtils` must be spread in explicitly; see `architecture.md`). Since ticket 19
  (2026-08-10) the stock `NoteShapeUtil` is filtered out of that spread before
  `SelectionClearingNoteShapeUtil` goes in — `useSync`'s schema builder throws on a duplicate
  `type` where `<Tldraw>`'s own merge wouldn't (watch point 18). Add new custom ShapeUtils here.
  Since ticket 18 it also wires the counter tool: `tools={[MtgCounterTool]}`,
  `overrides` (`uiOverrides.tools` adds the toolbar item), and `components`
  (`ToolbarWithCounter`, a `DefaultToolbar` with the counter item prepended). Since ticket 17
  (2026-08-09) also passes `ContextMenu: TableContextMenu` in the same `components` object —
  see `CardContextMenu.tsx`, above.
  Also home to `aimCameraAtTheTable()` (table-layout ticket 14, `5eeac70`;
  corrected same day, `96159be`): since the square's furniture centers on the origin (mostly
  negative page coordinates, off tldraw's default viewport), the mount hook does one
  **deterministic** `editor.zoomToBounds(TABLE_EXTENT, { inset: 24 })`, where `TABLE_EXTENT`
  (`Box(-2802, -1612, 5604, 3164)`) is the fixed four-compass-slots-plus-Stack extent mirroring
  `cardLayout.ts` — and the camera never moves on its own again (`?d=` deep links suppress the
  framing). The first cut zoomed-to-fit content and listened for the first remote shape arrival;
  that reactive zoom raced Playwright measurements and flaked — see `history.md`'s `96159be`
  entry. Not selection mechanics per se, but Playwright actionability for every drag/click spec
  in this KB depends on it putting the furniture on screen — and tldraw culls off-viewport
  shapes from the DOM, so even bare `.tl-shape` counts need the camera to have everything in
  view.

## Server (identity is minted here, mechanics is not)

- `apps/tabletop/src/server/cardArrival.ts` — mints `props.instanceId` (moved out of `meta` by
  ticket 12) at shape creation (`createShapeId`; no longer mints a tldraw asset record — flip is
  a pure `props.face` write now). Since table-layout ticket 18 (2026-08-09), builds the record via
  `tableFurniture.ts`'s `mtgCardShape()` instead of its own `store.put` literal. Not this owner's
  mechanics territory per se, but the identity contract every hook in `MtgCardShapeUtil` depends
  on.
- `apps/tabletop/src/server/seatJoined.ts` — **the second `mtg-card` mint seam** (table-layout
  ticket 18, 2026-08-09): on a `seat.joined` event carrying 0-2 commanders, mints each commander
  as a real, draggable `mtg-card` plus a locked, `opacity: 0.3` ghost at the identical Command
  Zone spot (`ghostInstanceId()` prefixes the ghost's `instanceId` with `ghost:`, keeping it a
  distinct string from `instanceAlreadyOnTable`'s exact-match dedup in `cardArrival.ts`). The
  ghost is minted via `nextIndex()` *before* the real card in the same `updateStore` call, so it
  paints underneath. Both shapes built via `mtgCardShape()`, below — see `architecture.md`'s
  "Table-layout ticket 18" section and watch point 16.
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
  participates in zone detection. `ensureStackStripWidth()` was fixed here (see
  `architecture.md`'s "Ticket 13" section) to reuse an existing Stack shape's `.index` instead of
  minting a fresh top-of-z-order one on every seat join — and then replaced by
  **`ensureStackDrawn()`** (table-layout ticket 14, `5eeac70`): the Stack is a fixed square drawn
  once, guarded on `store.get(stackId)` existence, so the z-order-promotion bug can't recur by
  construction. The seat name label (`type: "text"`,
  built inline in `ensurePlayerArea`) is now `isLocked: true` (was `false` — any player could
  previously drag/delete another player's name label). Since *table-layout* ticket 13
  (2026-08-08, a different ticket 13 — see `history.md`), `ensurePlayerArea` also draws a
  Command Zone per seat (`zone: "command"`, id `region-command-<table>-<seatId>`, locked, no
  interaction hooks). Since zone-label-band (2026-08-09, `0d61890`), the library card-back image
  insets `ZONE_LABEL_BAND` from the box's top (12 from the other three sides) so the label sits
  above the pile. Consulted by `zoneAt()` but not itself a custom ShapeUtil. Since table-layout
  ticket 18 (2026-08-09), also home to **`mtgCardShape(args: MtgCardShapeArgs)`** (next to
  `zoneShape()`) — the single place every required `mtg-card` prop is listed when building a
  shape record; called by both `cardArrival.ts` and `seatJoined.ts` instead of each writing its
  own `store.put` literal. See watch point 15.
- `apps/tabletop/src/server/cardLayout.ts` — placement geometry, mostly *not* this owner's
  territory, except for one invariant zone detection leans on (since table-layout ticket 13,
  extended by table-layout ticket 14, "the square", `5eeac70`): every pair of zone bounding
  boxes keeps at least a `GAP`-wide (20-unit) empty band from every other — across all four
  compass seats (S/N/E/W by join order, `playerAreaOrigin(seatIndex)`) AND the fixed 1000×1000
  Stack square centered on the origin (`STACK_SIZE`, `stackBounds()`; `STACK_SIZE` deliberately
  exceeds `PLAYMAT_H` so E/W areas never overlap N/S) — asserted pairwise via a `separation()`
  helper in `apps/tabletop/test/cardLayout.test.ts`, because overlapping AABBs would make
  `topmostZoneAt()`'s draw-order tiebreak decide zone membership, which is deterministic but
  meaningless (watch point 8). Most furniture now sits at negative page coordinates;
  `topmostZoneAt()` is sign-agnostic (verified at ticket 14's `-review`). Since `96159be`:
  `MAX_SEATS` (= 4, the compass slot count) is exported, and `playerAreaOrigin(seatIndex)`
  **throws** past it instead of wrapping a fifth seat onto the S slot (which would have silently
  broken the disjointness invariant); `seatJoined.ts` and `cardArrival.ts` refuse with 409
  ("table is full: 4 seats") before ever reaching the throw. Since zone-label-band (2026-08-09,
  `0d61890`), every card-holding zone is at least `CARD_H + ZONE_LABEL_BAND` (278) tall — library
  278, command zone `=== LIBRARY_H` by definition (the graveyard's gap from the command zone
  depends on the two top boxes matching heights), exile 278, graveyard the 356 remainder — all
  asserted in `test/cardLayout.test.ts`; the disjointness invariant passed unchanged.

## Tests

- `apps/tabletop/test/verification/helpers.ts` — **new, `tabletop-verify-helpers`
  (2026-08-10, `c025293`)**: shared Playwright helpers for `test/verification/*.spec.ts`,
  extracted out of five specs that had each drifted their own near-identical copies.
  Exports `fakeTraceparent()`, `cardPlayed(tableId, overrides)`, `openTable(page, tableSlug)`
  (goto + wait for `.tl-canvas`), `zoomToFit(page)` (Shift+1 + a 300ms settle wait — the
  same camera-animation-settle hazard class as `aimCameraAtTheTable`'s determinism fix
  above, confirmed during this owner's `-context` consult, not a per-spec calibration),
  `placeCard(page, baseURL, tableSlug, instanceId, payloadOverrides?)` (POSTs `card.played`,
  waits for `#shape\:card-<id>` to attach, returns the `Locator`; defaults `cardName` to
  "Llanowar Elves" with `payloadOverrides` spread last so a caller's `zoneHint` always wins
  over the default `"stack"`), `center(locator)`, and the drag primitives `dragPointTo`/
  `dragCenterTo` (the canonical `move → down → move(steps: 10) → up` sequence), with
  `dragBy`/`dragCardTo` now thin wrappers over `dragPointTo`/`center` instead of each
  re-implementing the mouse sequence. **New specs should reach for this module instead of
  re-deriving `cardPlayed`/`placeCard`/drag helpers.**
  - `verify-drag-identity.spec.ts`'s two-card setup goes through the shared `placeCard` but
    keeps its own `zoneHint: "battlefield"` override (not the shared default `"stack"`),
    called out in a comment at the call site: `"stack"` places both cards at the same
    position, making click-selection of the second card ambiguous — exactly the
    drag-identity regression's own setup precondition (see `959831c` above).
  - `steps: 10` was confirmed uniform across all four drag-using specs' call sites (no
    hidden per-spec drift found during the extraction). The one `steps: 5` in
    `verify-zone-entry.spec.ts` is a small in-zone repositioning nudge, not part of a shared
    drag primitive, and was deliberately left inline rather than folded into `dragPointTo`.
  - `verify-counter.spec.ts` keeps its own local `topGrip()` helper (grips a card near its
    top edge, to avoid grabbing an attached counter riding lower on the card) — specific to
    counter-vs-card grip disambiguation, not shared by the other four specs.
  - Pure extraction: full Playwright verification suite (36 tests) passes unchanged.
- `apps/tabletop/test/verification/verify-zone-armed.spec.ts` — **new, ticket 14**: verifies the
  armed-glow appearance during a live drag, and (via a two-browser-context setup) that the armed
  state is genuinely local/unsynced — dragging on client A never shows armed styling on client B's
  copy of the same zone shape.
- `apps/tabletop/test/verification/verify-drag-identity.spec.ts` — regression test for the
  `959831c` drag-identity bug. Plays two lands, drags first, drags second, asserts only the
  second moved.
- `apps/tabletop/test/verification/verify-multi-untap.spec.ts` — **new, ticket 16
  (2026-08-09, `626ab6f`)**: the tripwire on the undocumented `PointingShape.onPointerUp`
  ordering multi-untap depends on (watch point 14). Three tests: marquee + click propagates
  tapped state and ONE Ctrl+Z reverts the whole gesture leaving an earlier tap alone; the
  propagation is a state push, not a per-card toggle (mixed selection converges); a remote
  peer's undo is a no-op while the acting player's undo still reverts and syncs. Carries the
  marquee-over-locked-furniture brushing helper, the post-marquee ~500ms cooldown, and the
  bounding-box-orientation tapped assertion (watch point 13 d-f).
- `apps/tabletop/test/seatJoined.test.ts` — since `96159be`, the event-handler-seam twin of
  `cardLayout.test.ts`'s pure-geometry invariant: asserts the ≥ `GAP` zone-AABB disjointness
  over the 21 actually-drawn `mtg-zone` shapes at a full 4-seat table (five per seat + the
  Stack), and that a fifth `seat.joined` gets 409 instead of a player area drawn on top of the
  S seat's. Catches `tableFurniture.ts` drifting from `cardLayout.ts` where the geometry test
  can't. Since table-layout ticket 18 (2026-08-09), its "seat joined — commanders" describe
  block asserts the ghost mechanism's data-level facts: one real (`isLocked: false`) `mtg-card`
  per commander plus one locked, `0 < opacity < 1` ghost at the same position, distinct
  `instanceId`s, the real card's `index` sorting above the ghost's, two commanders each getting
  their own ghost, and the seat's sleeve baked into both. It does not drive a pointer at the
  ghost — see watch point 16.
- `apps/tabletop/test/verification/verify-counter.spec.ts` — **new, ticket 18**: counter
  attach/ride/detach, the stale-counter-selection regression (drag counter, then drag card —
  the card must move), two counters evicting to the graveyard's edge when the host card dies,
  and in-place text editing. Its `createCounter` helper carries the ~500ms
  post-creation cooldown (tldraw's double-click window; see watch point 13).
- `apps/tabletop/test/openSpotNearZoneEdge.test.ts` — **new, ticket 18**: unit tests for the
  pure eviction geometry.
- `apps/tabletop/test/verification/verify-flip-face-down.spec.ts` — **new, ticket 17
  (2026-08-09, `eb24a4f`/`ff5d58a`)**: mostly `two-faced-cards` coverage (flip/face-down
  behavior, two-client sync convergence for both), but includes this owner's regression test —
  "flipping card A does not leave a stale selection that hijacks a later drag of card B" (watch
  point 15).
- `apps/tabletop/test/verification/verify-note.spec.ts` — **new, ticket 19 (2026-08-10)**: notes
  as passengers — attach/ride/detach, battlefield-exit eviction to the graveyard's edge, an
  unattached note left alone by a nearby card's move, and this owner's regression test —
  "after dragging a note, dragging a card moves the card (stale-selection regression)" — mirroring
  `verify-counter.spec.ts`'s Hazard-A test, deliberately without test-side selection cleanup so the
  assertion proves the product clears selection, not the test (watch point 18).

## Read-only dependency (not owned, but load-bearing — read when things surprise you)

- `node_modules/tldraw/src/lib/tools/SelectTool/childStates/PointingShape.ts` — selection-on-enter
  deferral logic (`onClick` truthiness check), `startTranslating`'s force-reselect safety net.
- `node_modules/tldraw/src/lib/tools/SelectTool/childStates/Translating.ts` — what happens once a
  drag is confirmed; reads `getSelectedShapeIds()` to decide what to move.
- `node_modules/@tldraw/editor/src/lib/editor/shapes/ShapeUtil.ts:968` — the base `onClick?`
  declaration (optional, no default implementation) that makes the truthiness check above mean
  "does this ShapeUtil define onClick at all," not "what does it do."
