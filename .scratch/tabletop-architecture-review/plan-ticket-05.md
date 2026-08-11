# Ticket 05 implementation plan — stale-selection fix

Working in worktree `ticket-05-stale-selection-fix` (branch `worktree-ticket-05-stale-selection-fix`).

## What changed

1. **New centralized fix**: `apps/tabletop/src/client/clearStaleSelectionOnPointerDown.ts` —
   registers `editor.on('event', ...)` at Tldraw mount time (`TablePage.tsx`'s `onTldrawMount`,
   formerly `aimCameraAtTheTable`). On every `pointer_down` event whose `target === 'shape'`,
   if that shape's id isn't already in `editor.getSelectedShapeIds()`, it calls
   `editor.setSelectedShapes([])`.

   This runs via `editor.on('event', ...)`, which tldraw's `Editor.dispatch` emits AFTER the
   event has already gone through the state chart (`PointingShape.onEnter` for this same
   pointer-down has already run) — so it never fights `onEnter`'s own selection decision for
   the shape just hit. It only clears staleness left over from a PREVIOUS gesture, before the
   NEXT event (the drag-threshold pointer_move, or a plain click's pointer_up) can act on it.
   Verified by hand-tracing all the relevant `PointingShape` branches (onEnter/onPointerUp/
   startTranslating) in `node_modules/tldraw/src/lib/tools/SelectTool/childStates/
   PointingShape.ts` — including marquee multi-select (untap ticket 16), shift-click add,
   and the plain click-then-drag gap. `editor.on('event', ...)` is public, documented API
   (unlike the `getStateDescendant`-plus-monkey-patch fallback the ticket allowed) — this is
   the "safer option" the ticket asked to try first, and it worked, so the monkey-patch
   fallback (research doc §4) was NOT needed.

2. **Removed all five old per-shape workaround sites**, now redundant:
   - `MtgCardShapeUtil.onTranslateEnd`: dropped its `setSelectedShapes([])` line (kept the
     rest — zone detection, passenger eviction, face reset).
   - `MtgCounterShapeUtil.onTranslateEnd`: deleted the whole override (it did nothing else).
   - `CardContextMenu.tsx`'s `commit()`: dropped its `setSelectedShapes([])` line.
   - Deleted `SelectionClearingNoteShapeUtil.ts` and `SelectionClearingImageShapeUtil.ts`
     entirely (each existed solely to carry this one `onTranslateEnd` hook — confirmed nothing
     else load-bearing in either file).
   - `TablePage.tsx`'s `shapeUtils` array now uses tldraw's stock `defaultShapeUtils`
     unfiltered, instead of filtering out `note`/`image` to substitute the SelectionClearing*
     subclasses.

3. **New failing-first Playwright spec**:
   `test/verification/verify-click-then-drag-selection.spec.ts` — click a pasted image (no
   drag), then drag a card; asserts the card moves and the image doesn't. This is the gap
   RESEARCH-stale-selection-bug.md identified that no `onTranslateEnd` site could ever close
   (selection formed by a plain click, never a drag). Confirmed it fails against the
   pre-fix code (card didn't move at all — the image absorbed the drag) before implementing
   the fix.

## Why this should be safe (traced scenarios)

- **Marquee-select + click-to-untap (ticket 16 multi-untap)**: clicking an already-selected
  card in a multi-selection is a no-op for the new listener (shape already in selection), so
  the multi-untap propagation via `queueMicrotask` in `MtgCardShapeUtil.onClick` is untouched.
- **Shift-click add-to-selection on a stock shape**: `PointingShape.onEnter` adds it to the
  selection synchronously, before our listener runs — so by the time we check, it's already
  selected and we no-op.
- **Shift-click on an `onClick` shape (a card)**: dead code today regardless of our change —
  `PointingShape.onPointerUp`'s `onClick` branch always short-circuits before the additive-
  selection branch, so cards never actually gain multi-select-via-shift through this path.
- **Plain drag from empty selection** (the original tldraw PR #7936 case): listener sees the
  hit shape not yet selected (selection is empty), clears (no-op), `startTranslating`'s guard
  still sees an empty selection and selects+translates correctly.
- **Drag A, then drag B** (existing `verify-drag-identity.spec.ts` case): after dragging A
  (no more `onTranslateEnd` clear), A stays selected. Pointer-down on B: `onEnter` doesn't
  select B (it has `onClick`), selection stays `[A]`. Listener sees B not in `[A]`, clears to
  `[]`. Next pointer_move past the drag threshold: `startTranslating`'s guard now sees empty
  selection, selects and translates B. A is untouched.
- **Click image (no drag), then drag card** (the new gap case): click selects the image
  immediately (`onEnter`, no `onClick` on stock image). Pointer-down on the card: `onEnter`
  doesn't select it (`onClick` defined), selection stays `[image]`. Listener sees card not in
  `[image]`, clears to `[]`. Drag-threshold pointer_move: guard sees empty selection, selects
  and translates the card. Image stays put.

## Risk / tradeoff

- `editor.on('event', ...)` fires on every pointer-down anywhere on the canvas that hits a
  shape — cheap (one array membership check, no-op in the common already-selected case) but
  worth having the owner sanity-check for any selection-adjacent behavior this plan didn't
  trace (e.g. interaction with locked shapes, groups, or the `mtg-zone` furniture, which is
  always `isLocked: true` and so never itself a `target: 'shape'` pointer-down target for
  drag purposes — but IS clickable for other reasons?).
- No private API touched — the `getStateDescendant('select.pointing_shape')` monkey-patch
  fallback (research doc §4) was not needed.

## Tests planned

- New: `verify-click-then-drag-selection.spec.ts` (written, confirmed red pre-fix).
- Existing selection-adjacent specs must still pass: `verify-drag-identity.spec.ts`,
  `verify-multi-untap.spec.ts`, `verify-image-selection.spec.ts`, `verify-note.spec.ts`
  (drag-then-drag note case).
- Full `./verify.sh` and `npx vitest run` at the end.
