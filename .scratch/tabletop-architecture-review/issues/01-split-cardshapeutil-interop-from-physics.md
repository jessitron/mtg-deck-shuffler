# 01 — Split MtgCardShapeUtil's tldraw-interop from its card physics

**Status:** resolved — Jess's call (2026-08-11): (B), organizational split, with the added
principle "domain code shouldn't import display libraries" wherever a piece of logic
genuinely can be tldraw-free. `tabletop-shape-mechanics-review` cleared the plan
(`.scratch/tabletop-architecture-review/plan-ticket-01.md`) with no blocking findings.
Implemented: `MtgCardShapeUtil.tsx` split by hook into `cardRender.tsx`, `cardTapClick.ts`,
`cardPassengers.ts`, `cardZoneEntry.ts`, leaving the class a thin shell. Zero behavior
change — 110/110 vitest and 43/44 Playwright specs pass (the one failure reproduces
identically on unmodified main). `tabletop-shape-mechanics-update` run afterward.

**What the review proposed:** `src/client/shapes/MtgCardShapeUtil.tsx` (405 lines, 21 commits —
the hottest file in the ship) fuses five concerns behind one `ShapeUtil`: render + sleeve/face-down,
tap catch-up animation, `onDragShapesIn/Out` counter+note parenting, `onClick`/`onTranslateEnd`
zone-entry, and `evictPassengers` physics. The review's proposed fix: pull tap/zone/passenger
rules into a plain `CardPhysics` module (deep module, no tldraw dependency) that the `ShapeUtil`
calls into via `onTap`/`onSettleInZone`/`onPassengerDrag`, leaving the `ShapeUtil` a thin
mechanical adapter for tldraw's hook signatures.

**What grilling this found (2026-08-10):** consulted `tabletop-shape-mechanics-context` and
re-read the file. The proposed interop/physics seam does not hold cleanly:

- `onTranslateEnd`'s first line, `this.editor.setSelectedShapes([])`, is a pure tldraw-timing
  workaround (a `SelectTool` stale-selection bug — see ticket 05) that must run *before* the
  zone-equality early return, or the cleanup gets skipped for some drags. Moving it into
  `CardPhysics` gives that module an `Editor` dependency; leaving it in the adapter means the
  adapter isn't actually thin — it carries a load-bearing ordering constraint.
- `onClick`'s multi-untap propagation is inseparable from tldraw's own undocumented
  `PointingShape.onPointerUp` timing: the clicked card's change must return synchronously, while
  propagation to other selected cards must go through `queueMicrotask` specifically to land
  after tldraw's own `markHistoryStoppingPoint()` call, for undo-coalescing. This isn't "adapt a
  hook signature" — it's a domain rule whose correctness depends on exploiting tldraw's internal
  ordering, and a plain `onTap(card) -> newState` interface can't express it without leaking
  `Editor` back in.
- `onDragShapesIn`/`onDragShapesOut`'s `can*` gates exist only because defining any drag hook
  makes the card a universal drag target (tldraw plumbing); the rotation-zeroing math inside
  them is a direct consequence of tldraw's `reparentShapes` preserving page rotation — the
  "physics rule" (a passenger rides flat) is inseparable from the tldraw quirk that makes a
  naive write wrong.
- `zoneAt`/`evictPassengers` are the closest thing to genuinely separable domain logic — they're
  already correctly factored into `zoneHitTest.ts`/`openSpotNearZoneEdge.ts`, just not moved out
  of this file.

Every hook mixes a tldraw quirk with a card rule; there's no clean line to draw a `CardPhysics`
boundary along.

**Open question, not yet answered by Jess** (the interview pivoted onto ticket 05 before this
was settled) — what's the actual goal?

- **(A) The rules are hard to test without a live tldraw editor.** If so, this is mostly already
  solved by the existing pattern: pull out pure functions with no tldraw dependency
  (`tapPartial`, `zoneHitTest.ts`, `findOpenSpotsNearZoneEdge` — all already done for the parts
  that can be pure).
- **(B) The file is just long and hard to navigate.** If so, the fix is organizational — split by
  hook into named sections or files — not architectural. This session's recommendation is (B):
  there's no clean physics/interop seam available here, so claiming one (the review's
  `CardPhysics` framing) would just relocate the tangle rather than resolve it.

**Blocked by:** a decision from Jess on A vs. B (or a third option) before implementation.

- [ ] Get Jess's answer to the A/B question above.
- [ ] If (A): confirm there's no remaining untested-without-editor rule; likely no code change
      needed beyond documenting the existing pattern.
- [ ] If (B): split `MtgCardShapeUtil.tsx` by hook (render, tap, drag/passenger, translate/zone)
      into clearly-labeled sections or sibling files, preserving every existing ordering
      constraint and comment — this is a reorganization, not a behavior change.
- [ ] Consult `tabletop-shape-mechanics-review` with whichever plan is chosen before implementing.
- [ ] `tabletop-shape-mechanics-update` afterward.
