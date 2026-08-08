# Interactions

## Depends On

### tldraw's `SelectTool` state machine (read-only dependency)
- `PointingShape` and `Translating` (`node_modules/tldraw/src/lib/tools/SelectTool/childStates/`)
  own selection and drag-start behavior; this owner's ShapeUtil hooks react to tldraw's
  decisions, never override tldraw's own state machine.
- tldraw ships its TypeScript source in `node_modules` — read it when behavior surprises you,
  same as `architecture.md`'s drag-bug writeup did. Don't guess from the compiled output or from
  the docs site; the actual guard conditions (e.g. `startTranslating`'s
  `!this.didSelectOnEnter && !this.editor.getSelectedShapeIds().length`) are the ground truth.
- **A tldraw version bump can change these internals without a major-version signal** — this
  owner has no test that would catch tldraw changing `PointingShape`'s logic; only the
  regression test (`verify-drag-identity.spec.ts`) would notice the *symptom* resurfacing, not
  the cause changing. If a tldraw upgrade is ever done, re-read `PointingShape.ts`/
  `Translating.ts` for this class of change.

### Shape identity (`props.instanceId`)
- Minted once in `apps/tabletop/src/server/cardArrival.ts` at shape creation, never elsewhere, now
  directly in the shape's validated `props` (moved out of `meta` by ticket 12, 2026-08-08).
- No hook needs a defensive identity guard anymore: `mtg-card` is its own exclusive tldraw shape
  type (registered via the `TLGlobalShapePropsMap` augmentation in
  `apps/tabletop/src/shared/mtgCardShape.ts` — see `architecture.md`), so every instance of it is
  a real card by construction. The old `if (!shape.meta?.instanceId) return undefined` guard,
  needed only because cards/furniture/stray-drops used to share `type: "image"`, was removed.
- `meta` still exists on the shape but now carries *only* `zone` (zone-entry dedup, see
  `onTranslateEnd`) — ticket 13 plans to move even that to reading `mtg-zone` shapes' props
  instead.

## Depended On By

### `two-faced-cards` (card rendering, not mechanics)
- Shares one file today (`MtgCardShapeUtil.tsx`) but a different concern: that owner cares what
  image/face renders, this owner cares whether the right shape responds to the pointer. See
  `owners/two-faced-cards/interactions.md` watch point 16 and `architecture.md`'s "How to tell
  this owner's territory from `two-faced-cards`'s" section.
- **Ticket 12's `mtg-card` rewrite landed as a joint change** (2026-08-08): the
  `setSelectedShapes([])` selection-cleanup was carried forward into the new ShapeUtil unchanged
  (any ShapeUtil with `onClick` inherits the tldraw quirk — watch point 1 below), and
  `two-faced-cards`'s props-based flip/identity model landed alongside it (flip is now a pure
  `props.face` write, no per-instance tldraw asset). Both owners' territory changed in the same
  commit; consult `owners/two-faced-cards/` for anything about *which face renders*, this owner
  for anything about *what responds to the pointer*.

### Zone detection (`tableFurniture.ts`, `cardLayout.ts`)
- `zoneAt()` in `MtgCardImageShapeUtil.tsx` walks every shape on the page looking for one whose
  `meta.zone` is a string and whose bounds contain the dragged card's center. Furniture shapes
  are stock, locked `geo`/`image` shapes stamped with `meta.zone` — not a custom ShapeUtil of
  their own. If furniture ever becomes a custom shape type (buoyed in `.scratch/tabletop-physics/
  issues/03-what-furniture-is.md` as `mtg-zone`), `zoneAt()`'s reliance on `meta.zone` as a bare
  string tag should be revisited here.

## Watch Points

1. **Any ShapeUtil that defines `onClick` inherits the selection-deferral quirk.** If a new
   custom shape type defines `onClick` (tap, a button, anything), its equivalent of
   `onTranslateEnd`/drag-settle must also call `this.editor.setSelectedShapes([])` — otherwise
   the drag-picks-up-the-wrong-shape bug reopens for that shape type. This is the single most
   important watch point in this KB; it already bit — and was correctly ported forward into —
   ticket 12's `mtg-card` rewrite (see `architecture.md`). Any *next* new custom shape type with
   `onClick` needs the same treatment.

2. **The selection-clear must run before any early return in the drag-settle hook.** In
   `onTranslateEnd`, the zone-equality check (`if (zone === previousZone) return undefined`) is
   hit by ordinary same-zone drags (e.g. rearranging two lands on one playmat). The
   `setSelectedShapes([])` call is placed *before* that early return specifically so those drags
   still clear selection. Moving it after, or adding a new early return above it, silently
   reopens the bug for whatever drags hit that return.

3. **`mtg-card` is now its own exclusive tldraw shape type — no identity guard needed, but don't
   assume that generalizes.** Since ticket 12, every `mtg-card` shape is a real card by
   construction, so hooks no longer guard on `props.instanceId` before acting. If a *future*
   shape type is ever added that shares a tldraw `type` string across meanings again (unlikely,
   but it's exactly how the old `image`-sharing bug happened), that guard pattern needs to come
   back for it.

4. **Rotation pivots around `x,y` (top-left), not the shape's center.** Any new hook that moves
   or rotates a card must recompute `x`/`y` to hold the center fixed under the new rotation (see
   `98f8bea`'s fix and the `halfExtent`/`center`/`topLeft` math in `onClick`) — a naive
   `rotation` write alone swings the card around its corner.

5. **This ShapeUtil currently has no tests for the tldraw-quirk class of bug beyond
   `verify-drag-identity.spec.ts`.** That test covers exactly the reported symptom (drag A, then
   drag B, B should move). It would NOT catch a regression in, say, shift-click multi-select
   interacting with `onClick`-bearing shapes, or a tldraw upgrade changing the guard conditions
   themselves. Treat new drag/select/tap behavior as needing its own explicit test, not coverage
   by association.

6. **Registering a new custom shape type needs FOUR separate steps, and missing any one fails
   differently.** (1) The `declare module "@tldraw/tlschema" { interface TLGlobalShapePropsMap`
   augmentation — miss it and `BaseBoxShapeUtil<Shape>` fails to *typecheck*, caught at build
   time. (2) Client `useSync({ shapeUtils: [...defaultShapeUtils, MyUtil] })` in `TablePage.tsx`
   — miss the `defaultShapeUtils` spread and *furniture* silently fails client-side validation,
   not the new shape. (3) Server `createTLSchema({ shapes: { ...defaultShapeSchemas, ... } })` in
   `rooms.ts` — miss the `defaultShapeSchemas` spread and the *server* schema rejects furniture,
   disconnecting clients outright. (4) The ShapeUtil's `component()` must wrap interactive content
   in `.tl-image-container`/`.tl-image` (or otherwise defeat `.tl-html-container`'s
   `pointer-events: none`) or clicks silently never land, which Playwright will report as "element
   intercepts pointer events" rather than anything shape-specific. See `architecture.md`'s
   Registration sections for all four. This bit on ticket 12's implementation (item 4, the
   pointer-events trap, broke every click-based Playwright spec until traced).

7. **`zoneAt()` is first-match-not-closest-match, with no orientation awareness — a new risk
   once zones cluster around a shared center.** `zoneAt()` (`MtgCardShapeUtil.tsx`, see
   `architecture.md`) walks `getCurrentPageShapes()` and returns the *first* candidate shape
   whose `meta.zone` bounds contain the dragged card's center — not the closest, not the
   smallest, not the one the player was visually dropping into. That was never a problem worth
   naming while zones (playmat/library/command-zone/graveyard/exile per seat) sat spread out in
   a row with clear gaps between player areas — bounds essentially never overlapped, so "first
   match" and "correct match" were the same thing by construction of the layout, not the code.
   **"The square"** (`.scratch/tabletop-table-layout/issues/10-the-square.md`, decided
   2026-08-08, not yet built — see `apps/tabletop/DESIGN.md`'s "The square" section) moves player
   areas from the row into compass slots (N/E/S/W) packed around a fixed-size centered Stack. If
   that packing puts E/W zones close to the Stack's corners, overlapping or abutting zone AABBs
   become possible for the first time, and `zoneAt()`'s first-match iteration order (whatever
   `getCurrentPageShapes()` happens to return) — not proximity, not which zone visually contains
   more of the card — would decide the winner. Flagged during the grilling session for "the
   square" as a risk worth recording before implementation starts, not yet a bug (no code has
   changed for this ticket; `cardLayout.ts`/`tableFurniture.ts` are untouched). Whoever builds
   "the square" should re-check `zoneAt()` against the actual N/E/S/W geometry once it's drawn,
   and consider closest-match-by-distance or smallest-containing-zone as a tiebreak if AABBs do
   end up overlapping.

## Not Related To

### Card face/image rendering
What image a card shows (front/back, Scryfall URL resolution, `CardDefinition`/`CardFace`) is
`two-faced-cards`'s territory, not this owner's — even though today it's the same source file.
A bug where the wrong *image* shows is that owner's; a bug where the wrong *shape* moves, taps,
or gets dragged is this owner's.

### Fleet visual design (colors, fonts, CSS)
`shuffler-looks-like-itself` owns the Tabletop's visual identity, including its own "tldraw
limits" list (font enum, focus rings, locked-shape drop targets, opaque-image z-order) — those
are *rendering/styling* limits, distinct from this owner's *interaction/selection* limits, even
though both are "things tldraw won't let us do." Consult that owner for appearance; this one for
gesture correctness.

### The Spine's event feed / table furniture placement
Where a card or zone gets *placed* on first arrival (`cardArrival.ts`, `tableFurniture.ts`,
`seatJoined.ts`) is the Tabletop's server-side geography, covered by `DESIGN.md` and the
`tabletop-physics` planning map — not this owner. This owner starts once a shape already exists
on the board and something clicks or drags it.
