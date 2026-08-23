# 01 — Tabletop: Stack shape driven by maxPlayers

**What to build:** `stackBounds()` and `playerAreaOrigin()` in `apps/tabletop/src/server/cardLayout.ts`
take a `maxPlayers` parameter (defaulting to 4, so existing callers keep working unchanged
until ticket 03 wires real values through). Two shape tiers: `maxPlayers` 3 or 4 produce
exactly today's 1000×1000 square, unchanged; `maxPlayers` 2 produces a rectangle narrower
on the E/W (x) axis, sized only for the S/N slots that will ever be used — exact dimensions
follow the same edge-clearance reasoning that sized today's square, not fixed numbers.
`assertLayoutInvariants()`/`checkZonesDisjoint` extend to validate the 2-player rectangle
as well as the existing square, so a narrower Stack can't silently let an S or N player
area's bounds touch it. `apps/tabletop/DESIGN.md`'s "square" section is updated to describe
max-players-driven shape selection instead of "always 1000×1000".

Consult `owners/tabletop-shape-mechanics` before finalizing the plan — the disjointness
invariant and geometry constants are its territory.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] `stackBounds(2)` returns a narrower rectangle; `stackBounds(3)`/`stackBounds(4)` are
      identical to today's square (regression guard)
- [ ] `stackBounds()`/`playerAreaOrigin()` default `maxPlayers` to 4 when not given
- [ ] `assertLayoutInvariants()` validates disjointness for both the square and the
      2-player rectangle at module load
- [ ] `apps/tabletop/DESIGN.md`'s "square" section describes max-players-driven shape
      selection
- [ ] `apps/tabletop/test/cardLayout.test.ts` covers `stackBounds(2)`, `stackBounds(3)`,
      `stackBounds(4)`, and disjointness for all three
