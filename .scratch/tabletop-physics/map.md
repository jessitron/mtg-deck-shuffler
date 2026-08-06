# Physics — cards and furniture are real shapes

Mountain: tabletop-replaces-mural
Type: wayfinder:map

**Map 1 of six.** The chart above this one is
[The Tabletop replaces Mural](../../notes/DESIGN-tabletop-replaces-mural.md) — read it first
for the whole parity list, the other five maps, and why they're split this way.

## Destination

**Decided: what a card is, and what furniture is, on the Tabletop.** A card that can flip, sit
face-down, hold counters and notes that travel with it, tuck behind another card, and stay
tapped when someone brushes a resize handle. Furniture that recognises what lands on it instead
of being an inert rectangle a card measures itself against.

Done when those are designed and decided, not built. This map blocks
[Table layout](../tabletop-table-layout/map.md): the square, the command zone, and life totals
all want furniture that behaves, and rebuilding the shape layer under finished geometry is the
expensive way round.

## Notes

- Skills every session should consult: `/grilling`, `/domain-modeling`. Read
  `docs/agents/issue-tracker.md` before writing into the tracker.
- **Consult the `two-faced-cards` owner** before deciding anything about flip, face-down, or
  how a card's face is chosen — it's fleet-scoped and explicitly covers the Tabletop's card
  rendering and the contract's card/face fields. **Consult `animations`** before deciding tap
  motion, and **`shuffler-looks-like-itself`** before any visual decision.
- `apps/tabletop/CLAUDE.md` has this ship's architecture, commands, and gotchas.
- The floor, verified in code 2026-08-06: `MtgCardImageShapeUtil` is **not a custom shape
  type** — it extends tldraw's stock `ImageShapeUtil` and overrides `onClick` (tap) and
  `onTranslateEnd` (zone detect), so cards are plain tldraw `image` shapes marked only by
  `meta.instanceId`. Furniture is stock locked `geo`/`image` shapes tagged with `meta.zone`.
  Flip, face-down, counters, notes, and stacking do not exist and none is a small addition.
- Cards can be freely resized and rotated by tldraw's selection handles today, which silently
  breaks the tap toggle — `UNTAPPED_EPSILON` reads any hand-rotation as "tapped."

## Decisions so far

- **Zone entry is detected card-side, deliberately** — [Tabletop cards report zone entry as
  named events](../tabletop-card-shape/issues/01-zone-entry-events.md), implemented 2026-08-06.
  `onTranslateEnd` on the card scans the page for shapes carrying `meta.zone` and tests
  `Box.containsPoint`; debounce state rides on the card's own `meta.zone`. The ticket chose this
  over target-side hooks (`onDragShapesOver`/`onDropShapesOver`) **because zones aren't custom
  shapes** — "which felt like a bigger change than this ticket needed." That bigger change is
  exactly what this map is for, so expect to revisit the choice, not inherit it.
- Notification is a bare `console.log`, an explicit descope, flagged for whoever builds a real
  consumer. Not this map's job to wire it — see map 5.
- [What does tldraw 5.2.5 actually require of a custom shape
  type?](issues/01-tldraw-custom-shape-facts.md) — resolved 2026-08-06, full findings in
  [research/tldraw-custom-shapes.md](research/tldraw-custom-shapes.md). Declaring a custom shape
  is cheap (four methods, no tool or toolbar entry needed); **syncing one is a mandatory
  three-place change** and `TLSocketRoom` *disconnects* a client that pushes an unknown type
  rather than dropping it. The sharpest finding: one util serves **every** `image` shape, so
  cards, locked furniture, and stray dropped JPEGs all run through `MtgCardImageShapeUtil` today,
  separated only by an `if` on `meta.instanceId`. Migrations are free now but bite when two
  deploys share a room — earlier than persistence does. Tap is free either way; don't let it
  argue the case.

## Not yet specified

- **Which attachment mechanism suits which passenger.** The [research
  ticket](issues/01-tldraw-custom-shape-facts.md) narrowed the field: *parenting* is the cheap
  one (children ride the parent transform, no custom type); *grouping* auto-dissolves at one
  child, so it cannot hold a single counter; *bindings* move nothing by themselves and cost the
  same registration as a shape; only a **custom container** (`BaseFrameLikeShapeUtil` /
  `onDragShapesIn`) gives furniture the target-side hooks. Which one a counter, a post-it, and a
  tucked card each want still can't be phrased sharply until the shape architecture is decided.
- **Whether a face-down card is a different shape, a prop, or a different image.** The Shuffler
  currently bakes the face into `imageUrl`, so the Tabletop cannot change a card's face at all
  today; whether that stays true is a `two-faced-cards` question this map will reach.
- **What happens to a counter when its card leaves the table** in ways other than the graveyard
  — exile, back to library, back to hand. Jess named the graveyard case ("they disappear");
  the others follow from whatever mechanism the counter ticket picks.

## Out of scope

- **Geography** — the square, the command zone's placement, life totals as furniture. Those are
  [map 2](../tabletop-table-layout/map.md); this map decides what furniture *is*, not where it goes.
- **Sending anything to the Spine** — map 5. This map may decide what a shape *knows*; the wire
  is somebody else's.
- **Curating the tldraw UI** — killing crop, the toolbar, the context menu — map 4. The one
  exception is where the stock handles actively break physics (tap), which is in scope here.
- **Undo** — map 4, because it's a board-wide question rather than a shape-level one.
