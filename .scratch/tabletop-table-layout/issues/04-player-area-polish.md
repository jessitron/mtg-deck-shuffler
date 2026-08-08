# Polish the player area's geometry and cosmetics

Mountain: tabletop-replaces-mural
Type: task
Status: resolved

## Question

`TODO.md`'s `player-area-polish` line — not really a decision, four small nudges in the
same two files, already fully specified by `linear-wind-down` cluster 07's verified
read of the code:

- Land gap: `landPosition()` in `cardLayout.ts` has no margin term at all — add one.
- Center Stack-pile cards: `stackCardPosition()` doesn't take a `seatIndex` and anchors
  at the strip's left edge — make it center over the owning seat's playmat.
- Playmat border: `regionShape()`'s `dash: "dashed"`, `color: "grey"` — swap for a thick
  black border, drop the dotted outline.
- Library border + label: the Shuffler always sends a `cardBackImageUrl`
  (`sendToTable.ts:65`), so the library always renders through the **image** path, which
  has no border or label — the `regionShape` fallback that *does* carry the "Library"
  label never runs in practice. Give the image path a border and label too.

One item on this line isn't a prop tweak: **rounded playmat corners.** tldraw's `geo`
has no corner-radius prop, so it's a custom shape or baking corners into a playmat image
asset — that's a real decision, not a task. Split it out if it turns out to need more
than one sitting; otherwise decide it inline here.

Unblocked — no dependency on the other tickets in this map.

## Answer

Implemented the four mechanical items in `apps/tabletop/src/server/{cardLayout,tableFurniture}.ts`
and `cardArrival.ts`; split rounded corners back out.

- **Land gap** — `landPosition()` now spaces columns/rows by `CARD_W + LAND_GAP` /
  `CARD_H + LAND_GAP` (`LAND_GAP = 6`), rather than butting cards edge to edge.
- **Center Stack-pile cards** — `stackCardPosition()` now takes `seatIndex` and anchors at
  `playmatBounds(seatIndex)`'s horizontal center minus half a card width, plus the existing
  cascade offset. `cardArrival.ts` passes `playerArea.seatIndex`.
- **Playmat border** — `regionShape()` gained an optional `RegionStyle` param (`dash`/`color`/`size`,
  defaulting to today's `dashed`/`grey`/`s`); the playmat's `regionShape` call now passes
  `PLAYMAT_REGION_STYLE = { dash: "solid", color: "black", size: "xl" }`. Consulted
  `shuffler-looks-like-itself-context`: this is the closest stock tldraw `geo` prop combination
  to the already-decided target (`10px solid black`, `tabletop-physics` ticket 11) — not a fresh
  design decision, just an approximation until a real `mtg-zone` custom shape exists.
- **Library border + label** — the image path (`ensurePlayerArea`, when `cardBackImageUrl` is
  present) now draws the `regionShape` box (border + "Library" label) at full bounds *first*,
  then the card-back image *inset* by `LIBRARY_IMAGE_INSET = 12`px within it, so the box's edge
  and label read as an outward frame around the opaque image rather than being hidden underneath
  it — the same "outward effect" principle `tabletop-physics` ticket 11 used for the armed-zone
  highlight, per the owner's guidance.
- **Rounded playmat corners** — **not implemented here.** Confirmed via
  `shuffler-looks-like-itself-context` that this is already *decided* (`tabletop-physics` ticket
  11: 5% of the shape's own height, computed at render time) but not buildable on a stock `geo`
  shape (no corner-radius prop) — it needs the `mtg-zone` custom shape type, which doesn't exist
  yet. That's a build task, not a decision this ticket can make, so it stays out. Recorded on the
  existing `zone-look-not-landed` line in `TODO.md` rather than as a new ticket or buoy (near-duplicate).

Verified: `npx vitest run` — the two geometry/furniture test files pass in full (17/17); the two
pre-existing failures (`log.test.ts`, `rooms.test.ts`) reproduce identically on `main`, unrelated
to this change. `npx tsc --noEmit`'s one error is pre-existing, in an unrelated file
(`src/client/observability/index.ts`).
