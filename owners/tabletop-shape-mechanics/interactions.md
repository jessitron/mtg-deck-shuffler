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

### Shape identity (`meta.instanceId`)
- Minted once in `apps/tabletop/src/server/cardArrival.ts` at shape creation, never elsewhere.
  Every hook in this owner's ShapeUtil guards on it (`if (!shape.meta?.instanceId) return
  undefined`) to distinguish real cards from locked furniture/stray images that share the same
  tldraw `type: "image"`.
- Ticket 02's `mtg-card` rewrite moves identity from `meta` into validated `props` — when that
  lands, update this section and `architecture.md`'s guard-pattern description.

## Depended On By

### `two-faced-cards` (card rendering, not mechanics)
- Shares one file today (`MtgCardImageShapeUtil.tsx`) but a different concern: that owner cares
  what image/face renders, this owner cares whether the right shape responds to the pointer. See
  `owners/two-faced-cards/interactions.md` watch point 16 and `architecture.md`'s "How to tell
  this owner's territory from `two-faced-cards`'s" section.
- **Ticket 02's `mtg-card` rewrite is a joint dependent**: it needs this owner's sign-off on
  carrying the `setSelectedShapes([])` selection-cleanup forward (any ShapeUtil with `onClick`
  inherits the tldraw quirk), and `two-faced-cards`'s sign-off on the props-based flip/identity
  model. Consult both, but for different questions — don't let one owner's review stand in for
  the other's.

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
   important watch point in this KB; it will bite ticket 02's `mtg-card` rewrite specifically
   (see `architecture.md`).

2. **The selection-clear must run before any early return in the drag-settle hook.** In
   `onTranslateEnd`, the zone-equality check (`if (zone === previousZone) return undefined`) is
   hit by ordinary same-zone drags (e.g. rearranging two lands on one playmat). The
   `setSelectedShapes([])` call is placed *before* that early return specifically so those drags
   still clear selection. Moving it after, or adding a new early return above it, silently
   reopens the bug for whatever drags hit that return.

3. **`meta.instanceId` (or its `props` successor after ticket 02) is the only signal that
   distinguishes a real card from furniture/stray images sharing the same tldraw shape type.**
   Any new hook added to this ShapeUtil must guard on it the same way, or it will fire for
   furniture too.

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
