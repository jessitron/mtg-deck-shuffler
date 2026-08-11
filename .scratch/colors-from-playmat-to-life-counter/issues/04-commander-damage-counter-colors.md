# 04 — Commander-damage counters show the tracked player's colors

Mountain: tabletop-replaces-mural
Ship: tabletop
Status: ready-for-agent

**What to build:** The small commander-damage counter that tracks player X on an opponent's
board renders using X's primary/secondary colors, not a flat sleeve hex — so a glance at any
opponent's board tells a player which counter is tracking them without reading a label.

`addCommanderDamageCounters` (`tableFurniture.ts`) currently passes only the tracked player's
raw sleeve hex when minting these counters. It reuses the same shape type and rendering
logic ticket 03 built (`mtgLifeCounterShapeProps`'s primary/secondary support) — this ticket
is entirely about wiring the tracked seat's stored primary/secondary colors (from its
`PlayerArea`, populated in ticket 02) into that minting call, not building new rendering.

**Blocked by:** 02 (needs the colors stored on `PlayerArea`), 03 (needs the shape's
primary/secondary rendering already built).

- [ ] A commander-damage counter tracking a player with primary/secondary colors renders
  using them
- [ ] A commander-damage counter tracking a player with sleeveColor only renders exactly as
  it does today — no regression
