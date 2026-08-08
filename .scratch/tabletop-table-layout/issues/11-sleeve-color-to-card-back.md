# How a sleeve's chosen color travels and renders

Mountain: tabletop-replaces-mural
Ship: fleet
Type: grilling
Status: resolved

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

## Answer

Resolved 2026-08-08, grilled with Jess. Four decisions:

**1. Domain model — what a sleeve is.** A sleeve is a rectangle of solid color, slightly
larger than the card it holds (a few px per side at canvas scale, mirroring the few mm IRL).
Real sleeves have two colors — the front shows as a border framing a face-up card, the back
is the solid rectangle — but v1 has **one color doing both jobs** (most sleeves are one
color). **Sleeve color is a game constant**: chosen before the game, never changed mid-game.
That immutability is load-bearing — it's what makes per-card baking legal (below), dissolving
`tabletop-physics` ticket 02's old "never bake per-card" rule, whose whole rationale was
mid-game sleeve changes rewriting every shape.

**2. Transport — as a color, not a URL.** `sleeveColor` (hex string) joins the player data
in `seat.joined`. It travels as data, not pixels, because ticket 12 already made sleeve color
*player identity* — commander-damage counters need the raw hex, which a URL would lock away.
`cardBackImageUrl` becomes **optional**, omitted when a sleeve is defined; if both ever
arrive, `sleeveColor` wins. Sleeves are optional, so `sleeveColor` is optional too — no
default color; unsleeved seats keep the standard Magic card back.

**3. No `card.played` rev.** `card.played.v1` already carries `seat`, and its own charter
says derivable conveniences don't belong in the payload — sleeve color is seat data, so it
stays out. The only contract work is the seat-level (`seat.joined`) schema, which converges
with ticket 06's deck-name threading: one schema session covers both.

**4. Rendering.** At card arrival the Tabletop server looks up the seat's sleeve and **bakes
the color into the `mtg-card` shape's props at mint time**. Face-down card and library pile
render as a solid sleeve-colored rectangle; a face-up sleeved card renders as a sleeve-colored
rectangle with the card image centered inside (the IRL sleeve-border look). Cards with no
sleeve keep today's look: bare image face-up, standard Magic back face-down. Trivial to draw —
`mtg-card` is self-rendering HTML, so this is a div background plus padding. Exact margin,
corner radius, and any border/sheen are **appearance choices reserved for implementation
time** with the `shuffler-looks-like-itself` owner — not decided here.

Redeploy fragility (seat memory wiped → later cards arrive sleeveless) is accepted — same
class as the playmat and deck name already accept via best-effort `seat.joined`.
