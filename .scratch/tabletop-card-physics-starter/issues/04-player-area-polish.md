# Polish the player area's geometry and cosmetics

Mountain: tabletop-replaces-mural
Type: task
Status: open

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
