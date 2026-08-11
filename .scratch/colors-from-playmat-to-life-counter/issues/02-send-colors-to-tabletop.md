# 02 — Shuffler sends primary/secondary colors to the Tabletop

Mountain: tabletop-replaces-mural
Ship: fleet
Status: ready-for-agent

**What to build:** At Shuffle Up and at restart-game, the Shuffler computes
`colorsForPlaymat(playmatImagePath, sleeveColor)` (built in ticket 01) and sends the
resulting primary/secondary colors to the Tabletop alongside the existing sleeve color, so a
seat's identity colors are available there for later tickets to render.

- `seat.joined.v1`'s contract schema gains two new **optional** string properties,
  `primaryColor` and `secondaryColor`, matching the existing `sleeveColor` hex pattern.
  Additive and optional so older Shuffler builds (sending sleeveColor only) keep validating
  against a newer Tabletop, and vice versa.
- Both `/start-game` and `/restart-game` compute and pass the colors into the seat.joined
  payload builder, so the two entry points don't diverge.
- The Tabletop's incoming payload type gains the same two optional fields, and its
  per-seat storage (`PlayerArea`) stores them alongside the sleeve color it already stores.

No visible rendering change on the Tabletop yet — this ticket is about the data arriving and
being stored correctly, verified by contract tests, not by looking at a shape on the canvas.

**Blocked by:** 01 — reuses `colorsForPlaymat`.

- [ ] `seat.joined.v1` schema has optional `primaryColor`/`secondaryColor` (hex pattern,
  matching `sleeveColor`'s)
- [ ] Tabletop's payload TS type includes the new optional fields
- [ ] `/start-game` computes and sends primary/secondary colors
- [ ] `/restart-game` computes and sends primary/secondary colors the same way
- [ ] A `seat.joined` payload with primary/secondary colors validates and the values land on
  that seat's stored `PlayerArea`
- [ ] A `seat.joined` payload with sleeveColor only (no primary/secondary — an old Shuffler
  build) still validates without error, and no downstream code reads `undefined` as a color
