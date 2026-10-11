# DESIGN — the table's geometry

Zones, seats, the Stack, the player area and the fleet's invariants are in the
[fleet domain map](../../notes/fleet-domain-map.html). This file holds what the map
leaves out: the numbers, and the choices behind them. `src/server/cardLayout.ts`
implements it; `test/cardLayout.test.ts` asserts it. Change this file first when the
layout changes.

## Geometry

Derived from the physical objects:

- Magic card: 2.5″ × 3.5″
- Standard playmat: 24″ × 14″ — 9.6 cards wide, 4 cards tall

`CARD_W = 170`, `CARD_H = 238` fixes the scale at **68 canvas units per inch**.

| Thing          | Size (canvas units) | Notes                                                                 |
| -------------- | ------------------- | --------------------------------------------------------------------- |
| Card           | 170 × 238           |                                                                       |
| Playmat        | 1632 × 952          | 9.6 × 4 cards                                                         |
| Column         | 550 wide            | Library + 20 gap + Command Zone, to the playmat's right               |
| Library        | 170 × 278           | one card plus the label band; top-left of the column                  |
| Command Zone   | 360 × 278           | two cards + 20 gap, plus the label band; beside the library (partner commanders) |
| Graveyard      | 550 × 356           | what's left under the library row after Exile takes its share         |
| Exile          | 550 × 278           | one card plus the label band; flush with the playmat's bottom         |
| Player area    | 2202 × 952          | playmat + 20 gap + column                                             |
| The Stack      | 1000 × 1000         | a fixed square centered on the origin, at every player count          |

**The label band.** Every card-holding zone reserves 40 units at its top
(`ZONE_LABEL_BAND`, `src/shared/mtgZoneShape.ts`) so its label stays readable with a
card in it. Nothing draws the band; the library's card-back pile and the graveyard's
cascade start below it.

**Zones stay disjoint.** Every pair of zone boxes has at least a 20-unit gap (`GAP`).
Zone detection resolves an overlapping point by z-order, which for furniture is draw
order, so overlap would make a card's zone arbitrary.

**The Stack is 1000** to exceed the playmat's height (952), so the E/W areas —
vertically centered, y ∈ [-476, 476] — stay inside the Stack's band and clear of the
N/S areas.

**Slot margin is 100** (gap + 40 name label + gap) between the Stack's edge and each
player area, so the name label fits between them. Same on all four sides.

**Player-area origins** (top-left of the 2202 × 952 rectangle), from
`playerAreaOrigin()`:

| Slot | Origin          |
| ---- | --------------- |
| S    | (-1101, 600)    |
| N    | (-1101, -1552)  |
| E    | (600, -476)     |
| W    | (-2802, -476)   |

**Stack-side cascade.** A card played to the Stack lands on the side facing its
player's mat — S bottom, N top, E right, W left — centered on that side, so everyone
sees who played it (`stackCardPosition`). Each further card on that seat's side steps
36 along the side and 14 inward, keeping earlier arrivals visible.

The client frames the table's full fixed extent on open (`TABLE_EXTENT` in
`TablePage.tsx`), not a fit-to-content.

This geometry is provisional: Jess expects to tweak it after play experience.

## No per-viewer rotation

tldraw can't rotate the view per viewer on a shared board, so every player area stays
upright in world space. An E/W area's wide-short rectangle reads sideways to a viewer
expecting it to face the Stack. That's accepted, not a defect; a second, E/W-shaped
player-area layout isn't worth building for a cosmetic payoff.

## `playmatImageUrl` is opaque

The field is an absolute `https://` URL the browser loads directly. The Tabletop never
proxies, caches or validates it — same posture as hotlinked Scryfall card art. A
playmat that 404s, redirects or isn't an image degrades to a plain empty mat, never a
broken player area: the picture is the optional part.

## Deferred

- **Playmat selection** in prep. One hard-coded playmat today.
- **Sleeve selection** in prep, which makes the card back vary per seat. Until then
  everyone gets the standard Magic card back.
