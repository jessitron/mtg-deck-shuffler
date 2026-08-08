# Spec: Table layout — build the table that's arranged like a table

Mountain: tabletop-replaces-mural
Ship: fleet
Status: ready-for-agent

This spec is the implementation voyage for [map 2, Table layout](map.md). Every design
decision in it was already made and grilled with Jess — the eight resolved tickets under
`issues/` and `apps/tabletop/DESIGN.md` are the sources of truth. This spec synthesizes
them into buildable work; where it and a ticket disagree, the ticket wins.

## Problem Statement

The Tabletop's board doesn't yet look or work like a real Commander table. Player areas
sit in a row instead of around the Stack; there is no Command Zone, so the commander has
nowhere to live and no way home; every player's space looks identical (same hardcoded
playmat, same standard card back, no deck name), so at a glance you can't tell whose
space — or whose card — is whose; and there are no life totals or commander damage at
all, so the single most-consulted numbers in a Commander game live on paper or in
players' heads, off the table.

## Solution

Build the geography the map decided. Player areas take compass slots (N/E/S/W) around a
fixed, centered Stack. Each player area gains a Command Zone beside the Library, sized
for partner commanders, with Graveyard and Exile restacked below. The commander arrives
in the Command Zone as a real card carrying `owner` and `isCommander`, leaves a faded
ghost marking its home, and the zone lights up when its own commander is dragged back
over it. On the Shuffler's prep screen, a player picks their playmat (curated image
swatches) and their sleeves (a color); the sleeve color travels through `seat.joined` as
data and renders as a solid-color sleeve frame on that seat's cards. The name row above
each playmat shows player name and deck name on the left and, on the right, a
commander-damage counter per opposing commander plus a bigger life counter — all
modifiable by anyone, synced to everyone.

## User Stories

1. As a player, I want the four player areas arranged in a square around the Stack, so that the board reads like the table I actually sit at.
2. As a player, I want the Stack to be a fixed-size square in the center of the board, so that "on the stack" is one stable, shared place regardless of how many players have joined.
3. As a player joining a table, I want my player area to appear in the next compass slot by join order (S, then N, then E, then W), so that seating is predictable and nobody's area moves when I arrive.
4. As a player, I want every player area to stay upright and unrotated, so that all text and card faces are readable by everyone on the shared, unrotatable canvas.
5. As a commander player, I want a Command Zone beside my Library, so that my commander has a home that isn't the battlefield or the deck.
6. As a player running partner commanders, I want the Command Zone sized for two cards side by side, so that both commanders fit their home.
7. As a player, I want Graveyard above Exile in the column under the Library and Command Zone (top two-thirds / bottom third), so that the discard-ish zones sit where they sit at a physical table.
8. As a player, I want the widened right-hand column to shift neighboring player areas over rather than overlap them, so that the board never draws one seat's furniture on top of another's.
9. As a player, I want my commander to appear in my Command Zone when it's played from the Shuffler, so that the game starts (and continues) with the commander where it belongs.
10. As a player, I want a faded, immovable ghost of my commander to stay in the Command Zone when the real card is on the battlefield, so that everyone can see where the commander lives and that it's currently out.
11. As a player dragging my own commander, I want the Command Zone to light up only for my commander — not any card, not an opponent's commander — so that the zone tells me it's the right home before I drop.
12. As a player, I want every card to carry whose it is (`owner`) as visible fact rather than as a permission, so that I can tell whose card I'm looking at while anyone can still move anything.
13. As a player on the Shuffler's prep screen, I want to pick my playmat from a curated set of image swatches, so that my space looks like mine without hunting for a URL.
14. As a player on the prep screen, I want to pick a sleeve color (color picker plus quick swatches), so that my cards are recognizably mine on the shared board.
15. As a player who picks no sleeve, I want my cards to keep the standard Magic card back, so that sleeves stay optional.
16. As a player, I want my face-down cards and library pile to render as my solid sleeve color, so that hidden cards still show whose they are.
17. As a player, I want my face-up cards framed by a sleeve-colored border slightly larger than the card, so that ownership reads at a glance even when the face shows.
18. As a player, I want my deck's name displayed with my name above my playmat, so that the table shows who's playing what.
19. As a player, I want a life counter on my name row starting at 40, so that Commander life totals live on the table instead of on paper.
20. As a player, I want +/- buttons and direct typing on every life counter, so that both quick pings and big corrections are easy.
21. As a player, I want a commander-damage counter per opposing commander (two for a partner deck), starting at 0 and always visible, so that the 21-damage rule is trackable without asking around.
22. As a player, I want each commander-damage counter identified by the opponent's name and sleeve color, so that I can tell whose commander dealt the damage.
23. As a player, I want to be able to change any counter at the table — mine or anyone's — so that the app stays out of adjudication, per the fleet's players-own-the-game principle.
24. As a player, I want every counter change to sync live to all browsers at the table, so that everyone reads the same game state.
25. As a returning player mid-game, I want the furniture, ghost, and counters to be locked against accidental dragging, so that reaching for a card can't smear the table.
26. As a player, I want every card put into the graveyard (discarded, or dragged in from outside) to take the next spot in a tidy stack, so that my graveyard reads as an ordered pile instead of a scatter.
27. As a player, I want a card I reposition *within* the graveyard to stay where I put it, so that auto-stacking never fights my deliberate arrangement.
28. As a player, I want the stack to start a new row when the next spot in line would fall outside the graveyard, and to wrap back to the top-left when the rows run out, so that cards never pile up outside the zone.
29. As a player, I want clicking a card that's behind another card in the graveyard to bring it to the front — and keep it there — so that I can read any card in the pile without dragging things apart.
30. As a player, I want exile to behave the same as the graveyard for both stacking and click-to-front, except that its smaller footprint stacks cards directly on top of each other, so that both discard-ish zones feel consistent.

## Implementation Decisions

All design decisions are final (grilled 2026-08-08); the items below are the build, in
rough dependency order. The Tabletop's design document carries the authoritative geometry
tables and the square's compass-slot model.

- **Command-zone redraw (ticket 01).** The Command Zone takes the old Exile spot beside
  the Library, two cards wide; Exile drops to the bottom third of the old Graveyard
  footprint; Graveyard keeps the top two-thirds. The right-hand column widens ~425 → ~545
  canvas units and the ripple is in scope: every seat's placement re-derives from the
  widened player-area width. Geometry constants live in the Tabletop server's card-layout
  module; furniture drawing in its table-furniture module.
- **The square (ticket 10).** The row-derivation of player-area position is replaced
  outright by compass slots (1→S; 2→S,N; 3→S,N,E; 4→S,N,E,W) around a fixed-size,
  centered Stack. No row fallback, no rotation; E/W areas look sideways and that's
  accepted. Keep zone bounding boxes disjoint — the card shape's zone detection is
  first-match, not closest-match, so overlapping boxes misfile drops.
- **Deck name threading (ticket 06).** A deck-name field is added at the Shuffler's
  seat-joined send (the deck's name is in scope at both call sites), on the
  `SeatJoinedEvent` type, in a new `seat.joined` contract schema (none exists today —
  only `seat.taken.v1`), in the Tabletop's seat-joined validation, and in the name-label
  render. The Spine has no `seat.joined` handling yet; no Spine change.
- **Picker v1 (ticket 09).** One prep-screen surface, two fields. Playmat: curated image
  swatches seeded from the `aeoe-*` art-card images already used as home-page hero
  backgrounds, presented in the precon-tile style with the hero-button underline as the
  selection signal, defaulting to today's hardcoded mat. Sleeves: a color picker plus
  quick color swatches. No modal, no free-text URL in v1.
- **Sleeve transport (ticket 11).** Optional `sleeveColor` (hex string) joins the player
  data in `seat.joined`; `cardBackImageUrl` becomes optional and is omitted when a sleeve
  is defined (if both arrive, `sleeveColor` wins). No `card.played` revision — sleeve is
  seat data. One schema session covers this and the deck-name field.
- **Sleeve rendering (ticket 11).** Sleeve color is a game constant, so the Tabletop
  server bakes it into `mtg-card` props at mint time (this legalizes baking; the old
  no-baking rule's rationale was mid-game sleeve changes, which don't exist). Face-down
  and library render as a solid sleeve-colored rectangle slightly larger than the card;
  face-up renders the card image centered inside that rectangle. Exact margin, radius,
  and border/sheen are appearance choices to make at implementation time with the
  `shuffler-looks-like-itself` owner.
- **Commander identity (ticket 08).** `mtg-card` gains two first-class, schema'd, synced
  props: `owner` (seatId) and `isCommander` (boolean), set via the ordinary card-arrival
  path — no new event kind. The `card.played` contract gains the same two fields, the
  same way `face`/`faceDown` were added. `owner` grants no capability: anyone can still
  move anything.
- **Command-zone arming (ticket 08).** Zones stay locked, so drag-over hooks are
  unavailable; arming is computed reactively inside the zone's own component (the
  established zone-arming pattern), lighting up only when the translating shape is an
  `mtg-card` with `isCommander` true and `owner` equal to the zone's seat. Local-only,
  nothing written to the synced store.
- **Ghost copy (ticket 08).** The commander's home marker is a genuine second `mtg-card`
  shape — locked, reduced opacity, non-interactive, showing the front image — so it
  inherits card rendering for free. How and when it's minted, and how it's distinguished
  from the real commander for hit-testing (likely a meta/props flag), are implementer's
  choices.
- **Life counters (ticket 12).** A new locked custom shape (working name `mtg-counter`)
  whose component renders a number with +/- buttons and accepts direct typing, synced
  through the tldraw room. Name row layout: player name large and left-justified; then
  right-justified, commander-damage counters, then a bigger life counter on the far
  right. Life starts at 40; commander damage starts at 0, always visible, one counter
  per opposing commander (partners get two), identified by opponent name + sleeve color.
  Everyone can change everything; last-writer-wins collisions are accepted. Mechanics:
  locking gates tldraw's gesture state machine but not DOM events, so buttons work with
  `pointer-events: all` plus marking pointer events handled (tldraw's own hyperlink-button
  pattern); typing must shield keystrokes from tldraw's tool hotkeys; the new shape type
  pays the four-step registration cost.
- **Graveyard/exile auto-stacking (ticket 22, added 2026-08-08).** *Entering* the zone
  places the card; *moving within* the zone never does. On "put in graveyard" — a discard
  arriving from the Shuffler, or a card dragged in from outside the zone — the card snaps
  to the next spot in line in a row-based stack; when that spot would fall outside the
  zone, start a new row, and when the rows run out, wrap to the top-left. A card already
  in the graveyard that a player moves around stays exactly where they put it. Exile gets
  the same entry-snap rule, but its smaller footprint stacks cards directly on top of one
  another (all slots coincide). How the "next spot" is derived (counter vs. scan of
  occupied slots) and exact card spacing within the stack are implementer's choices.
- **Click-to-front in graveyard and exile (ticket 23, added 2026-08-08).** Clicking a
  card inside the graveyard or exile brings it to the front of the z-order, persistently
  (z-order is document state, so it syncs like any reorder). This composes with — never
  replaces — whatever click already does on a card; scoped to these two zones, not the
  whole board. Consult `tabletop-shape-mechanics` for the onClick/selection-deferral
  watch points.
- **Zone look convergence.** New and redrawn furniture should land through the `mtg-zone`
  self-rendering shape with the decided zone look (dashed dark-pink at rest, armed amber
  glow, Orbitron labels; playmat exception: thick solid black with radius 5% of height) —
  the `zone-look-not-landed` inbox line records the stock-geo approximation still in
  place. Don't extend the stale look to new furniture.
- **Already landed, don't redo (ticket 04):** land gap, Stack-pile cards centered over
  the owning seat, playmat border approximated to solid/black/xl, library border+label
  framing the card-back image.

## Testing Decisions

Test external behavior at existing seams; no mocks, fakes only (fleet rule).

- **Highest existing seam — the Tabletop server's event handlers.** The seat-joined and
  card-arrival handlers already have vitest suites driving them against a fake/in-memory
  store and asserting on the shapes produced. Geometry (column widths, compass-slot
  placement, disjoint zone bounds), deck-name labeling, sleeve baking into card props,
  commander props, and ghost creation are all assertable here without a browser. This is
  the workhorse seam; prefer it.
- **Shuffler seam — the port-tabletop unit tests.** Existing suite covers the outbound
  payload shapes; extend for deck name and `sleeveColor` (and their absence).
- **Contract seam.** Schema validation is exercised on both sides today; the new
  `seat.joined` schema and the `card.played` field additions get valid/invalid payload
  tests in the established pattern, and unknown name/version still fails loudly.
- **Browser seam — Playwright via the Tabletop's `verify.sh`.** Only for what the server
  seam can't see: arming is a local derived render, and counter +/-/typing is DOM
  interaction on a locked shape. Keep these few and behavioral (drag commander → zone
  lights; click + → number increments in a second browser context).
- Prep-screen picker changes are user-visible Shuffler work: Playwright there, per the
  fleet workflow rule (user-visible → browser verification).
- Graveyard/exile stacking splits by seam: next-slot/row-wrap derivation is pure geometry
  — unit-test it directly; placement of a card *arriving* through a server-handled event
  asserts at the server event-handler seam; drag-a-card-in snapping and click-to-front
  are client mechanics on zone entry and pointer events → Playwright, few and behavioral
  (discard two → they tile; move one, discard again → moved card stays; click a buried
  card → it's on top in both browser contexts).
- No new seams are proposed.

## Out of Scope

- **"Mat grows taller" when lands overflow** — separately deferred runtime-resize
  problem (ticket 01 kept it out on purpose).
- **Per-viewer rotation** — reconfirmed hard tldraw limit; E/W sideways-ness is accepted.
- **Life-change events in the event log** — Map 5's; parked at
  `.scratch/tabletop-replaces-mural/parked/life-change-events.md`.
- **Phase-2 pickers** — image sleeves, custom URLs for either field, and the two-color
  (front/back) sleeve model.
- **Card-shape mechanics** — flip, counters-on-cards, notes: map 1 (Physics). (Pile
  arrangement *inside* the graveyard and exile was pulled into this spec 2026-08-08 —
  tickets 22–23; general card stacking anywhere else on the board remains map 1's.)
- **Seat position across a restart** — the map's one fog line; waits on map 6.
- **Play Face-Down, narration/chat, spectator mode, rules enforcement** — ruled out at
  the map/fleet level.

## Further Notes

- Ship is `fleet` because tickets 06/08/11 span Shuffler + `contracts/` + Tabletop;
  most individual tickets cut from this spec will be `Ship: tabletop`, with the
  contract/threading tickets `fleet`.
- The square is **explicitly provisional** — Jess: "this is all gonna be tweaked after
  play experience." Build to react to, not to defend.
- Owner consults to plan for: `shuffler-looks-like-itself` (all furniture/sleeve/picker
  appearance), `tabletop-shape-mechanics` (new shape type, arming, zone AABBs),
  `two-faced-cards` (card props and `card.played` fields).
- The Tabletop design doc's "Delta from what's built today" table was already flagged
  stale; whoever builds updates it as they land pieces.
