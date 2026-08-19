# Files

**Rewritten wholesale 2026-08-08** in two tickets. Ticket 12 (`.scratch/tabletop-physics/
issues/12-*.md`) landed the `mtg-card` custom-shape rewrite decided by ticket 02, deleting
`MtgCardImageShapeUtil.tsx`. Ticket 13 (`.scratch/tabletop-physics/issues/13-*.md`) did the same
for furniture, adding `mtg-zone` alongside it — no file was deleted for this one since furniture
was never its own file (it lived inside `tableFurniture.ts`'s shape-builder functions). Ticket 14
(`.scratch/tabletop-physics/issues/14-*.md`, same day) added `zoneHitTest.ts`, extracting the
zone hit test into a function shared by both `MtgCardShapeUtil` and `MtgZoneShapeUtil`. Ticket 18
(`.scratch/tabletop-physics/issues/18-counters.md`, 2026-08-08, `4c64ef2`) added the third shape
type `mtg-counter` plus its creation tool and the eviction-geometry seam. **`MtgCardShapeUtil.tsx`
split by hook, tabletop-architecture ticket 01 (2026-08-11)**: `cardRender.tsx`, `cardTapClick.ts`,
`cardPassengers.ts`, `cardZoneEntry.ts` added; `MtgCardShapeUtil.tsx` itself shrank to a thin shell
— see its own entry below for the full breakdown.

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
  "exile" | "stack" | "command"` — `seatId`, `label`, `sleeveColor`, and, since 2026-08-11,
  `imageUrl: string | null` — the playmat's own picture, set only on `zone: "playmat"`, same
  mint-once/never-mutated lifecycle as `sleeveColor`), the `TLGlobalShapePropsMap` augmentation
  registering `mtg-zone`, and `mtgZoneShapeProps` validators, imported by client
  `MtgZoneShapeUtil.tsx`, server `rooms.ts`, and server `tableFurniture.ts` (for the `Zone` type
  alias it re-exports). Also home to two shared layout constants both sides must agree on:
  `LIBRARY_PILE_INSET` (12) and, since zone-label-band (2026-08-09, `0d61890`),
  `ZONE_LABEL_BAND` (40) — the headroom every card-holding zone reserves at the top so its label
  stays readable; imported by `cardLayout.ts`, `tableFurniture.ts`, and `MtgZoneShapeUtil.tsx`.
- `apps/tabletop/src/shared/mtgLifeCounterShape.ts` — **new, table-layout ticket 20
  (2026-08-10)**: the same pattern for the life counter — `MtgLifeCounterShapeProps` (`w`, `h`,
  `value`, no ownership enforcement — any player can change any counter), the
  `TLGlobalShapePropsMap` augmentation registering `mtg-life-counter`, and
  `mtgLifeCounterShapeProps` validators, imported by client `MtgLifeCounterShapeUtil.tsx` and
  server `rooms.ts`. Not to be confused with `mtgCounterShape.ts` below, a different shape
  (`mtg-counter`, the drag-onto-a-card disc) — the naming-collision note in that file's doc
  comment applies here too.
- `apps/tabletop/src/shared/mtgTitleShape.ts` — **new, editable-deck-title (2026-08-12,
  `96551ef`)**: the same pattern for the deck-title label — `MtgTitleShapeProps` (`w`, `h`,
  `text` — free string), the `TLGlobalShapePropsMap` augmentation registering `mtg-title`, and
  `mtgTitleShapeProps` validators, imported by client `MtgTitleShapeUtil.tsx` and server
  `rooms.ts`. Replaces the stock `text` shape that used to hold the seat name label. See
  `architecture.md`'s "editable deck title" section.
- `apps/tabletop/src/shared/mtgCounterShape.ts` — the same pattern for counters (ticket 18):
  `MtgCounterShapeProps` (`w`, `h`, `text` — free string, blank by default; no domain identity
  beyond its text), the `TLGlobalShapePropsMap` augmentation registering `mtg-counter`, and
  `mtgCounterShapeProps` validators, imported by client `MtgCounterShapeUtil.tsx` and server
  `rooms.ts`. Its doc comment carries the naming-collision note (table-layout ticket 12's life
  counter used `mtg-counter` as a working name; that shape is now named `mtg-life-counter`).

## Client (the ShapeUtils themselves)

- `apps/tabletop/src/client/shapes/MtgLifeCounterShapeUtil.tsx` — **new, table-layout ticket 20
  (2026-08-10)**: extends `BaseBoxShapeUtil<MtgLifeCounterShape>`, no interaction hooks (same
  shape as `MtgZoneShapeUtil` — locked, never clicked/dragged as a shape). `component()` renders
  +/- buttons and an always-live typeable number field via the `HyperlinkButton` pattern
  (`pointer-events: all` inline, `editor.markEventAsHandled(e)` on pointer handlers) — deliberately
  does NOT reuse tldraw's `.tl-image-container` class the way `MtgCounterShapeUtil` does (watch
  point 23). Its `setValue` wraps every prop write in `this.editor.run(fn, { ignoreShapeLock:
  true })` — the new lock-gate finding, watch point 22 — since a locked shape's props are
  otherwise silently unwritable through the ordinary `editor.updateShape` call, even from a DOM
  handler inside `component()`. See `architecture.md`'s life-counter section.
- `apps/tabletop/src/client/shapes/MtgTitleShapeUtil.tsx` — **new, editable-deck-title
  (2026-08-12, `96551ef`)**: extends `BaseBoxShapeUtil<MtgTitleShape>`, no interaction hooks (same
  locked-shape posture as `MtgZoneShapeUtil`/`MtgLifeCounterShapeUtil`). `component()` renders an
  always-live `<input>` bound to a local `useState` draft (`value={draft ?? text}`), committing to
  the synced `text` prop only on blur/Enter (`setText` → `commitDraft`) and discarding on Escape.
  Follows the life-counter pattern: `pointerEvents: "all"` inline (not `.tl-image-container`, watch
  point 23), `markEventAsHandled` on `onPointerDown`, and `setText` wrapping its `updateShape` in
  `this.editor.run(fn, { ignoreShapeLock: true })` (watch point 22, second consumer). `onKeyDown`
  calls `e.stopPropagation()` for every key so tldraw's tool hotkeys don't fire mid-word (watch
  point 10b, always-live-input case). Green-serif appearance is a faithful reproduction of the old
  stock label; the on-brand Orbitron treatment is a separate, unratified decision. See
  `architecture.md`'s "editable deck title" section.
- `apps/tabletop/src/client/clearStaleSelectionOnPointerDown.ts` — **new, ticket 05
  (2026-08-11)**: `clearStaleSelectionOnPointerDown(editor)`, registered once at Tldraw mount
  (`TablePage.tsx`'s `onTldrawMount`). On every `pointer_down` with `target: 'canvas'`, calls
  tldraw's own `getHitShapeOnCanvasPointerDown(editor)` and, if the hit shape isn't already in
  `editor.getSelectedShapeIds()`, clears the selection. **Supersedes every per-shape
  `onTranslateEnd`/`commit()` clear this KB previously documented** — `MtgCardShapeUtil`'s,
  `MtgCounterShapeUtil`'s, and `CardContextMenu.tsx`'s `commit()`'s selection-clearing lines were
  all deleted, and `SelectionClearingNoteShapeUtil`/`SelectionClearingImageShapeUtil` (below,
  removed) are gone entirely, since their sole purpose was carrying a hook this file now makes
  unnecessary for any shape. Also closes a gap the distributed sites structurally could not: a
  shape selected by a plain click with no drag, which never fires `onTranslateEnd` at all. See
  watch point 1 and watch point 24 (the `target: 'canvas'`-not-`'shape'` gotcha this file's
  comment documents in full) and `architecture.md`'s "Ticket 05" section.
  `SelectionClearingNoteShapeUtil.ts` and `SelectionClearingImageShapeUtil.ts` — **deleted, ticket
  05**: thin subclasses of tldraw's stock `NoteShapeUtil`/`ImageShapeUtil` that existed solely to
  add the `onTranslateEnd` selection-clear those stock utils lacked (ticket 19 and the
  2026-08-10 pasted-image fix, respectively). No longer needed now that
  `clearStaleSelectionOnPointerDown` covers every shape type centrally; both stock utils are back
  in the plain `defaultShapeUtils` spread with no filtering or replacement.
- `apps/tabletop/src/client/closeContextMenuBeforeOutsideClick.ts` — **new, 2026-08-19**: exports
  `closeContextMenuBeforeOutsideClick(): () => void`, registered from `onTldrawMount` in
  `TablePage.tsx` alongside `clearStaleSelectionOnPointerDown`. A document-level capture-phase
  `pointerdown` listener that dispatches a synthetic Escape keydown, ahead of `@tldraw/editor`'s own
  `MenuClickCapture`, whenever a left-button click lands outside an open menu's own DOM — forcing
  Radix's own close handshake to run before `MenuClickCapture`'s direct `clearOpenMenus()` call would
  otherwise desync it from Radix's internal open state. See `architecture.md`'s "The right-click
  context menu going dead" section and `interactions.md` watch point 26.
- `apps/tabletop/src/client/CardContextMenu.tsx` — **new, ticket 17 (2026-08-09, `eb24a4f`)**:
  the app's first custom `TLComponents.ContextMenu`, wired in `TablePage.tsx`. `TableContextMenu`
  wraps `DefaultContextMenu`, replacing its default content (children replace, not add) with the
  new `mtg-card-actions` group (Flip/Turn face down-up/Tap-Untap, via `CardMenuItems`) plus a
  trimmed stock menu (`ReorderMenuSubmenu` + `ClipboardMenuGroup`). `CardMenuItems` reads the
  selection reactively (`useEditor()` + `useValue(getSelectedShapes().filter(mtg-card))`) and
  routes every action through a `commit(partials, label)` helper
  (`markHistoryStoppingPoint` → `updateShapes`) — historically also ended with an unconditional
  trailing `editor.setSelectedShapes([])`, the fix for the stale-selection-after-menu-close hazard,
  watch point 15; **that trailing clear was deleted by ticket 05 (2026-08-11)** — see
  `architecture.md`'s "Ticket 17" (historical mechanism) and "Ticket 05" (the superseding fix)
  sections.
- `apps/tabletop/src/client/shapes/cardTap.ts` — **new, ticket 17**: `tapPartial(shape, tapped)`,
  the center-fixed pivot solve (watch point 4) extracted out of `MtgCardShapeUtil` as a standalone
  pure function so the context menu's Tap/Untap item can share it — a menu item has no
  `this.editor`/ShapeUtil instance to call a private method on. `tapPartialsForCards(cards,
  tapped)` is a plain `(cards: MtgCardShape[], tapped: boolean)` helper with no `Editor`
  parameter. Imported by `cardTapClick.ts`'s `handleCardClick` (below) and by
  `CardContextMenu.tsx`.
- `apps/tabletop/src/client/shapes/MtgCardShapeUtil.tsx` — **reduced to a thin `ShapeUtil` shell,
  tabletop-architecture ticket 01 (2026-08-11, organizational split, zero behavior change: 110/110
  vitest + 43/44 Playwright pass before and after — the one failure,
  `verify-life-counter.spec.ts:102`, reproduces identically on unmodified `main` — **corrected
  2026-08-11: this was a deterministic furniture-image-count bug, not flakiness; see
  `history.md`'s "Correction" entry of that date**).** Was 388 lines
  holding every hook's full body; now 83 lines. Still extends `BaseBoxShapeUtil<MtgCardShape>`,
  still declares every override tldraw needs to see (`onClick` etc. — see watch point 1, this is
  load-bearing: it's the override's *presence*, not its body, that changes tldraw's selection
  behavior) — but every override is now a one-line call into a sibling file, `this.editor` passed
  through explicitly as `editor`:
  - `component(shape)` → `CardFace({shape})`, `getIndicatorPath(shape)` → `cardIndicatorPath(shape)`
    — both in `cardRender.tsx`, below.
  - `onClick(shape)` → `handleCardClick(editor, shape)` — in `cardTapClick.ts`, below.
  - `canReceiveNewChildrenOfType`/`canRemoveChildrenOfType` → `canReceivePassenger`/
    `canRemovePassenger`; `onDragShapesIn`/`onDragShapesOut` → `handleDragShapesIn`/
    `handleDragShapesOut(editor, ...)` — all in `cardPassengers.ts`, below.
  - `onTranslateEnd(_initial, current)` → `handleTranslateEnd(editor, current)` — in
    `cardZoneEntry.ts`, below.
  **This was grilled, not assumed**: the ticket's original proposal was a CardPhysics/interop
  architectural seam (separate tldraw-plumbing from domain rules); grilling found no clean seam of
  that kind exists — every hook mixes a tldraw quirk with a card rule inseparably.
  Jess's call was explicitly organizational: split by hook for navigability, keep pulling out
  anything genuinely tldraw-free (already done previously — `tapPartial`, `topmostZoneAt`,
  `findOpenSpotsNearZoneEdge` — none of that changed here), but don't invent a false purity
  boundary elsewhere. **Every mechanism this KB documents (the `onClick` selection-deferral quirk,
  the `queueMicrotask` undo-coalescing, the rotation-zeroing math, the zone-entry debounce) is
  unchanged — only which file its body lives in moved.** See `architecture.md`'s "Ticket 01"
  section and `history.md`.
- `apps/tabletop/src/client/shapes/cardRender.tsx` — **new, ticket 01**: `component()`'s JSX body
  (exported as `CardFace({shape})`) and `getIndicatorPath`'s body (`cardIndicatorPath(shape)`),
  plus the tap catch-up `useLayoutEffect` (ticket 15's WAAPI counter-rotate-then-ease-to-0, keyed
  on `props.tapped`). Pulled out verbatim; still tldraw-dependent (`HTMLContainer`, React hooks) —
  not a tldraw-free module, just a smaller file.
- `apps/tabletop/src/client/shapes/cardTapClick.ts` — **new, ticket 01**: `onClick`'s full body
  (`handleCardClick(editor, shape)`) — tap/untap toggling `props.tapped` with rotation as a pure
  visual delta, plus ticket 16's multi-untap propagation (the `queueMicrotask` undo-coalescing
  batch to the rest of a marquee selection, preserved verbatim with its ordering-hazard comment —
  see watch point 14). Calls the standalone `tapPartial` from `cardTap.ts`, above.
- `apps/tabletop/src/client/shapes/cardPassengers.ts` — **new, ticket 01**: `PASSENGER_TYPES`, the
  two `can*` gates (`canReceivePassenger`/`canRemovePassenger`), and `onDragShapesIn`/
  `onDragShapesOut`'s bodies (`handleDragShapesIn`/`handleDragShapesOut(editor, ...)`), including
  the rotation-zeroing math for `reparentShapes`' page-rotation-preservation quirk (watch point 12)
  and the `parentId` filter for `onDragShapesOut` (watch point 11).
- `apps/tabletop/src/client/shapes/cardZoneEntry.ts` — **new, ticket 01**: `NON_BATTLEFIELD_ZONES`,
  `onTranslateEnd`'s body (`handleTranslateEnd(editor, current)`), and its two former-private
  helpers `zoneAt`/`evictPassengers`, now module-level functions taking `editor` explicitly instead
  of reading `this.editor`. **`onTranslateEnd`'s own `setSelectedShapes([])` call was already gone
  before this split** — ticket 05 (2026-08-11, the same day) centralized that into
  `clearStaleSelectionOnPointerDown.ts`; this file's `handleTranslateEnd` never had that line to
  carry over. **Since 2026-08-16**, also home to the Stack-landing collision check —
  `nudgeOffAnotherCard`/`overlapFraction`, both module-local — fired only on a fresh drag-entry
  into `"stack"`, nudging a dropped card right off another it would otherwise fully hide. See
  `architecture.md`'s "Stack landing collision avoidance" section and `interactions.md` watch
  point 25 (the rotation/page-bounds gotcha this caught during `-review`).
- `apps/tabletop/src/client/shapes/MtgZoneShapeUtil.tsx` — extends `BaseBoxShapeUtil<MtgZoneShape>`
  (ticket 13); still defines no interaction hooks at all (`onClick`/`onTranslateEnd`/
  `onDragShapesOver` are all absent — see `architecture.md`/`interactions.md` watch point 7 for why
  that's safe). `component()` renders a plain `<div>` — solid black border for `playmat`, dashed
  `--dark-pink` for everything else — and, since ticket 14 (2026-08-08), reads
  `useIsZoneArmed(this.editor, shape.id)` from `zoneHitTest.ts` to add a glow (`box-shadow` +
  tinted background/border color) while a dragged card is hovering over it. `getIndicatorPath()`.
  Since zone-label-band (2026-08-09, `0d61890`), the sleeve pile it renders for a sleeved library
  starts `ZONE_LABEL_BAND` below the box's top (rendering only — still no hooks). **Since
  2026-08-11**, the playmat branch also sets `position: relative; overflow: hidden` on the bordered
  div and, when `props.imageUrl` is set, renders the playmat's own picture as a plain inline-styled
  `<img>` (`position: absolute; inset: 0; object-fit: cover`) clipped to that div's border-radius —
  deliberately not tldraw's `.tl-image` class (positioned relative to a different wrapper,
  `.tl-image-container`, and would escape this div's clip). Still no new hooks, still rendering-only
  — see `architecture.md`'s "playmat's own picture" note and `history.md`'s 2026-08-11 entry.
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
  `MtgZoneShapeUtil.tsx` (`component()`, live armed-glow rendering). Since 2026-08-10, `ZoneHit`
  also carries `seatId` (was just `{id, zone}`), and `armedZoneIdSignal` gates command zones on
  ownership via a new private `allDraggedCardsAreOwnersCommander(editor, seatId)` — see
  `architecture.md`'s "Command zones only arm for their owner's commander" section and
  `interactions.md` watch point 19. Every non-command zone type is unaffected.
- `apps/tabletop/src/client/shapes/MtgCounterShapeUtil.tsx` — **new, ticket 18**: extends
  `BaseBoxShapeUtil<MtgCounterShape>`. Deliberately no `onClick` (text editing is stock
  double-click-to-edit via `canEdit()`, avoiding the selection-deferral quirk); previously also
  defined `onTranslateEnd` purely to clear selection (watch point 1's generalized cleanup) — that
  override was deleted entirely by ticket 05 (2026-08-11), since it had no other purpose and the
  centralized `clearStaleSelectionOnPointerDown.ts` covers this shape too. `component()` renders
  the disc (or, while editing, an `<input>` with the `setTimeout(0)` focus workaround,
  `markEventAsHandled` on pointer-down, and Enter/Escape → `editor.complete()`);
  `isAspectRatioLocked()` keeps it square. Exports `COUNTER_SIZE` (44).
- `apps/tabletop/src/client/shapes/MtgCounterTool.ts` — **new, ticket 18**: `StateNode` with id
  `"mtg-counter"`; click-to-place one counter at the pointer, then back to the select tool. The
  minimal creation affordance (flagged as an assumption in the ticket outcome).
- `apps/tabletop/src/client/shapes/openSpotNearZoneEdge.ts` — **new, ticket 18**:
  `findOpenSpotsNearZoneEdge(request)`, pure geometry over plain `Rect`s (no `Editor`, unit-
  tested) — picks the zone edge nearest the card's entry point and alternates slots outward,
  skipping occupied rects; overlap beats failure. Used only by `evictCounters`.
- `apps/tabletop/src/client/TablePage.tsx` — registers
  `shapeUtils = [...defaultShapeUtils, MtgCardShapeUtil, MtgZoneShapeUtil, MtgCounterShapeUtil,
  MtgLifeCounterShapeUtil, MtgTitleShapeUtil]` (the last added editable-deck-title, 2026-08-12),
  passed to both `useSync` and the `<Tldraw shapeUtils={...}>` prop
  (this app uses the sync hook directly, which is why `defaultShapeUtils` must be spread in
  explicitly; see `architecture.md`). **Since ticket 05 (2026-08-11), `defaultShapeUtils` is
  spread in whole again — no filtering, no `SelectionClearing*` replacements** — ticket 19's
  (2026-08-10) `"note"` filter and the later `"image"` filter both existed only to make room for
  the now-deleted subclasses; with `clearStaleSelectionOnPointerDown` covering every shape type
  centrally, the stock `NoteShapeUtil`/`ImageShapeUtil` need no replacement at all. Add new custom
  ShapeUtils here. Since ticket 18 it also wires the counter tool: `tools={[MtgCounterTool]}`,
  `overrides` (`uiOverrides.tools` adds the toolbar item), and `components`
  (`ToolbarWithCounter`, a `DefaultToolbar` with the counter item prepended). Since ticket 17
  (2026-08-09) also passes `ContextMenu: TableContextMenu` in the same `components` object —
  see `CardContextMenu.tsx`, above. **Since ticket 05**, the mount callback
  (`aimCameraAtTheTable`, passed to `<Tldraw onMount={...}>`) is renamed `onTldrawMount` and does
  two things, not one: the existing deterministic `editor.zoomToBounds(TABLE_EXTENT, ...)` camera
  framing, plus registering `clearStaleSelectionOnPointerDown(editor)` — see
  `clearStaleSelectionOnPointerDown.ts`, above, and `architecture.md`'s "Ticket 05" section.
  **Since 2026-08-19**, `onTldrawMount` also registers `closeContextMenuBeforeOutsideClick()` and
  returns its cleanup function — the first time this callback has returned anything, since
  `clearStaleSelectionOnPointerDown` never needed teardown. See `closeContextMenuBeforeOutsideClick.ts`,
  above.
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
  **Since 2026-08-12**, also home to `useCopyHint()` (mounted from `ToolbarWithCounter`) and
  `uiOverrides.actions.copy` — a toast telling players ctrl+c doesn't work here. Not this owner's
  core charge (clipboard event wiring, not a ShapeUtil hook or selection state), but recorded
  because it landed in this file and rests on a real tldraw quirk (`useKeyboardShortcuts`'s
  `SKIP_KBDS` list never wires `copy`/`cut`/`paste`/`asset` to keyboard dispatch, so the keyboard
  path has to be caught by racing tldraw's own native clipboard listener with a capturing one on
  `window`) — see `history.md`'s "Copy hint" entry for the full writeup.

## Server (identity is minted here, mechanics is not)

- `apps/tabletop/src/server/cardArrival.ts` — exports `applyCardArrival(tableName, body)`, the
  shared validation/dedup/`ensurePlayerArea`/placement logic; mints `props.instanceId` (moved out
  of `meta` by ticket 12) at shape creation (`createShapeId`; no longer mints a tldraw asset
  record — flip is a pure `props.face` write now). Since table-layout ticket 18 (2026-08-09),
  builds the record via `tableFurniture.ts`'s `mtgCardShape()` instead of its own `store.put`
  literal. **Since tabletop-spine-sse-subscriber ticket 02 (2026-08-18), this file has no HTTP
  entry point of its own** — the old production route (`POST /api/tables/:tableName/cards`,
  `handleCardArrival`) was deleted; `applyCardArrival` is now called by
  `spineEventDispatch.ts`'s `dispatchSpineEvent` in production, and by `testSeedRoute.ts`'s
  `handleTestCardSeed` (a test-only HTTP seam, `ENABLE_TEST_SEED_ROUTE=true` only) in tests. Not
  this owner's mechanics territory per se, but the identity contract every hook in
  `MtgCardShapeUtil` depends on.
- `apps/tabletop/src/server/spineEventDispatch.ts` — **new, tabletop-spine-sse-subscriber ticket
  01**: `dispatchSpineEvent(tableName, event)`, the production entry point for `card.played` —
  filters the Spine's per-table SSE stream for that event name, continues the trace from the
  broadcast envelope's `traceparent`, and calls `applyCardArrival`. Not this owner's mechanics
  territory (no ShapeUtil, no selection state) but recorded here since it replaced the old HTTP
  route this file used to document.
- `apps/tabletop/src/server/testSeedRoute.ts` — **new, tabletop-spine-sse-subscriber ticket 02**:
  `handleTestCardSeed`, a test-only HTTP seam at `POST /test/tables/:tableName/cards`, mounted
  only when `ENABLE_TEST_SEED_ROUTE=true` (set by `verify.sh` and `cardArrival.test.ts`) — calls
  `applyCardArrival` directly, for Playwright specs and vitest files that spawn the server as its
  own process with no live Spine to seed a card through. Never mounted in production.
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
  "mtg-life-counter": {...}, "mtg-title": {...}, "mtg-zone": {...} } })` (`"mtg-title"` added
  editable-deck-title, 2026-08-12).
  The server-side twin of `TablePage.tsx`'s client registration; same "must spread the defaults
  explicitly" gotcha applies here, on the schema-validation side (see `architecture.md`).
- `apps/tabletop/src/server/tableFurniture.ts` — **new exported `FURNITURE_IMAGE_ID_MARKER =
  "furniture-image-"` constant (2026-08-11)**: prefixed onto every locked background-picture
  furniture shape's id (`matImageId`, `libraryImageId` in `ensurePlayerArea`) so a Playwright spec
  can exclude "this table's own decor" from a generic `[data-shape-type="image"]` locator by
  construction, rather than each spec inventing its own carve-out. Adopted by
  `verify-life-counter.spec.ts` (see `history.md`'s "Correction" entry, 2026-08-11) — generalizes
  the ad hoc idiom `verify-image-selection.spec.ts` already used for a card's own face image.
  **Any future locked background-picture furniture should mint its id with this same prefix.**
  **Two per-room `IndexKey` counters since 2026-08-10 (watch point 21)**: `nextIndex(tableName)` (the original `getIndexAbove`/
  `ZERO_INDEX_KEY` chain) mints **only cards** now — `cardArrival.ts` and `seatJoined.ts`'s
  commander/ghost mints, both already card-only callers, needed no change — while a new
  `nextFurnitureIndex(tableName)`, chained via `getIndexBelow(...)` off `null`, mints every
  furniture shape inside `ensurePlayerArea`/`ensureStackDrawn`. The two bands are disjoint by
  construction (fractional indexing is lexicographic; a `getIndexBelow(null)` chain always sorts
  below `ZERO_INDEX_KEY` and anything built above it), which is what makes "furniture always
  renders behind every card" structurally true instead of an artifact of mint order. Any future
  furniture-minting call site must use `nextFurnitureIndex`, not `nextIndex`.
  **ticket 13**: `zoneShape()` now builds real
  `mtg-zone` shape records (`type: "mtg-zone"`, `props: { w, h, zone, seatId, label }`, always
  `isLocked: true`) instead of stock `geo`/`image` shapes tagged with `meta.zone`; the old
  `RegionStyle`/`DEFAULT_REGION_STYLE`/`PLAYMAT_REGION_STYLE` styling machinery was deleted
  (visual treatment now lives in `MtgZoneShapeUtil.component()`). `imageShape()` (background
  *pictures* rendered as stock `image` shapes) stays separate and never participates in zone
  detection — but **since 2026-08-11 it's used only for the library's card-back picture**; the
  playmat's picture is no longer minted this way at all. `ZoneShapeArgs`/`zoneShape()` gained an
  `imageUrl?: string | null` field threaded from `ensurePlayerArea`'s `look.playmatImageUrl` into
  the `mtg-zone` record's own `props.imageUrl` — the old `matImageId`/`AssetRecordType`/
  `imageAsset()`/`imageShape()` sequence for the playmat was deleted outright, not just refactored.
  See `history.md`'s 2026-08-11 entry ("playmat's picture folds into `mtg-zone`'s own
  props/render"). `ensureStackStripWidth()` was fixed here (see
  `architecture.md`'s "Ticket 13" section) to reuse an existing Stack shape's `.index` instead of
  minting a fresh top-of-z-order one on every seat join — and then replaced by
  **`ensureStackDrawn()`** (table-layout ticket 14, `5eeac70`): the Stack is a fixed square drawn
  once, guarded on `store.get(stackId)` existence, so the z-order-promotion bug can't recur by
  construction. The seat name label (built inline in `ensurePlayerArea`) is `isLocked: true` (was
  `false` — any player could previously drag/delete another player's name label) and, **since
  editable-deck-title (2026-08-12, `96551ef`), is a `type: "mtg-title"` shape, not stock `type:
  "text"`** — same `labelId`/lock/z-index slot, but now editable in place via its own `<input>`
  (the old `richText`/`toRichText`/`color`/`font`/`autoSize`/`scale` props and the `toRichText`
  import are gone; width is `PLAYMAT_W - LIFE_COUNTER_W - GAP`, height `NAME_LABEL_HEIGHT`, both now
  imported/exported from `cardLayout.ts`). See `history.md`'s "editable deck title" entry. Since
  *table-layout* ticket 13
  (2026-08-08, a different ticket 13 — see `history.md`), `ensurePlayerArea` also draws a
  Command Zone per seat (`zone: "command"`, id `region-command-<table>-<seatId>`, locked, no
  interaction hooks). Since zone-label-band (2026-08-09, `0d61890`), the library card-back image
  insets `ZONE_LABEL_BAND` from the box's top (12 from the other three sides) so the label sits
  above the pile. Consulted by `zoneAt()` but not itself a custom ShapeUtil. Since table-layout
  ticket 18 (2026-08-09), also home to **`mtgCardShape(args: MtgCardShapeArgs)`** (next to
  `zoneShape()`) — the single place every required `mtg-card` prop is listed when building a
  shape record; called by both `cardArrival.ts` and `seatJoined.ts` instead of each writing its
  own `store.put` literal. See watch point 15. **Since tabletop-architecture ticket 02
  (2026-08-11), `zoneShape()`/`mtgCardShape()` (and the private `imageShape()`) return real
  types — `MtgZoneShape`/`MtgCardShape`/tldraw's own `TLImageShape` — instead of casting their
  literal to `any`; type-only, no mechanics changed.** See `history.md`'s ticket 02 entry;
  `test/tableFurniture.test.ts` (new) unit-tests the three constructors directly.
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

- `apps/tabletop/test/tableFurniture.test.ts` — **new, tabletop-architecture ticket 02
  (2026-08-11)**: direct unit tests on `zoneShape()`/`mtgCardShape()` — the mint-time record
  shape (`parentId`/`isLocked`/`opacity` defaults, the ghost overrides, the sleeved-library
  opacity branch) — now pinned at the constructor level rather than only exercised indirectly
  through `cardArrival.ts`/`seatJoined.ts`'s own integration tests. Companion to the same
  ticket's type-only change (`as any` → real return types); see `history.md`.
- `apps/tabletop/test/furnitureZOrder.test.ts` — **new, 2026-08-10 (watch point 21)**: posts a
  `seat.joined` + `card.played` for an early seat, then a second `seat.joined` for a late seat, and
  asserts the late seat's playmat (and every other `mtg-zone` shape) sorts below the card's
  `IndexKey` — the regression test for furniture ever outranking a card in z-order.
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
- `apps/tabletop/test/verification/verify-click-then-drag-selection.spec.ts` — **new, ticket 05
  (2026-08-11)**: the regression test for the gap none of the five old `onTranslateEnd`/`commit()`
  sites could close — drops a pasted image, clicks it once with **no** drag (stock `image` has no
  `onClick`, so tldraw selects it immediately on pointer-down), then drags a card, and asserts the
  card — not the image — moves. Confirmed red before `clearStaleSelectionOnPointerDown` existed.
  `verify-life-counter.spec.ts` also gained a targeted assertion (ticket 05) that pressing the
  life counter's +/- buttons doesn't clear an unrelated existing selection — the `markEventAsHandled`
  immunity from watch point 24, confirmed empirically rather than only by source-reading.
  **That assertion's own locator was fixed 2026-08-11**: `.tl-shape[data-shape-type="image"]`
  matched seat.joined's two locked furniture images (playmat picture, library card back) in
  addition to the one pasted image the test cares about — narrowed to
  `:not([data-shape-id*="furniture-image-"])` using the new `FURNITURE_IMAGE_ID_MARKER` (see
  `tableFurniture.ts`, below). The same pass also rewrote both `.tl-selected`-based
  selection-persistence assertions in this spec as `ArrowRight`-nudge behavioral proxies (watch
  point 13's new sub-point) — `.tl-selected` never matches in this tldraw version. Full writeup:
  `history.md`'s "Correction" entry, 2026-08-11.
  **Image counts dropped by one per seat, same day, later commit**: once the playmat's picture
  folded into its `mtg-zone` shape's own `imageUrl` prop instead of minting a separate `image`
  shape (see `history.md`'s "playmat's picture folds into `mtg-zone`'s own props/render" entry),
  `verify-seat-joined.spec.ts`'s furniture-image-count assertions went 2→1 (one seat) and 4→2 (two
  seats) — only the library card-back remains a stock `image` shape now. This spec's own comment
  and `verify-life-counter.spec.ts`'s stale-selection-immunity comment (just above) were both
  updated to say "one" instead of "two" furniture images; `seatJoined.test.ts`'s sleeve-vs-card-back
  test comment was also updated to note the playmat is no longer relevant to that particular check.
- `apps/tabletop/test/verification/verify-copy-hint.spec.ts` — **new, 2026-08-12**: asserts the
  toast appears on ctrl+c/cmd+c with a card selected and does not appear with nothing selected.
  Selects via marquee-drag rather than a direct click, deliberately avoiding this owner's own
  click-vs-select mechanics (a direct click on some shapes enters text-edit mode) rather than
  exercising them — this spec is `TablePage.tsx`'s clipboard wiring, not a regression test for
  anything in this KB's watch points.
- `apps/tabletop/test/deckTitleShape.test.ts` — **new, editable-deck-title (2026-08-12,
  `96551ef`)**: unit tests for the `mtg-title` shape — the mint-time record shape produced by
  `ensurePlayerArea`'s label block (type/lock/props) and the shape's validators.
- `apps/tabletop/test/verification/verify-deck-title.spec.ts` — **new, editable-deck-title
  (2026-08-12, `96551ef`)**: edits the title in one browser and asserts it syncs to a second
  browser context and survives a reload (proving the edit persists through the room store).
  Typing "Reanimator deck" (contains r/t/d/s) also confirms the keystroke shield — tool hotkeys
  don't fire and the letters reach the field.
- `apps/tabletop/test/verification/verify-stack-landing-nudge.spec.ts` — **new, 2026-08-16**:
  places two cards on the Stack, drags the second's center square directly onto the first's, and
  asserts the post-drop overlap fraction drops below 0.6 and the dragged card moved right —
  regression test for the Stack-landing collision check (`nudgeOffAnotherCard`,
  `cardZoneEntry.ts`). Confirmed red (99.98% overlap) pre-fix, green after.

- `apps/tabletop/test/verification/verify-rightclick-reopen.spec.ts` — **new, 2026-08-19**: two
  loops of open/dismiss/reopen ×5 on the card context menu — one dismissing via Escape (passes even
  pre-fix, proving that path was never broken), one via an outside left-click (failed after the
  first cycle pre-fix, the regression this file guards). See `history.md`'s 2026-08-19 entry.

## Read-only dependency (not owned, but load-bearing — read when things surprise you)

- `node_modules/@tldraw/editor/src/lib/components/MenuClickCapture.tsx` — **new dependency,
  2026-08-19**: the full-canvas capture div rendered whenever `tlmenus.hasAnyOpenMenus()`, whose
  `handlePointerDown` closes a menu on a left-button outside click by calling
  `editor.menus.clearOpenMenus()` directly, bypassing Radix `ContextMenu.Root`'s own close handshake
  — the root cause of watch point 26's desync. Baked into `DefaultCanvas`, not swappable via
  `TLComponents`.
- `node_modules/tldraw/src/lib/tools/SelectTool/childStates/Idle.ts` — **new dependency, ticket 05
  (2026-08-11)**: `onPointerDown`'s own hit-test (the source of the public
  `getHitShapeOnCanvasPointerDown` helper `clearStaleSelectionOnPointerDown.ts` calls) and the
  recursive `{ ...info, target: 'shape' }` internal retargeting that's the reason a real
  pointer-down never reaches `editor.on('event', ...)` with `target: 'shape'` — see watch point 24.
- `node_modules/tldraw/src/lib/tools/SelectTool/childStates/PointingShape.ts` — selection-on-enter
  deferral logic (`onClick` truthiness check), `startTranslating`'s force-reselect safety net.
- `node_modules/tldraw/src/lib/tools/SelectTool/childStates/Translating.ts` — what happens once a
  drag is confirmed; reads `getSelectedShapeIds()` to decide what to move.
- `node_modules/@tldraw/editor/src/lib/editor/shapes/ShapeUtil.ts:968` — the base `onClick?`
  declaration (optional, no default implementation) that makes the truthiness check above mean
  "does this ShapeUtil define onClick at all," not "what does it do."
