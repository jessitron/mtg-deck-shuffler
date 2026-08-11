# 03 — Life counter shows the seat's colors

Mountain: tabletop-replaces-mural
Ship: tabletop
Status: ready-for-agent

**What to build:** A player's own life counter on the Tabletop renders using their
primary/secondary colors (stored on their `PlayerArea` since ticket 02) instead of falling
back to a flat sleeve hex or the generic `--dark-pink` default.

- `mtgLifeCounterShapeProps` (and the shape's default props) gain
  `primaryColor: string | null` and `secondaryColor: string | null`, alongside the existing
  `sleeveColor`.
- `MtgLifeCounterShapeUtil`'s three sleeve-driven render spots — identity-band background,
  identity-band text-contrast decision, counter border — prefer primary/secondary when
  present, falling back to `sleeveColor`, falling back to the existing fixed default. A
  counter that never receives the new fields (a seat that joined before this shipped, or an
  old Shuffler build) renders exactly as it does today.

**Blocked by:** 02 — needs primary/secondary colors to actually be present on the seat's
`PlayerArea`.

- [ ] A life counter for a seat with primary/secondary colors renders using them (background,
  text contrast, border)
- [ ] A life counter for a seat with sleeveColor only (no primary/secondary) renders exactly
  as it does today — no regression
- [ ] A life counter for a seat with none of the three renders the existing fixed default —
  no regression
