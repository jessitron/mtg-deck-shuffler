# 05 — Fix the tldraw stale-selection bug properly, not just consolidate its workaround

**Status:** done

**Files:** `src/client/shapes/MtgCardShapeUtil.tsx`, `MtgCounterShapeUtil.tsx`,
`CardContextMenu.tsx`, `SelectionClearingNoteShapeUtil.ts`, `SelectionClearingImageShapeUtil.ts`,
`TablePage.tsx` (editor mount point)

**Background:** the review's Candidate 5 proposed consolidating five duplicated
`this.editor.setSelectedShapes([])` call sites into one named helper, `clearStaleSelection(editor)`,
framed as a low-risk DRY-up. Jess reported (2026-08-10) the underlying bug still happens in
circumstances none of the five sites cover — e.g. "selecting an image then a card." A background
research agent investigated tldraw's actual source (installed 5.2.5) and GitHub history;
findings are committed at `apps/tabletop/notes/RESEARCH-stale-selection-bug.md`. **Read that file
before starting** — this ticket's acceptance criteria are drawn directly from it.

**Why consolidation alone isn't the fix:** all five current sites clear selection inside
`onTranslateEnd`, which only fires after a completed *drag*. A shape can also become selected via
a plain *click* with no drag (e.g. clicking a stock `image` shape) — `onTranslateEnd` never fires
for that, so the selection stays stale. The next drag of a different `onClick`-defining shape
(e.g. an `mtg-card`) then moves the stale-selected shape instead of the one under the pointer.
No number of `onTranslateEnd` sites can close this — it needs something that runs on every
selection-forming interaction, not just after drags.

**What the research found:**

- Real, maintainer-acknowledged tldraw bug: [tldraw/tldraw#5613](https://github.com/tldraw/tldraw/issues/5613).
- A partial fix ([#7936](https://github.com/tldraw/tldraw/pull/7936), merged 2026-03-10) is
  already in the installed tldraw 5.2.5 — it only covers "nothing was selected," not "something
  else is selected." Confirmed still unfixed in tldraw v5.3.0 (2026-08-05, latest release).
  **Upgrading tldraw will not help.**
- No tldraw config flag or documented hook addresses the residual case.
- A candidate central fix exists: `editor.getStateDescendant('select.pointing_shape')`,
  monkey-patching the private `startTranslating` method at editor-mount time — the same
  `getStateDescendant` technique tldraw's own docs use for a sibling case
  ([Custom double-click behavior](https://tldraw.dev/examples/custom-double-click-behavior)).
  Applied *eagerly* (not only inside a translate), this could close the click-then-drag gap.
  Tradeoff: it patches a private, unexported tldraw method with no semver protection, vs. the
  current approach, which only touches documented `ShapeUtil` hooks.

**Plan (try the safer option first):**

- [x] Write a failing Playwright spec reproducing the bug: click a stock `image` shape (no drag),
      then drag an `mtg-card` shape elsewhere — assert the image did *not* move and the card did.
      Follow the existing pattern in `test/verification/*.spec.ts`.
      → `test/verification/verify-click-then-drag-selection.spec.ts`, confirmed red pre-fix.
- [x] **Try the public-API route first:** register a pointer-event listener via `editor.on(...)`
      (or `editor.store.listen()` on the selected-ids state) at mount time in `TablePage.tsx`
      that eagerly clears selection the moment a pointer-down lands on a shape different from
      what's currently selected — before tldraw's own `PointingShape` state acts. Run it against
      the failing spec.
      → Worked, with one correction: a naive `info.target === 'shape'` filter never fires for
      real interactions (tldraw internally re-targets `'canvas'` → `'shape'` inside
      `Idle.onPointerDown`'s own recursion, which never round-trips through `Editor.dispatch`).
      Fixed by doing the same hit-test `Idle` does, via the public
      `getHitShapeOnCanvasPointerDown` helper. See `clearStaleSelectionOnPointerDown.ts` and the
      `tabletop-shape-mechanics` owner KB (watch point 24) for the full trace.
- [x] **If the public-API route reliably closes the gap:** adopt it, and remove the five existing
      `setSelectedShapes([])` call sites (`MtgCardShapeUtil.tsx`, `MtgCounterShapeUtil.tsx`,
      `CardContextMenu.tsx`'s `commit()`), and delete `SelectionClearingNoteShapeUtil.ts` /
      `SelectionClearingImageShapeUtil.ts` entirely if nothing else about them is load-bearing
      (check: were they created *solely* for this workaround, or do they carry other overrides?).
      → Done — both files existed solely for this hook; nothing else load-bearing in either.
- [ ] ~~**If the public-API route can't reliably intercept in time:** fall back to the
      `editor.getStateDescendant('select.pointing_shape')` monkey-patch...~~ Not needed — the
      public-API route (corrected as above) closes the gap reliably.
- [x] Consult `tabletop-shape-mechanics-review` with whichever approach is chosen, before landing.
      → Flagged a real gap in the trace (locked-shape buttons calling `markEventAsHandled`,
      e.g. the life counter's +/-): confirmed via source that this suppresses `editor.dispatch`
      entirely upstream (`useCanvasEvents.ts`'s `wasEventAlreadyHandled` gate), so it can't
      disturb the new listener. Added a regression test anyway (`verify-life-counter.spec.ts`).
- [x] The new Playwright spec passes; existing drag-identity and multi-untap specs
      (`verify-multi-untap.spec.ts` and any drag-identity coverage) still pass — both depend on
      selection state adjacent to what this changes.
      → All pass. Full suite: 42/44 (`./verify.sh`) + 101/101 (`npx vitest run`); the 2 failures
      are a pre-existing, unrelated `seat.joined` 400 (confirmed via `git stash` on unmodified
      code) — captured as the `seat-joined-400` TODO.md buoy, out of scope here.
- [x] `tabletop-shape-mechanics-update` afterward — this is the first time this app centralizes
      (or deliberately doesn't) a selection-hygiene fix that's currently entry-point-specific.
      → Done, commit `dfa41ea` on this branch.

**Further notes:**

- Supersedes the `tabletop-stale-selection-fix` line in the repo-root `TODO.md` (now removed).
- Sources: `apps/tabletop/notes/RESEARCH-stale-selection-bug.md`,
  [tldraw/tldraw#5613](https://github.com/tldraw/tldraw/issues/5613),
  [tldraw/tldraw#7936](https://github.com/tldraw/tldraw/pull/7936).

## Comments
