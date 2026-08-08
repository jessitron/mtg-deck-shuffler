# Table layout — the table is arranged like a table

Mountain: tabletop-replaces-mural
Type: wayfinder:map

**Map 2 of six.** The chart above this one is
[The Tabletop replaces Mural](../../apps/tabletop/notes/DESIGN-tabletop-replaces-mural.md) — read it first
for the whole parity list, the other five maps, and why they're split this way.

## Destination

The Tabletop's geography is the geography of a real Commander table: playmats in a **square
with the Stack in the middle** rather than today's row, a **command zone** you can drag your
commander in and out of, **life totals and commander damage** you can change, and each player's
space looking like theirs (playmat, sleeves, name, deck). Done when every one of those is
designed and decided — not built.

**Unblocked 2026-08-08** — [Physics](../tabletop-physics/map.md) is fully resolved (all 11
tickets closed): furniture is `mtg-zone`, cards are `mtg-card`, both real custom shape types.
This map builds the geography on top of that settled shape layer.

Three of the tickets below don't touch shape architecture and can be worked in parallel if you
want motion: seat label deck name, sleeve/playmat picker, and the cosmetic half of player-area
polish.

## Notes

- Skills every session should consult: `/grilling`, `/domain-modeling`. Read
  `docs/agents/issue-tracker.md` before writing into the tracker.
- `apps/tabletop/DESIGN.md` carries the current player-area geometry; `apps/tabletop/CLAUDE.md`
  has this ship's architecture, commands, and gotchas. **`DESIGN.md`'s "Delta from what's built
  today" table is out of date** (verified 2026-08-06) — four rows list as unbuilt things that
  are built. Fix it as you touch it.
- Consult the `shuffler-looks-like-itself` owner before any visual decision here — it's
  fleet-scoped and explicitly covers tldraw-adjacent UI.
- This map was formerly `tabletop-card-physics-starter`, a pre-destination slice. Renamed and
  rescoped 2026-08-06 once the real destination was grilled out. Four of its ten tickets left:
  rotate-to-tap went to map 1, three were parked for maps 3–5 (see the chart), and the deck-title
  ticket went back to `TODO.md` because it's a Shuffler game-screen change, not this mountain.

## Decisions so far

- **The synced canvas is landed** (2026-07-27) — a tldraw room at `/t/:tableName`, card arrival
  from the Shuffler, deployed at `table.jessitron.honeydemo.io`. The floor this map builds on.
- **Player-area geometry is built** for the row layout (`apps/tabletop/DESIGN.md`, 2026-08-01):
  playmat, library, graveyard, exile, and a shared Stack strip along the top. The square is a
  *change* to this, not a first draft.
- [Design command-zone geometry and redraw the player
  area](issues/01-command-zone-and-player-area.md) (2026-08-08) — the Command Zone takes the old
  Exile spot next to Library, sized for two cards (partner commanders); Exile drops to the bottom
  third of the old Graveyard box, Graveyard keeps the top two-thirds; the column widens
  (~425 → ~545) and that ripple — shifting every seat to the right of a widened one — is in scope,
  not deferred. "Mat grows taller" stays separately deferred. Recorded in `apps/tabletop/DESIGN.md`.
- [Polish the player area's geometry and cosmetics](issues/04-player-area-polish.md) (2026-08-08) —
  implemented the four mechanical items (land gap, centered Stack-pile cards, playmat border
  approximated to the decided `solid black xl` look, library border+label as an outward frame
  around the opaque image). Rounded playmat corners stayed out — already decided (5% of height,
  `tabletop-physics` ticket 11) but blocked on the not-yet-built `mtg-zone` custom shape; tracked
  on the `zone-look-not-landed` line in `TODO.md`, not a fresh ticket.
- [Show the deck name with the player name above the playmat](issues/06-seat-label-deck-name.md)
  (2026-08-08) — deck name does not flow end-to-end today; it stops at the Shuffler. Needs a
  new field threaded through five spots: the `sendSeatJoinedBestEffort` call site, the
  `SeatJoinedEvent` type, a new/extended `contracts/` schema (no `seat.joined` schema exists
  yet, unlike `seat.taken.v1.json`), the Tabletop's `seatJoined.ts` validation, and the
  player-name label render in `tableFurniture.ts`. Label rendering itself is small once the
  data exists — the work is the threading. Implementation, not a further decision.

- [Place the commander in the command zone when the Tabletop loads](issues/08-commander-in-command-zone.md)
  (2026-08-08) — `mtg-card` gains two new first-class props: `owner: string` (seatId — real
  domain data, not a permission gate; Jess: "it doesn't limit who can move it") and
  `isCommander: boolean`. The Command Zone arms locally (via `useValue` in the zone's own
  `component()`, per ticket 03's pattern — zones stay `isLocked`, so `onDragShapesOver` hooks are
  unavailable) only when a dragged card's `owner` matches the zone's `seatId` and
  `isCommander` is set. The "home marker" is a second, faded, locked `mtg-card` shape in the
  zone, not zone-drawn chrome. Amends `tabletop-physics` ticket 02's "no owner field" line — see
  the addendum there.
- [Let a player pick their playmat and their sleeves](issues/09-sleeve-and-playmat-picker.md)
  (2026-08-08) — v1 splits the two fields: playmat gets curated image swatches
  (`.precon-tile` + `.hero-button.active`, seeded from the `aeoe-*.png` art-card images
  already used as home-page hero backgrounds), sleeves get a color picker plus quick color
  swatches (rendered as a solid color, not an image). Image swatches and custom URL for
  both fields are deferred to a later phase.
- [Design the square — seats around the Stack instead of a
  row](issues/10-the-square.md) (2026-08-08) — no per-viewer rotation, reconfirmed still
  out of scope; player areas stay upright and unrotated, just repositioned into compass
  slots (N/E/S/W) around a fixed-size, centered Stack, by join order (1→S, 2→S,N,
  3→S,N,E, 4→S,N,E,W). Replaces the row model outright. E/W areas will look "sideways"
  until per-viewer rotation exists someday — accepted, not solved here. Explicitly
  provisional pending play experience. Recorded in `apps/tabletop/DESIGN.md`'s new
  "The square" section.

- [Life totals and commander damage](issues/12-life-totals-and-commander-damage.md)
  (2026-08-08) — a life counter is a new **locked custom shape** (number + +/- buttons +
  direct typing) on the name row: name large left; right-justified, commander-damage
  counters then a bigger life counter. Life starts 40, commander damage 0, per
  **commander** (partners get two), identified by opponent name + sleeve color (rides on
  ticket 11). Everyone can change everything. Life-change *events* parked for Map 5 at
  `../tabletop-replaces-mural/parked/life-change-events.md`.

## Not yet specified

- **Seat position across a restart.** Seat index is `entry.seats.size` at join time, so after a
  server restart players re-joining in a different order land in different places. Belongs
  here (it's geography) but can't be decided until map 6 says what survives a restart.

## Out of scope

- **The card shape itself** — flip, counters, notes, stacking. That's
  [map 1, Physics](../tabletop-physics/map.md).
- **The narration/chat panel** — fleet Mountains 2 and 3, not this one. Ruled out 2026-08-06.
- **Spectator mode** — a standing constraint in `SEAMAP.md`, not work.
- **Rules enforcement** — explicit fleet non-goal; the human adjudicates.
