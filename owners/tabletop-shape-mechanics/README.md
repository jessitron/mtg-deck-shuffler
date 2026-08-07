---
name: tabletop-shape-mechanics
kind: capability
---

# Tabletop Shape Mechanics

**The charge**: every gesture on a Tabletop card — tap, drag, drop — must act on the shape
actually under the pointer, using tldraw's own selection/translation state machine correctly,
even where that state machine has surprising edge cases around custom `ShapeUtil` hooks. This
holds regardless of what a shape displays (card face, furniture, future shape types); it's about
the *mechanics* of clicking and dragging things on the canvas, not what they look like.

This capability isn't user-visible as a feature — a player just expects "the card I dragged is
the card that moves." But when it breaks, it's a *glaring* bug (see `history.md`, `959831c`):
drag one card, then drag another, and the wrong one moves. That's the kind of failure this owner
exists to prevent from recurring, and to catch when someone else's change reopens it.

## Why this owner exists

Born 2026-08-07 out of a bug fix (`959831c`, "drag picks up the wrong card after a previous
drag"). The finding — a genuine tldraw quirk in its `SelectTool` state machine — initially landed
in `owners/two-faced-cards/` purely because that owner's trigger was broad enough to match "the
Tabletop's card rendering." It has nothing to do with card faces, flip, or `CardDefinition`. Jess
called out that shape-selection mechanics is complex enough to deserve its own standing owner, so
future bugs in this territory route here instead of being caught incidentally by a
card-rendering owner. See `history.md` for the full migration note.

## Scope

Everything under `apps/tabletop/src/client/shapes/` — currently one file,
`MtgCardImageShapeUtil.tsx` — and its interaction with tldraw's own `SelectTool` child states
(`PointingShape`, `Translating`, in `node_modules/tldraw/src/lib/tools/SelectTool/childStates/`).
Concretely: click/tap toggling, drag-and-drop, shape selection state, zone detection via shape
bounds, and any tldraw quirk discovered while implementing these.

**Ticket 02** (`.scratch/tabletop-physics/issues/02-what-a-card-is.md`, resolved 2026-08-07,
`c956949`) decided the card becomes a genuine custom shape type, `mtg-card` extending
`BaseBoxShapeUtil` (not `ImageShapeUtil`) — a full rewrite, not yet implemented. This owner's
watch points apply to whatever ShapeUtil renders a card, present or future; **the file path in
this KB will change when that rewrite lands** — update `files.md` then.

## Design philosophy

- **Extend tldraw's built-in shape utils rather than reimplementing them.**
  `MtgCardImageShapeUtil` extends `ImageShapeUtil` today specifically so crop/resize/rendering/
  migrations stay exactly as tldraw ships them — only click/drag behavior differs. (Ticket 02's
  `mtg-card` rewrite breaks from this for a different reason — see `architecture.md`.)
- **When tldraw does something surprising, read its source, don't guess.** The drag-bug fix was
  found by reading `PointingShape.ts` and `Translating.ts` in
  `node_modules/tldraw/src/lib/tools/SelectTool/childStates/`, not by trial and error. tldraw
  ships its TypeScript source in `node_modules` — use it.
- **Record tldraw limits rather than fighting them.** This mirrors the convention already
  established in `owners/shuffler-looks-like-itself/README.md`'s "tldraw limits" section (no
  Orbitron in the `geo` font enum, `:focus-visible` can't reach canvas shapes, a locked shape can
  never be a drop target, an opaque image hides a box's interior underneath). This owner's watch
  points are the shape-*interaction* analog of that list.

## Quick reference

| What | Where |
|---|---|
| Card ShapeUtil (tap/untap, drag settle, zone detection) | `apps/tabletop/src/client/shapes/MtgCardImageShapeUtil.tsx` |
| ShapeUtil registration | `apps/tabletop/src/client/TablePage.tsx` (`shapeUtils = [MtgCardImageShapeUtil]`) |
| Shape identity is minted | `apps/tabletop/src/server/cardArrival.ts` (`meta.instanceId`, `createShapeId`) |
| tldraw's selection state machine (read, don't modify) | `node_modules/tldraw/src/lib/tools/SelectTool/childStates/PointingShape.ts`, `Translating.ts` |
| Regression test for the drag-identity bug | `apps/tabletop/test/verification/verify-drag-identity.spec.ts` |

See `architecture.md` for how the pieces fit together, `interactions.md` for what depends on
this and the watch points, `history.md` for how we got here, `files.md` for the full file list.
