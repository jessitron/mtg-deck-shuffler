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

Everything under `apps/tabletop/src/client/shapes/` — `MtgCardShapeUtil.tsx`,
`MtgZoneShapeUtil.tsx`, `MtgCounterShapeUtil.tsx`, `MtgCounterTool.ts`, plus the pure seams
`zoneHitTest.ts` and `openSpotNearZoneEdge.ts` — and their interaction with tldraw's own
`SelectTool` child states (`PointingShape`, `Translating`, in
`node_modules/tldraw/src/lib/tools/SelectTool/childStates/`).
Concretely: click/tap toggling, drag-and-drop (including drag-and-drop *parenting* — counters
attaching to cards), shape selection state, zone detection via shape bounds, custom creation
tools, and any tldraw quirk discovered while implementing these.

**Ticket 02/12** (`.scratch/tabletop-physics/issues/12-*.md`, landed 2026-08-08) carried out the
rewrite decided by ticket 02: the card is now a genuine custom shape type, `mtg-card`, defined in
`apps/tabletop/src/shared/mtgCardShape.ts` and rendered by `MtgCardShapeUtil` extending
`BaseBoxShapeUtil` (not `ImageShapeUtil`). The old `MtgCardImageShapeUtil.tsx` is deleted.

**Ticket 13** (`.scratch/tabletop-physics/issues/13-*.md`, landed 2026-08-08) did the same for
furniture: the playmat, library, graveyard, exile, and the Stack are now a genuine custom shape
type, `mtg-zone`, defined in `apps/tabletop/src/shared/mtgZoneShape.ts` and rendered by
`MtgZoneShapeUtil` extending `BaseBoxShapeUtil`. Furniture is **no longer** "stock locked
`geo`/`image` shapes with no custom ShapeUtil" — that was true before this ticket, isn't now.
`MtgZoneShapeUtil` defines no interaction hooks at all (see `architecture.md`), which makes it
the KB's working example of "a locked shape needs none." See `architecture.md` for the mechanics
and the tldraw registration gotchas both rewrites surfaced.

**Ticket 17** (`.scratch/tabletop-physics/issues/17-flip-and-face-down.md`, landed 2026-08-09,
`eb24a4f`/`ff5d58a`) added the app's **first custom tldraw `ContextMenu`** —
`apps/tabletop/src/client/CardContextMenu.tsx`, wired via `TLComponents.ContextMenu` in
`TablePage.tsx` — carrying Flip/Turn face-down/Tap-Untap menu items for `mtg-card`. Mechanics
territory here is narrow but real: right-clicking a card selects it exactly like `PointingShape`
does, and unlike a locked shape's selection (which tldraw clears when the context menu closes),
an **unlocked card's selection survives menu close** — reopening watch point 1's stale-selection
hazard through a second gesture besides drag. See `architecture.md`'s "Ticket 17" section and
watch point 15.

**Ticket 18** (`.scratch/tabletop-physics/issues/18-counters.md`, landed 2026-08-08, `4c64ef2`)
added a third custom shape type: `mtg-counter`, an **unlocked, draggable, text-editable disc**
a player drops onto a card. Attachment is tldraw drag-and-drop *parenting*, mediated by drag
hooks on `mtg-card` (`canReceiveNewChildrenOfType`/`onDragShapesIn`/`onDragShapesOut`); a card
entering graveyard/exile/library evicts its counters to open spots near the zone's edge.
**Naming caution**: table-layout ticket 12's decided-but-unbuilt life counter also used the
working name `mtg-counter` — ticket 18 claimed the type string per the tabletop-physics spec,
so the life counter is named `mtg-life-counter` instead. The old locked-furniture `mtg-counter`
cautions in this KB describe *that* shape, not this one — see `architecture.md`.

**Ticket 19** (`.scratch/tabletop-physics/issues/19-notes.md`, landed 2026-08-10) generalized
ticket 18's counter-hosting into a "passenger" concept (`PASSENGER_TYPES`) and added tldraw's
**stock `note` shape** as a second passenger type — the first time this KB's mechanics reach past
this app's own custom shape types into a stock one tldraw ships. Notes attach to cards via the
same parenting mechanism counters use, and ride/detach/evict identically. Adding `note` to the
accept-list reopened the drag-identity hazard (watch point 1) for it, because stock
`NoteShapeUtil` has no drag-settle cleanup of its own — fixed by subclassing it
(`SelectionClearingNoteShapeUtil`), the KB's first instance of "subclass a stock ShapeUtil to add
a missing hook" as a reusable pattern for future stock-shape integrations. See `architecture.md`'s
"Ticket 19" section and watch point 18.

**Ticket 20** (`.scratch/tabletop-physics/issues/20-cards-behind-cards.md`, landed 2026-08-10,
**corrected the same day**) lets a card host another card, tucked underneath. The first cut
widened `PASSENGER_TYPES` to include `mtg-card` itself, via the same real-parenting mechanism
tickets 18/19 built, plus matrix-composition math to compensate a passenger card's rotation
across its host's tap. Jess's first real use found it broken: a card parented under another card
can **never** be reordered behind its own parent — confirmed against tldraw source
(`Editor.getUnorderedRenderingShapes`, `getReorderingShapesChanges`) — so "send to back" on a
tucked card could never work while real parenting was the mechanism. **Replaced the same day**
with a `meta.tuckedWith` link between two ordinary sibling cards — no `parentId` involved, so
tldraw's stock reorder actions genuinely work between them, and "host" is now computed live from
current z-order rather than fixed at attach time. A welcome side effect: since there's no real
parenting, tapping one card can no longer rotate the other at all, so the matrix-compensation
machinery the first cut needed is gone outright. See `architecture.md`'s "Ticket 20" section
(the broken design is kept, marked superseded, for the record) and watch point 19; a related
tldraw selection quirk found while testing the fix is watch point 20.

## Design philosophy

- **Extend tldraw's built-in shape utils rather than reimplementing them, where that's still
  possible.** The original `MtgCardImageShapeUtil` extended `ImageShapeUtil` specifically so
  crop/resize/rendering/migrations stayed exactly as tldraw ships them — only click/drag behavior
  differed. The ticket 12 rewrite deliberately breaks from this (see `architecture.md`'s "one
  util, three meanings" rationale), rendering its own `<img>` inside `BaseBoxShapeUtil` instead.
- **When tldraw does something surprising, read its source, don't guess.** The drag-bug fix was
  found by reading `PointingShape.ts` and `Translating.ts` in
  `node_modules/tldraw/src/lib/tools/SelectTool/childStates/`, not by trial and error. tldraw
  ships its TypeScript source in `node_modules` — use it. The same discipline found the
  `TLGlobalShapePropsMap` augmentation mechanism and the `useSync`/`createTLSchema`
  default-shapes gap documented in `architecture.md`.
- **Record tldraw limits rather than fighting them.** This mirrors the convention already
  established in `owners/shuffler-looks-like-itself/README.md`'s "tldraw limits" section (no
  Orbitron in the `geo` font enum, `:focus-visible` can't reach canvas shapes, a locked shape can
  never be a drop target, an opaque image hides a box's interior underneath). This owner's watch
  points are the shape-*interaction* analog of that list.

## Quick reference

| What | Where |
|---|---|
| Card ShapeUtil (tap/untap, drag settle, zone detection, counter hosting) | `apps/tabletop/src/client/shapes/MtgCardShapeUtil.tsx` |
| Tap pivot math (pure, shared by `onClick` and the context menu) | `apps/tabletop/src/client/shapes/cardTap.ts` (`tapPartial`) |
| First custom `ContextMenu` (Flip/Turn face down-up/Tap-Untap, right-click selection hazard) | `apps/tabletop/src/client/CardContextMenu.tsx`, wired via `TLComponents.ContextMenu` in `TablePage.tsx` |
| Regression test for context-menu stale-selection hazard | `apps/tabletop/test/verification/verify-flip-face-down.spec.ts` |
| Card shape's props/type definition | `apps/tabletop/src/shared/mtgCardShape.ts` (`MtgCardShapeProps`, `TLGlobalShapePropsMap` augmentation) |
| Zone ShapeUtil (furniture — no interaction hooks) | `apps/tabletop/src/client/shapes/MtgZoneShapeUtil.tsx` |
| Zone shape's props/type definition | `apps/tabletop/src/shared/mtgZoneShape.ts` (`MtgZoneShapeProps`, `TLGlobalShapePropsMap` augmentation) |
| Counter ShapeUtil (unlocked disc, double-click-to-edit text) | `apps/tabletop/src/client/shapes/MtgCounterShapeUtil.tsx` |
| Counter shape's props/type definition | `apps/tabletop/src/shared/mtgCounterShape.ts` (`MtgCounterShapeProps`, `TLGlobalShapePropsMap` augmentation) |
| Counter creation tool (click-to-place `StateNode`) | `apps/tabletop/src/client/shapes/MtgCounterTool.ts`, wired via `tools`/`uiOverrides`/`Toolbar` in `TablePage.tsx` |
| Counter eviction geometry (pure, unit-tested) | `apps/tabletop/src/client/shapes/openSpotNearZoneEdge.ts` |
| ShapeUtil registration (client) | `apps/tabletop/src/client/TablePage.tsx` (`shapeUtils = [...defaultShapeUtils.filter(Util => Util.type !== "note"), MtgCardShapeUtil, MtgZoneShapeUtil, MtgCounterShapeUtil, SelectionClearingNoteShapeUtil]` passed to both `useSync` and `<Tldraw>`) |
| Shape schema registration (server) | `apps/tabletop/src/server/rooms.ts` (`createTLSchema({ shapes: { ...defaultShapeSchemas, "mtg-card": {...}, "mtg-counter": {...}, "mtg-zone": {...} } })`) |
| Shape identity is minted | `apps/tabletop/src/server/cardArrival.ts` (arrival) or `apps/tabletop/src/server/seatJoined.ts` (commanders + ghosts, table-layout ticket 18) — both via `mtgCardShape()` in `tableFurniture.ts`; `props.instanceId`, `createShapeId` |
| tldraw's selection state machine (read, don't modify) | `node_modules/tldraw/src/lib/tools/SelectTool/childStates/PointingShape.ts`, `Translating.ts` |
| Regression test for the drag-identity bug | `apps/tabletop/test/verification/verify-drag-identity.spec.ts` |
| Regression test for multi-untap's undo coalescing (tldraw-upgrade tripwire) | `apps/tabletop/test/verification/verify-multi-untap.spec.ts` |
| Counter attach/detach/evict/edit tests | `apps/tabletop/test/verification/verify-counter.spec.ts`, `apps/tabletop/test/openSpotNearZoneEdge.test.ts` |
| Stock `note` ShapeUtil, subclassed to add the drag-settle selection-clear stock tldraw lacks | `apps/tabletop/src/client/shapes/SelectionClearingNoteShapeUtil.ts` |
| Note-as-passenger attach/detach/evict + stale-selection regression tests | `apps/tabletop/test/verification/verify-note.spec.ts` |
| Cards tuck via `meta.tuckedWith`, not parenting (live host-from-z-order, hand-rolled carry) | `apps/tabletop/src/client/shapes/MtgCardShapeUtil.tsx` (`tuckCard`/`untuck`/`carryTuckedPartner`) |
| Card-tuck attach/carry/nudge-vs-detach/reorder-swap/tap-independence/battlefield-detach tests | `apps/tabletop/test/verification/verify-cards-behind-cards.spec.ts` |

See `architecture.md` for how the pieces fit together, `interactions.md` for what depends on
this and the watch points, `history.md` for how we got here, `files.md` for the full file list.
