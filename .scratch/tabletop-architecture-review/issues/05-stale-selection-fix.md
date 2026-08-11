# 05 — Fix the tldraw stale-selection bug properly, not just consolidate its workaround

**Status:** ready-for-agent

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

- [ ] Write a failing Playwright spec reproducing the bug: click a stock `image` shape (no drag),
      then drag an `mtg-card` shape elsewhere — assert the image did *not* move and the card did.
      Follow the existing pattern in `test/verification/*.spec.ts`.
- [ ] **Try the public-API route first:** register a pointer-event listener via `editor.on(...)`
      (or `editor.store.listen()` on the selected-ids state) at mount time in `TablePage.tsx`
      that eagerly clears selection the moment a pointer-down lands on a shape different from
      what's currently selected — before tldraw's own `PointingShape` state acts. Run it against
      the failing spec.
- [ ] **If the public-API route reliably closes the gap:** adopt it, and remove the five existing
      `setSelectedShapes([])` call sites (`MtgCardShapeUtil.tsx`, `MtgCounterShapeUtil.tsx`,
      `CardContextMenu.tsx`'s `commit()`), and delete `SelectionClearingNoteShapeUtil.ts` /
      `SelectionClearingImageShapeUtil.ts` entirely if nothing else about them is load-bearing
      (check: were they created *solely* for this workaround, or do they carry other overrides?).
- [ ] **If the public-API route can't reliably intercept in time:** fall back to the
      `editor.getStateDescendant('select.pointing_shape')` monkey-patch described in the research
      doc §4, applied eagerly. Record the private-API tradeoff explicitly in a code comment at the
      patch site, naming the tldraw version it was verified against (5.2.5) so a future upgrade
      knows to re-check it.
- [ ] Consult `tabletop-shape-mechanics-review` with whichever approach is chosen, before landing.
- [ ] The new Playwright spec passes; existing drag-identity and multi-untap specs
      (`verify-multi-untap.spec.ts` and any drag-identity coverage) still pass — both depend on
      selection state adjacent to what this changes.
- [ ] `tabletop-shape-mechanics-update` afterward — this is the first time this app centralizes
      (or deliberately doesn't) a selection-hygiene fix that's currently entry-point-specific.

**Further notes:**

- Supersedes the `tabletop-stale-selection-fix` line in the repo-root `TODO.md` (now removed).
- Sources: `apps/tabletop/notes/RESEARCH-stale-selection-bug.md`,
  [tldraw/tldraw#5613](https://github.com/tldraw/tldraw/issues/5613),
  [tldraw/tldraw#7936](https://github.com/tldraw/tldraw/pull/7936).

## Comments
