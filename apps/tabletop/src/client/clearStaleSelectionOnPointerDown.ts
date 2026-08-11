import { Editor, getHitShapeOnCanvasPointerDown, TLEventInfo } from "tldraw";

/**
 * Ticket 05 (tabletop-architecture-review): closes the residual gap in
 * tldraw's own stale-selection bug (tldraw/tldraw#5613) that no number of
 * per-shape `onTranslateEnd` clears can reach — see
 * `notes/RESEARCH-stale-selection-bug.md`.
 *
 * The mechanism (verified against installed tldraw 5.2.5's
 * `SelectTool/childStates/PointingShape.ts`): a shape whose `ShapeUtil`
 * defines `onClick` (e.g. `mtg-card`, for tap/untap) is NOT selected on
 * pointer-down — tldraw defers that decision to pointer-up. If a drag
 * threshold is crossed first, `startTranslating`'s safety net only
 * force-reselects the actually-hit shape when the CURRENT selection is
 * completely empty:
 *
 *   if (!this.didSelectOnEnter && !this.editor.getSelectedShapeIds().length)
 *
 * So whenever some OTHER shape is already selected — left over from a prior
 * drag, or from a plain click on a shape with no `onClick` (a stock `image`
 * or `note`, selected immediately on pointer-down, no drag involved at all)
 * — that guard is false, and `Translating` moves the stale selection instead
 * of the shape under the pointer.
 *
 * The fix: on every `pointer_down`, work out which shape (if any) the
 * pointer actually landed on, and if that shape isn't already part of the
 * current selection, clear the selection right there — before any later
 * event (the drag-threshold-crossing `pointer_move`, or a plain click's
 * `pointer_up`) can act on stale state.
 *
 * A real DOM pointer-down is always dispatched with `target: 'canvas'`
 * (verified empirically, then confirmed in source): tldraw's own
 * `SelectTool/childStates/Idle.onPointerDown` does its OWN hit-test on a
 * `target: 'canvas'` event and, when it hits a shape, RECURSES into itself
 * with a locally-constructed `{ ...info, target: 'shape', shape }` — that
 * retargeted copy never travels back through `Editor.dispatch`, so
 * `editor.on('event', ...)` (which only ever sees what was actually
 * dispatched) never observes `target: 'shape'` for a real interaction. So
 * this can't filter on `info.target === 'shape'` the way a first read of
 * `TLPointerEventTarget`'s shape suggests — it has to do the same hit-test
 * Idle does, using the same public helper Idle itself calls:
 * `getHitShapeOnCanvasPointerDown` (exported from `tldraw`'s package root,
 * `@public`). That helper already honors `editor.options.selectLockedShapes`
 * (false by default), so a locked shape — every piece of this table's
 * furniture, `mtg-zone` included — never counts as "hit" here either,
 * matching `Idle`'s own gate and never disturbing anything by clicking on it.
 *
 * This runs AFTER tldraw's own `Idle`/`PointingShape.onEnter` has already
 * handled this same pointer-down (`editor.on('event', ...)` fires once
 * `Editor.dispatch` has run the event through the state chart — see
 * `_flushEventForTick` in `@tldraw/editor`), so it never fights `onEnter`'s
 * own selection decision for the shape just hit: if `onEnter` already
 * selected it (the common case — a stock shape with no `onClick`), our own
 * hit-test finds the same shape already in the selection and no-ops. It only
 * cleans up staleness left over from a PREVIOUS gesture, ahead of THIS one
 * continuing.
 *
 * `editor.on('event', ...)` and `getHitShapeOnCanvasPointerDown` are both
 * public, documented API on `Editor`/`tldraw`
 * (https://tldraw.dev/reference/editor/Editor#on) — this reaches the fix
 * through the same class of sanctioned extension point tldraw's own docs use
 * for other `SelectTool` behavior (e.g. "Custom double-click behavior"),
 * without patching a private method the way `PointingShape.startTranslating`
 * itself would require. Verified against tldraw 5.2.5; still the latest
 * behavior as of 5.3.0 per the research doc.
 */
export function clearStaleSelectionOnPointerDown(editor: Editor): void {
  editor.on("event", (info: TLEventInfo) => {
    if (info.type !== "pointer" || info.name !== "pointer_down" || info.target !== "canvas") return;
    const hitShape = getHitShapeOnCanvasPointerDown(editor);
    if (!hitShape) return;
    if (editor.getSelectedShapeIds().includes(hitShape.id)) return;
    editor.setSelectedShapes([]);
  });
}
