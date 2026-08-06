# Let a player pick their playmat and their sleeves

Mountain: tabletop-replaces-mural
Type: grilling
Status: open

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
