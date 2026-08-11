# Ticket 01 implementation plan — split MtgCardShapeUtil by hook

**Decision (Jess, 2026-08-11):** option (B) — this is an organizational split, not an
architectural one. The grilling in the ticket already established there's no clean
physics/interop seam (every hook mixes a tldraw quirk with a domain rule inseparably), so
this plan does NOT introduce a `CardPhysics` abstraction. It splits the 388-line
`MtgCardShapeUtil.tsx` by hook into sibling files, each importing tldraw where the hook
genuinely needs it — honoring "domain code shouldn't import display libraries" wherever a
piece of logic is *actually* free of tldraw, and not pretending otherwise where it isn't.

## Current shape of the file

Reading `apps/tabletop/src/client/shapes/MtgCardShapeUtil.tsx` (388 lines) — five groups,
already fairly separable by hook:

1. **Render** (`component`, `getDefaultProps`, `isAspectRatioLocked`, `getIndicatorPath`,
   the tap catch-up animation `useLayoutEffect`) — lines 37–157. Already has zero pure-logic
   candidates left to extract; it's all React/tldraw rendering concerns.
2. **Tap/click** (`onClick`) — lines 173–209. Already delegates the actual write to
   `tapPartial` (pure, in `cardTap.ts`). What's left in the class is tldraw-ordering-specific:
   reading `getSelectedShapeIds`, the `queueMicrotask` undo-coalescing trick. Not separable
   further (per the ticket's own finding).
3. **Passenger drag** (`canReceiveNewChildrenOfType`, `canRemoveChildrenOfType`,
   `onDragShapesIn`, `onDragShapesOut`) — lines 221–270. The rotation-zeroing math is
   tldraw-quirk-driven (compensating for `reparentShapes` preserving page rotation) but is
   already the only place that math happens; nothing pure to pull out beyond what's there.
4. **Zone entry + passenger eviction** (`onTranslateEnd`, `zoneAt`, `evictPassengers`) —
   lines 289–387. `zoneAt` already delegates to the pure `topmostZoneAt` (`zoneHitTest.ts`).
   `evictPassengers` already delegates spot-finding to the pure `findOpenSpotsNearZoneEdge`
   (`openSpotNearZoneEdge.ts`). What's left (`this.editor.reparentShapes`/`animateShapes`
   calls) is inherently tldraw-editor-driven.
5. **Module-level constants** (`NON_BATTLEFIELD_ZONES`, `PASSENGER_TYPES`) — lines 17–23,
   shared across groups 3 and 4.

Confirms the ticket's own read: everything genuinely tldraw-free (`tapPartial`,
`topmostZoneAt`, `findOpenSpotsNearZoneEdge`) is already pulled out. There is no further
purification to do — only reorganization.

## The split

Move each hook group into its own sibling file under `src/client/shapes/`, keeping
`MtgCardShapeUtil.tsx` as a thin `BaseBoxShapeUtil` subclass whose overrides call straight
into these. Each extracted function takes `editor: Editor` and the relevant shape(s)
explicitly, rather than reading `this` — same testability benefit `tapPartial` already
has (a fake/mock `Editor` can drive it directly, no `ShapeUtil` instantiation needed),
without claiming these are tldraw-free (they're not, and the file will keep saying so in
comments, preserved verbatim from the original).

- **`cardRender.tsx`** — the `component` body (JSX) and the tap catch-up `useLayoutEffect`
  hook, exported as a plain function component `CardFace({ shape }: { shape: MtgCardShape })`
  called from `MtgCardShapeUtil.component`; and `getIndicatorPath`'s body, exported as a
  plain function `cardIndicatorPath(shape: MtgCardShape): Path2D` called from
  `MtgCardShapeUtil.getIndicatorPath`.
- **`cardTapClick.ts`** — `handleCardClick(editor: Editor, shape: MtgCardShape):
  TLShapePartial<MtgCardShape> | undefined`, the current `onClick` body verbatim (including
  the `queueMicrotask` comment block — preserved word for word, it documents a real tldraw
  ordering hazard a future reader needs).
- **`cardPassengers.ts`** — `PASSENGER_TYPES`, `canReceivePassenger`/`canRemovePassenger`
  (the two `can*` gates), `handleDragShapesIn(editor, card, shapes)`,
  `handleDragShapesOut(editor, card, shapes, info)`. All comments preserved verbatim.
- **`cardZoneEntry.ts`** — `NON_BATTLEFIELD_ZONES`, `handleTranslateEnd(editor, initial,
  current)`, `zoneAt(editor, shape)`, `evictPassengers(editor, card, zoneHit)`. All comments
  preserved verbatim, including the "Descoped 2026-08-06" note about ticket 21 — that note's
  accuracy doesn't change just because the code moved files.
- **`MtgCardShapeUtil.tsx`** — becomes the class shell: `getDefaultProps`,
  `isAspectRatioLocked`, and five one-line overrides that call the extracted functions with
  `this.editor` and the shape argument(s). No behavior change; every override still exists
  with the same signature tldraw requires — this is purely "where the body lives."

## What does NOT change

- **Zero behavior change.** Every comment, every ordering constraint (the `queueMicrotask`
  timing, `setSelectedShapes([])`'s position before the zone-equality early return — wait,
  that line was already removed by ticket 05; `onTranslateEnd`'s current first real line is
  the zone lookup) carries over verbatim into its new file.
- No new abstraction, no `CardPhysics` interface, no attempt to hide `Editor` behind a
  narrower type.
- `MtgCardShape`/`ZoneHit`/etc. type imports move to whichever file uses them; no shared
  barrel file introduced (matches the existing sibling-file convention — `cardTap.ts`,
  `zoneHitTest.ts`, `openSpotNearZoneEdge.ts` are already flat siblings, not a subfolder).

## Risk / tradeoff

- Five files instead of one means five import lines at the top of `MtgCardShapeUtil.tsx`
  instead of none — a small navigation cost traded for each hook being independently
  readable and independently testable (a unit test can call `handleCardClick(fakeEditor,
  shape)` directly without going through tldraw's `ShapeUtil` machinery).
- Splitting touches every hook in the hottest file in the ship (405 lines, 21 commits per
  the original review) — pure move, but worth the owner's sanity check given the file's
  history of subtle tldraw-ordering bugs.

## Tests planned

- No new tests needed — this is a pure reorganization. Existing coverage
  (`test/cardTap.test.ts`, `test/zoneHitTest.test.ts` if present, and the Playwright specs
  covering tap/multi-untap/passenger drag/zone entry) must still pass unchanged.
- Run `npx vitest run` and `./verify.sh` before and after to confirm no behavior drift.

## Owner review (2026-08-11)

`tabletop-shape-mechanics-review` found no blocking issues: confirmed against the live file
that the one ordering constraint it checks for (`setSelectedShapes([])` before the
zone-equality early return) no longer exists in this file at all — ticket 05 already
removed it — so there's nothing to "port forward." Confirmed tldraw dispatches hooks
through the class instance regardless of what the hook body delegates to, so passing
`this.editor` as an explicit parameter is behaviorally identical to reading `this.editor`
directly. One completeness gap flagged (not a mechanics risk): the plan hadn't specified
`getIndicatorPath`'s export shape — fixed above (`cardIndicatorPath`).

## Verification (2026-08-11)

- `npx vitest run`: 110/110 passed, before and after the split.
- `./verify.sh` (Playwright): 43/44 passed both before (on unmodified main) and after the
  split — the one failure (`verify-life-counter.spec.ts:102`) reproduces identically on
  unmodified main, confirming it's pre-existing flakiness unrelated to this change.
- `npx vite build`: client build (with TS type-checking) succeeds.
