# Research: stale-selection-causes-wrong-shape-dragged, and whether tldraw has a first-party fix

Scope: `apps/tabletop`, tldraw `5.2.5` (the pinned version, confirmed via
`node_modules/tldraw/package.json` at the fleet root — this monorepo has one
`node_modules` for all workspaces).

**Bottom line up front:** this is a real, maintainer-acknowledged tldraw bug
(GitHub issue [tldraw/tldraw#5613](https://github.com/tldraw/tldraw/issues/5613)).
It was *partially* fixed by a merged PR, and **the app's installed version
(5.2.5) already contains that partial fix** — so there is nothing to gain by
upgrading. The specific case this app hits (a *different* shape already
selected, not "nothing selected") is the exact residual gap the fix's own
author flagged as unaddressed, and it is **still unaddressed in the latest
released version, `v5.3.0`** (published 2026-08-05). There is no config flag,
official hook, or documented pattern that closes it. The app's per-shape
`onTranslateEnd` clearing is, as far as I can find, the best available
mitigation today — but it has a real, confirmed gap of its own (see "A gap the
current workaround can't close" below), and there is a more central seam
available (`editor.getStateDescendant`) that could consolidate the five
patch sites into one, using a technique tldraw's own docs demonstrate for a
sibling state.

## 1. The mechanism, verified against the installed source

Confirmed by reading `node_modules/tldraw/src/lib/tools/SelectTool/childStates/PointingShape.ts`
(fleet-root `node_modules`, tldraw 5.2.5) directly — this matches the comments
already in `apps/tabletop/src/client/shapes/MtgCardShapeUtil.tsx` exactly.

**`PointingShape.onEnter`** (`PointingShape.ts:15-61`) decides whether to
select the pointed-at shape immediately. It skips immediate selection
(`didSelectOnEnter = false`) whenever, among other conditions:

```ts
// PointingShape.ts:33
this.editor.getShapeUtil(info.shape).onClick ||
```

i.e. whenever the shape's `ShapeUtil` defines `onClick` — true for
`mtg-card` (`MtgCardShapeUtil.onClick`, tap toggle). It stashes the shape as
`this.hitShapeForPointerUp` and returns without touching the selection.

**`PointingShape.startTranslating`** (`PointingShape.ts:246-259`), entered
from `onPointerMove` once the drag threshold is crossed (or from
`onLongPress`):

```ts
// PointingShape.ts:251-254
if (!this.didSelectOnEnter && !this.editor.getSelectedShapeIds().length) {
    this.editor.markHistoryStoppingPoint('selecting shape')
    this.editor.setSelectedShapes([this.hitShapeForPointerUp.id])
}
```

This only force-selects the actually-hit shape when the current selection is
**completely empty**. tldraw leaves the most-recently-interacted-with shape
selected after any gesture ends (`onClick`'s own `updateShapes` path doesn't
clear it either; see `PointingShape.onPointerUp:93-101`), so on the *next*
interaction the selection is non-empty — the guard is `false` — and
`Translating` (the child state entered next) moves whatever is *currently
selected*, not the shape the pointer actually landed on.

This is exactly what the five patch sites work around, by calling
`this.editor.setSelectedShapes([])` on every gesture-settle they can hook:

- `MtgCardShapeUtil.onTranslateEnd` (`src/client/shapes/MtgCardShapeUtil.tsx:305`)
- `MtgCounterShapeUtil.onTranslateEnd` (`src/client/shapes/MtgCounterShapeUtil.tsx:255`)
- `CardContextMenu.tsx`'s `commit()` helper, called by every card-menu action (`src/client/CardContextMenu.tsx:60`)
- `SelectionClearingNoteShapeUtil.onTranslateEnd` (`src/client/shapes/SelectionClearingNoteShapeUtil.ts:16`) — a subclass of stock `NoteShapeUtil` created solely to carry this hook, since you can't add a hook to a stock util directly
- `SelectionClearingImageShapeUtil.onTranslateEnd` (`src/client/shapes/SelectionClearingImageShapeUtil.ts:16`) — same idea, subclassing stock `ImageShapeUtil`

No occurrences of `setSelectedShapes([])` exist in `TablePage.tsx` (checked;
none found) — the five sites above are the complete set today.

## 2. Is this a known/reported tldraw issue?

**Yes.** [tldraw/tldraw#5613 — "onClick handler on shape prevents PointingShape logic"](https://github.com/tldraw/tldraw/issues/5613)
(opened 2025-03-12, relaying a Discord report):

> This lovely line of tldraw logic makes it so one can't have an onClick
> handler on a Shape without interfering with pointerdown+drag to move the
> shape when it is not selected.

Maintainer `steveruizok` replied same day:

> Legit bug. We need to differentiate between "starting clicking a shape
> which should be selected immediately" and "started clicking a shape with
> an onClick that should be selected on pointer up if the onClick returns
> nothing OR should be selected when the user long presses or starts to
> drag."

That description is the precise diagnosis: *some* signal (a long-press or a
drag-start) should force a reselect of the actually-hit shape, regardless of
what else happens to be selected. The issue was inactive, auto-marked stale
by a GitHub Action on 2025-10-01, and **auto-closed** on 2025-11-01 with no
further discussion — closed by the staleness bot, not by resolution at that
point.

### The fix that did land: PR #7936

[tldraw/tldraw#7936 — "fix(select): allow dragging shapes that have an onClick handler"](https://github.com/tldraw/tldraw/pull/7936),
`Closes #5613`, **merged 2026-03-10**. Its diff to `PointingShape.ts` is
exactly the `startTranslating` guard quoted above — it *added* that whole
`if` block, which did not exist before:

```diff
 private startTranslating(info: TLPointerEventInfo) {
     if (this.editor.getIsReadonly()) return

+    // If we didn't select the shape on enter (e.g. because it has an onClick handler),
+    // and there's no current selection, select it now before transitioning to translating.
+    if (!this.didSelectOnEnter && !this.editor.getSelectedShapeIds().length) {
+        this.editor.markHistoryStoppingPoint('selecting shape')
+        this.editor.setSelectedShapes([this.hitShapeForPointerUp.id])
+    }
+
     // Re-focus the editor, just in case the text label of the shape has stolen focus
     this.editor.focus()
     this.parent.transition('translating', info)
```

Before this PR, dragging an *unselected* `onClick` shape (nothing else
selected either) apparently did nothing useful — `Translating` had no
selection to move. The PR's fix is narrow and correct for that specific
case: "nothing was selected." It does **not** address `steveruizok`'s own
broader diagnosis about drags started while something *else* is selected —
which is exactly the case this app's five workarounds paper over.

**Confirmed via version dates that the fix is already in what's installed:**
`v5.2.0` released 2026-07-01, `v5.2.5` (installed) released 2026-07-15, both
*after* the 2026-03-10 merge of #7936 — so `MtgCardShapeUtil`'s installed
tldraw already contains this fix. There is nothing to gain from upgrading on
this front.

### Confirmed still unaddressed in the latest release (v5.3.0)

Fetched `packages/tldraw/src/lib/tools/SelectTool/childStates/PointingShape.ts`
at tag `v5.3.0` (published 2026-08-05, five days before this research) directly
from `raw.githubusercontent.com`. The `onEnter` onClick-check and the
`startTranslating` guard are **byte-for-byte identical** to what's in the
installed 5.2.5. No further change has landed. I found no other open or
closed issue/PR in `tldraw/tldraw` that reopens or extends #5613 for the
"something else is already selected" case — searches for "stale selection",
"wrong shape dragged/selected", "PointingShape", and "didSelectOnEnter"
turned up nothing closer than #5613/#7936 itself.

**Conclusion for Q1: no further first-party fix exists, upgrading tldraw
buys nothing, and the specific gap this app patches around is not
currently tracked upstream at all** (the closest issue is closed, and its
closing PR fixed a narrower sibling case).

## 3. Is there a documented tldraw pattern to prevent this?

I found no tldraw doc, example, or source comment that describes an intended
way to avoid stale-selection issues for a custom `ShapeUtil` with `onClick` —
tldraw's own docs page for `onClick`
([`ShapeUtil` reference](https://tldraw.dev/reference/editor/ShapeUtil)) and
its official example
([PR #7936](https://github.com/tldraw/tldraw/pull/7936) added
`apps/examples/src/examples/shapes/tools/shape-with-onClick/`) both just show
`onClick` incrementing a counter — no mention of selection side effects at
all, single- or multi-shape.

There is **no config option** on `ShapeUtil`, `Editor`, or `<Tldraw>` (e.g. no
`disableStaleSelection`, no `Editor` option) that changes this behavior.

## 4. Is there a more central seam than patching every shape type?

**Partially, yes — but it's a monkey-patch, not an exposed API.** tldraw's
own official docs demonstrate exactly this technique for a *different* piece
of `SelectTool`'s behavior, which means it's a sanctioned pattern rather than
reaching into internals nobody expects you to touch:

[tldraw.dev — "Custom double-click behavior"](https://tldraw.dev/examples/custom-double-click-behavior)
overrides `SelectTool`'s stock double-click-creates-text-shape behavior by,
inside `onMount`, doing:

```ts
const selectIdleState = editor.getStateDescendant<IdleStateNode>('select.idle')
selectIdleState.handleDoubleClickOnCanvas =
    customDoubleClickOnCanvasHandler.bind(selectIdleState)
```

`Editor.getStateDescendant(path)` walks the tool state chart by dotted path
and returns the live `StateNode` instance — here `'select.idle'`, the `Idle`
child state of the built-in `select` tool. The same call with
`'select.pointing_shape'` returns the exact `PointingShape` instance whose
source is quoted above. Because JS doesn't enforce TypeScript's `private`
annotation on `PointingShape.startTranslating` at runtime, a single
`onMount` callback (in `TablePage.tsx`, alongside wherever the editor is
first obtained) could do:

```ts
const pointingShape = editor.getStateDescendant('select.pointing_shape')
const original = pointingShape.startTranslating.bind(pointingShape)
pointingShape.startTranslating = (info) => {
    // e.g.: always force-reselect the hit shape when didSelectOnEnter is
    // false, not only when selection is currently empty — closing the exact
    // gap #5613's own diagnosis called out.
    ...
    original(info)
}
```

This would collapse the five separate `onTranslateEnd`/`commit()` patch
sites into one place, patched once, at editor-mount time — instead of every
new shape type needing its own copy of `setSelectedShapes([])`. It is the
most central seam I found. Caveats worth weighing before adopting it:

- It's reaching into a **private, unexported** method by name
  (`startTranslating`) — not a documented extension point the way `onClick`
  or `onTranslateEnd` are. A tldraw refactor could rename or restructure it
  silently (no deprecation, no semver signal — it's not public API). The
  five-`onTranslateEnd` approach only touches genuinely-documented
  `ShapeUtil` hooks, which is more upgrade-safe even though it's duplicated.
- The *official* example only patches a public method (`handleDoubleClickOnCanvas`)
  on `select.idle`; patching a `private`-annotated method one level deeper
  (`select.pointing_shape.startTranslating`) is a step further from what
  tldraw's own docs actually demonstrate, even though the mechanism
  (`getStateDescendant` + method replacement) is the same.
- `getStateDescendant` itself is public, documented API on `Editor`
  ([reference](https://tldraw.dev/sdk-features/editor)) — so the *seam* is
  sanctioned even if the *specific method* being patched isn't.

## A gap the current workaround can't close (matches Jess's "other circumstances")

Tracing `PointingShape` further surfaces a real, distinct gap that the
five `onTranslateEnd`-based patches structurally cannot cover, which likely
explains the "selecting an image then a card" report:

All five patches clear selection **after a completed drag** (`onTranslateEnd`
only fires once a shape has actually been translated). But the buggy guard
in `startTranslating` is checked the moment a *drag starts* on a *different*
shape — and a shape can become "selected" without ever being dragged, via a
plain click. Trace:

1. User clicks a stock `image` shape (no `onClick` handler) — `onEnter`
   selects it immediately (`didSelectOnEnter = true`); no translate ever
   happens, so `SelectionClearingImageShapeUtil.onTranslateEnd` never fires.
2. User then **drags** an `mtg-card` shape (which has `onClick`). `onEnter`
   for the card sets `didSelectOnEnter = false` (the onClick check).
   `startTranslating`'s guard reads `!editor.getSelectedShapeIds().length`
   — but the image is still selected from step 1, so the guard is `false`.
3. `Translating` moves the **currently-selected image**, not the card the
   pointer is actually on.

None of the five patch sites can prevent this specific sequence, because the
stale selection was created by a plain **select-click**, not a drag — there
is no "just selected, didn't drag" hook to clear it on. This is a structural
limitation of "clear on `onTranslateEnd`," not a missing sixth call site;
closing it needs something that runs on every selection-forming interaction
(a `store.listen` on the selected-ids state, or the `PointingShape.onEnter`/
`startTranslating` monkey-patch from §4, done eagerly rather than only
inside a translate).

## Summary / recommendation

- The bug is real, tldraw-maintainer-acknowledged (#5613), and **still not
  fully fixed** in the latest release (`v5.3.0`, 2026-08-05) — only a
  narrower sibling case ("nothing was selected at all") was fixed, and the
  installed `5.2.5` already has that fix.
- No tldraw config flag, documented hook, or official example addresses the
  residual case. Upgrading tldraw would not help today.
- The app's current five-site `onTranslateEnd`-clears-selection workaround
  is, as far as this research found, the best mitigation available for the
  "stale selection carries into the next *drag*" case — but it has a
  confirmed gap for "stale selection from a plain *click*, then an
  immediate drag of something else," which the five sites cannot close by
  adding a sixth `onTranslateEnd` anywhere.
- A more central (but less officially-sanctioned) seam exists:
  `editor.getStateDescendant('select.pointing_shape')`, using the same
  `getStateDescendant`-plus-method-replacement technique tldraw's own docs
  demonstrate for `select.idle`'s double-click handler. It could consolidate
  the patch into one `onMount` call and — if it also runs eagerly rather
  than only from inside a translate — could close the click-then-drag gap
  too. That's a real design option for a future ticket, not something this
  research task should implement.

## Sources

- `node_modules/tldraw/src/lib/tools/SelectTool/childStates/PointingShape.ts` (fleet-root `node_modules`, tldraw 5.2.5, installed)
- `raw.githubusercontent.com/tldraw/tldraw/v5.3.0/packages/tldraw/src/lib/tools/SelectTool/childStates/PointingShape.ts` (latest release, fetched during this research)
- [tldraw/tldraw#5613 — onClick handler on shape prevents PointingShape logic](https://github.com/tldraw/tldraw/issues/5613)
- [tldraw/tldraw#7936 — fix(select): allow dragging shapes that have an onClick handler](https://github.com/tldraw/tldraw/pull/7936) (merged 2026-03-10)
- [tldraw.dev — Custom double-click behavior](https://tldraw.dev/examples/custom-double-click-behavior) (`getStateDescendant` pattern)
- [tldraw.dev — Editor reference](https://tldraw.dev/sdk-features/editor)
- [tldraw.dev — ShapeUtil reference](https://tldraw.dev/reference/editor/ShapeUtil)
- Release dates via `gh api repos/tldraw/tldraw/releases/tags/<tag>`: `v5.2.0` 2026-07-01, `v5.2.5` 2026-07-15, `v5.3.0` 2026-08-05.
- App files read to confirm current workaround sites: `apps/tabletop/src/client/shapes/MtgCardShapeUtil.tsx`, `apps/tabletop/src/client/shapes/MtgCounterShapeUtil.tsx`, `apps/tabletop/src/client/CardContextMenu.tsx`, `apps/tabletop/src/client/shapes/SelectionClearingNoteShapeUtil.ts`, `apps/tabletop/src/client/shapes/SelectionClearingImageShapeUtil.ts`, `apps/tabletop/src/client/TablePage.tsx` (no additional `setSelectedShapes` calls found there).
