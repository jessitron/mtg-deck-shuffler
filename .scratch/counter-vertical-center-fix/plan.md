# Counter editing textarea: vertical-centering fix

Mountain: overhead (bug fix, no feature growth)

## Bug

TODO.md item: on a counter, typing "+1/+1" (or "why") sits high in the disc
with visible empty space below, instead of centered. Typing one more
character (crossing an actual wrap) fixes it.

## Root cause

`MtgCounterShapeUtil.tsx`'s editing textarea centered its text by computing
`paddingTop` from `fitCounterFont`'s *estimated* `lineCount` (a conservative
character-width heuristic in `counterTextFit.ts`, deliberately not measuring
real text width because canvas `measureText` lies before the webfont loads).
Near a wrap boundary the estimate sometimes predicts one more line than the
browser actually renders — e.g. "+1/+1" (5 chars) at the default 44px disc
estimates `lineCount: 2`, but Orbitron bold renders it on one line. Padding
sized to center a 2-line block leaves the real 1-line block sitting high.

## Fix (implemented)

Keep `fitCounterFont`'s `fontSize` estimate (only used for shrink-to-fit
sizing — unaffected by this bug). Replace the padding calculation with a
`useLayoutEffect` that, whenever `[isEditing, text, fontSize, h]` changes:
zeroes `paddingTop`, reads the textarea's real `scrollHeight` (reports full
content height regardless of the element's fixed visible height), restores
the previous inline padding, and computes `(usableHeight - scrollHeight) / 2`
into `useState` — `measuredPadTop`. The JSX's `paddingTop` now reads from
that state instead of computing anything from `lineCount`. `lineCount` is no
longer destructured/used in the component (still returned by
`fitCounterFont`, still tested by `counterTextFit.test.ts`, unrelated to this
fix).

Stored in state rather than written directly to the DOM node (`ref.current.style.paddingTop = ...`)
per tabletop-shape-mechanics-context's flagged hazard: `component()` re-runs
on any shape-record change (drag, reparent, unrelated store churn), and a
direct DOM write would get stamped over by the JSX's own (stale) style object
on any re-render the effect's deps don't trigger — an intermittent
regression triggered by unrelated shape churn.

## Files touched

- `apps/tabletop/src/client/shapes/MtgCounterShapeUtil.tsx`
- New Playwright test in `apps/tabletop/test/verification/verify-counter.spec.ts`
  asserting the textarea's rendered text baseline sits centered (via
  bounding-box comparison of the textarea vs. the actual line's rendered
  position) for a case that hits the wrap-boundary bug ("+1/+1").
