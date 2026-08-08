# How a sleeve's chosen color travels and renders

Mountain: tabletop-replaces-mural
Ship: fleet
Type: grilling
Status: claimed

## Question

[Let a player pick their playmat and their sleeves](09-sleeve-and-playmat-picker.md) decided
sleeves are **color-picked** in v1, rendered as a solid color — but `cardBackImageUrl` is a
URL field today, threaded Shuffler → `seat.joined` → Tabletop card back. How does a chosen
color become that field's value (or a new field)?

The sub-questions:

- Does the color travel *as a color* (a new `sleeveColor` field, contract change) or *as a
  URL* (a data: URI, or a Shuffler route that serves a solid-color image)?
- If a new field: what happens to `cardBackImageUrl` — replaced, or coexisting so the later
  image-sleeve phase has a home already?
- Where does the Tabletop render it — the `mtg-card` shape's back face draws a solid fill
  instead of an image, or it stays image-all-the-way-down?
- Contract impact: `seat.joined` has no schema in `contracts/` yet (noted in
  [Show the deck name with the player name above the playmat](06-seat-label-deck-name.md));
  whichever field shape wins, that schema work converges with ticket 06's.

Graduated 2026-08-08 from the map's fog, out of ticket 09's resolution.
