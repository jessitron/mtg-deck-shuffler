# 04 — Let each gesture announce itself, instead of reverse-engineering it from a store diff

**Status:** wontfix — Jess's call (2026-08-11): this belongs with the domain/physical events
design work (`.scratch/tabletop-table-reports/issues/02-event-vocabulary-domain-and-physical.md`),
not as a standalone cleanup here. That work already distinguishes domain events (`card.moved.v1`)
from physical events (`card.repositioned.v1`) at the contract level; when it reaches
`usePhysicsAnnouncements.ts`/`MtgCardShapeUtil.tsx`, self-announcement vs. centralized diffing
should be decided there, in that context, not in isolation.

**Files:** `src/client/usePhysicsAnnouncements.ts` (159 lines), `src/client/shapes/MtgCardShapeUtil.tsx`

**Problem, per the review:** the hook that causes a gesture already knows its name; a separate
listener (`usePhysicsAnnouncements.ts`) re-derives the same fact from a raw `beforeProps` vs.
`afterProps` diff — e.g. inferring "counter attached" from a `parentId` string prefix — so every
new gesture needs a matching branch in two places. A detach-reported-as-attach bug already came
from this duplication.

**Proposed solution, per the review:** have `onClick`/`onTranslateEnd`/`onDragShapesIn` emit
their own named events directly; keep the store-diff listener only as a generic fallback.

**Why this needs a decision before an agent runs with it:** `MtgCardShapeUtil.tsx`'s own comment
at `onTranslateEnd` says the centralized `usePhysicsAnnouncements.ts` approach was a *deliberate*
choice — "Descoped 2026-08-06 (Jess), superseded by ticket 21... this hook only computes the
zone change and returns it in `meta.zone`; `usePhysicsAnnouncements.ts`'s centralized
`store.listen()` is what announces it (`card.zoneMoved`, via Honeycomb, never `console.log`)."
That's `tabletop-physics` ticket 21, already shipped. This candidate proposes partially
reversing that centralization back toward per-gesture announcement. It may still be the right
call — the duplication and the detach/attach bug are real — but it's a call about a recent,
deliberate architectural decision, not a mechanical cleanup, so it needs Jess's sign-off before
an agent implements it.

- [ ] Get Jess's decision: keep the centralized `store.listen()` diff-based approach (ticket 21)
      and fix the specific detach/attach duplication a narrower way, or move to per-gesture named
      events as the review proposes, accepting that ticket 21's centralization gets partially
      undone.
- [ ] If per-gesture events are chosen: `onClick`/`onTranslateEnd`/`onDragShapesIn` emit their own
      named events at the point the gesture happens; `usePhysicsAnnouncements.ts`'s diff-based
      listener stays only as a fallback for gestures that don't (yet) self-announce.
- [ ] Verify no gesture currently announced via the diff listener goes silent during the
      transition — cross-check every event kind `usePhysicsAnnouncements.ts` currently emits
      against the new self-announcing call sites.
- [ ] Consult `tabletop-shape-mechanics-review` and check with `fleet-is-observable` (this changes
      where telemetry-worthy events get emitted from) before implementing.
- [ ] `tabletop-shape-mechanics-update` afterward.
