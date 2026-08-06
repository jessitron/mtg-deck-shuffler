# Table layout — the table is arranged like a table

Mountain: tabletop-replaces-mural
Type: wayfinder:map

**Map 2 of six.** The chart above this one is
[The Tabletop replaces Mural](../../notes/DESIGN-tabletop-replaces-mural.md) — read it first
for the whole parity list, the other five maps, and why they're split this way.

## Destination

The Tabletop's geography is the geography of a real Commander table: playmats in a **square
with the Stack in the middle** rather than today's row, a **command zone** you can drag your
commander in and out of, **life totals and commander damage** you can change, and each player's
space looking like theirs (playmat, sleeves, name, deck). Done when every one of those is
designed and decided — not built.

**Blocked, as a map, by [Physics](../tabletop-physics/map.md).** Furniture here has to recognise
what lands on it (a commander entering the command zone, a card leaving a playmat), and map 1
decides what furniture *is*. Rebuilding the shape layer under finished geometry is the expensive
way round.

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

## Not yet specified

- **The square itself.** `playerAreaX(seatIndex) = MARGIN_X + seatIndex * (PLAYER_AREA_W + GAP)`
  in `cardLayout.ts` puts seats in a row; the Stack is a strip across the top, widened on each
  join. Jess wants a square with the Stack in the middle, some mats sideways to the others.
  `DESIGN.md:173+` already considered and deferred this — "tldraw can't rotate per viewer" —
  so the deferral has to be revisited, not just reversed. Too unformed to ticket until map 1
  says what furniture is.
- **Life totals and commander damage.** Numbers a player can modify, and a commander-damage
  count per opponent. Nothing exists in code. What kind of object is a modifiable number here —
  furniture, a shape, or something outside the canvas entirely? Waits on map 1.
- **Seat position across a restart.** Seat index is `entry.seats.size` at join time, so after a
  server restart players re-joining in a different order land in different places. Belongs
  here (it's geography) but can't be decided until map 6 says what survives a restart.

## Out of scope

- **The card shape itself** — flip, counters, notes, stacking. That's
  [map 1, Physics](../tabletop-physics/map.md).
- **The narration/chat panel** — fleet Mountains 2 and 3, not this one. Ruled out 2026-08-06.
- **Spectator mode** — a standing constraint in `SEAMAP.md`, not work.
- **Rules enforcement** — explicit fleet non-goal; the human adjudicates.
