# 05 — Player-area title shows the darker color

Mountain: tabletop-replaces-mural
Ship: tabletop
Status: ready-for-agent

**What to build:** A seat's name/deck title on the Tabletop currently renders in tldraw's
hardcoded stock color `"green"`, regardless of who's sitting there. It switches to whichever
of the seat's primary/secondary colors is darker (using the same darkness measure as
`colorsForPlaymat`'s no-sleeve case), so four player areas read as visually distinct rather
than four generic copies of each other.

Open implementation call, flagged in the spec and not yet resolved: tldraw's `text` shape
color prop takes a fixed palette of named stock colors, not arbitrary hex. Two options —
render the title through an arbitrary-hex mechanism (the life counter's approach of computing
inline style rather than using tldraw's `color` prop is the precedent), or snap the computed
darker hex to the nearest tldraw stock color if the title needs to stay a stock-styled `text`
shape for editability/selection reasons. Sanity-check the choice against
`tabletop-shape-mechanics` before landing, since it may affect how the title shape behaves
under selection/editing.

**Blocked by:** 02 — needs primary/secondary colors present on the seat's `PlayerArea`.

- [ ] A seat's title renders in the darker of its primary/secondary colors
- [ ] A seat with sleeveColor only (no primary/secondary) renders its title exactly as it
  does today — no regression
- [ ] Chosen color mechanism (inline hex vs. nearest-stock-color) doesn't break title
  selection/editing behavior
