# Let a player pick their playmat and their sleeves

Mountain: tabletop-replaces-mural
Type: grilling
Status: resolved

## Question

`TODO.md`'s `personal-play-space` line (Backlog, but genuinely part of this Mountain —
the sleeve frame is Tabletop card-shape work, `apps/tabletop/SEAMAP.md`'s "physics of
Magic"). The plumbing already exists end to end: `seat.joined` carries both
`playmatImageUrl` and `cardBackImageUrl`, both currently hardcoded by
`defaultPlaymatImageUrl()`/`cardBackImageUrl()`, whose own comments say playmat/sleeve
selection is deferred. This is one picker on the Shuffler's prep screen feeding two
already-wired fields — decide its shape (inline swatches? a modal? free-text image URL,
matching the long-game plan in `DESIGN.md` that `playmatImageUrl` is "any image on the
internet"?).

The **rectangular sleeve frame** on the card back — the part that needs a custom
`ShapeUtil` — waits on nothing now that [Tabletop cards report zone entry as named
events](../../tabletop-card-shape/issues/01-zone-entry-events.md) has landed the shape.
A sleeve image is what a face-down card needs anyway: the back of a sleeved card *is*
the sleeve, and a sleeve edge gives cards the square corners the fleet's style wants.

Unblocked — no dependency on the other tickets in this map.

## Answer

Split by field, both decided as a v1-only shape (each has a later phase deferred, see fog):

- **Playmat (`playmatImageUrl`)** — a curated set of image swatches, à la `.precon-tile`
  (`deck-selection.css`) with `.hero-button.active`'s underline as the selection signal,
  defaulting to today's hardcoded playmat. Seed set: the `aeoe-*.png` art-card images
  already used as home-page hero backgrounds (`apps/shuffler/public/site.css`,
  `apps/shuffler/public/images/`) — no new art needed for v1. Image swatches with a custom
  URL come later, not now.
- **Sleeves (`cardBackImageUrl`)** — a color picker plus a handful of quick-pick color
  swatches, not an image picker. v1 renders the sleeve as a solid color, not an image.
  Image-based sleeve swatches and a custom-URL option come later, same as playmat's second
  phase.

Both are "start simple, layer on the open-ended plan later" — matches `DESIGN.md`'s
long-game framing of `playmatImageUrl`/`cardBackImageUrl` as eventually "any image on the
internet," just not the v1 cut. No modal, no free-text URL input in v1 for either field —
`.candidate-input` (the approved-but-unshipped text-input style) waits for the later phase.

Left open for a follow-on ticket, not decided here: since `cardBackImageUrl` is a URL field
today, a solid-color sleeve needs *some* representation to travel through `seat.joined` and
render as the sleeve — a real design/contract question, not just UI shape. Noted in this
map's fog.
