# Colors from playmat to life counter

Mountain: tabletop-replaces-mural
Ship: fleet
Status: ready-for-agent

## Problem Statement

A player's seat on the Tabletop is currently identified by their raw sleeve color alone —
and if they didn't pick a sleeve, it isn't identified by color at all: the life counter falls
back to a fixed `--dark-pink`, the commander-damage counters on opponents' trackers fall back
the same way, and the player-area title is hardcoded to tldraw's stock `"green"` regardless of
who's sitting there. Every player looks the same shade of identity-less unless they happened to
pick a sleeve. Meanwhile every playmat already has a curated two-color set sitting unused in
`playmat-colors.json` (`chosenTwo`) — the raw material for a real per-seat identity is already
in the repo, just never wired anywhere.

## Solution

At Shuffle Up, the Shuffler resolves two colors — primary and secondary — for the seat, from
the player's playmat and sleeve choice, and sends them to the Tabletop alongside the existing
sleeve color. The Tabletop uses them to color that player's life counter, the commander-damage
counters that track them on other players' boards, and their player-area title (using whichever
of the two is darker, since title text needs to read against a light background).

Resolution rule:

- If the player chose a sleeve: primary = the sleeve color; secondary = whichever of the
  playmat's two curated colors (`chosenTwo`) contrasts most with the sleeve.
- If the player didn't choose a sleeve: primary = the darker of the playmat's two curated
  colors; secondary = the other one.

## User Stories

1. As a player who picked a sleeve and a playmat, I want my life counter colored by my sleeve
   and a contrasting playmat color, so that my counter reads as *mine* at a glance.
2. As a player who skipped the sleeve step, I want my life counter still colored distinctly —
   from my playmat's curated palette — so that I'm not stuck with the same generic fallback
   everyone else without a sleeve gets.
3. As a player, I want the commander-damage counters that track *me* on my opponents' boards to
   use my colors too, so that a glance at any opponent's board tells me which counter is mine
   without reading labels.
4. As a player, I want my name/deck title on my player area colored distinctly from the default
   green every seat currently gets, so that four player areas don't all look like generic
   copies of each other.
5. As a player, I want my title text to stay legible regardless of which of my two colors is
   lighter, so that the darker one is always chosen for text rather than whichever happens to be
   "primary."
6. As a developer, I want the color-resolution logic to be a pure function on the Shuffler side,
   so that it's testable without spinning up a server or a browser.
7. As a developer relying on the existing sleeve-color plumbing, I want primary/secondary colors
   to travel the same `seat.joined` path sleeve color already takes, so that no new transport
   mechanism is invented for what's structurally the same kind of data.
8. As the fleet's contract maintainer, I want the new fields to be optional and additive to
   `seat.joined.v1`, so that older Shuffler builds (with no primary/secondary yet) don't fail
   validation against a newer Tabletop, and vice versa.
9. As a player restarting a game (`/restart-game`), I want my colors recomputed the same way
   Shuffle Up computes them, so that the two entry points to seat.joined don't diverge in
   behavior.
10. As a player on a playmat with no curated `chosenTwo` entry in `playmat-colors.json`, I want a
    sane fallback (existing fixed identity colors) rather than a crash or a missing color, so
    that every playmat — curated or not — produces a usable seat identity.
11. As a spectator, I want to see the same seat colors a seated player sees, since seat colors
    are public information (compass position, name, deck) already carried on `seat.joined` —
    nothing about primary/secondary colors touches the hidden-hand/library boundary.

## Implementation Decisions

- **New pure function on the Shuffler**: `colorsForPlaymat(playmatPath, sleeveColor)` added to
  `table-look.ts`, alongside the existing `sleeveQuickPicksForPlaymat`/`isKnownPlaymatPath`
  exports. Returns `{ primaryColor, secondaryColor }` (both hex strings). Reads `chosenTwo` from
  the already-loaded `PLAYMAT_COLORS` data (currently loaded but unused past `chosenFive`/
  `chosenThree`).
  - Contrast is decided by whichever of the playmat's two `chosenTwo` colors has the greater
    perceptual distance from the sleeve color (reuse whatever existing brightness/contrast
    helper the codebase already has for light/dark text decisions — `isDarkHex` on the Tabletop
    side is the analogous check; if no such helper exists on the Shuffler side yet, add one
    there rather than duplicating the Tabletop's).
  - "Darker of the two" (no-sleeve case, and title-color selection on the Tabletop side) uses the
    same darkness measure.
  - Fallback when a playmat has no `chosenTwo` entry: use the existing fixed identity colors
    (the pair currently used as the generic fallback today, e.g. `--dark-pink`-equivalent) as
    both primary and secondary, so downstream code never receives an undefined color.
- **Wiring at the two call sites**: `/start-game` and `/restart-game` in `app.ts` both call
  `colorsForPlaymat(prep.playmatImagePath, prep.sleeveColor)` before building the seat.joined
  payload, and pass the result into `sendSeatJoinedBestEffort` / `buildSeatJoinedEvent` alongside
  the existing sleeve color argument.
- **Contract change**: `seat.joined.v1` gains two new **optional** string properties,
  `primaryColor` and `secondaryColor`, matching the existing `sleeveColor` hex pattern
  (`^#[0-9a-fA-F]{6}$`). Additive and optional — no version bump, since `additionalProperties:
  false` means the schema itself must be edited, but existing consumers that don't read the new
  fields are unaffected. The `SeatJoinedPayload` TS interface on the Tabletop side gains the same
  two optional fields.
- **Tabletop: life counter**. `mtgLifeCounterShapeProps` (and the shape's default props) gain
  `primaryColor: string | null` and `secondaryColor: string | null`, alongside the existing
  `sleeveColor`. `MtgLifeCounterShapeUtil`'s rendering switches its three sleeveColor-driven
  spots (identity-band background, identity-band text-contrast decision, counter border) to
  prefer primary/secondary when present, falling back to `sleeveColor`, falling back to the
  existing fixed default — preserving current behavior for any counter that never receives the
  new fields.
- **Tabletop: commander-damage counters**. `addCommanderDamageCounters` in `tableFurniture.ts`
  currently passes only the opponent's raw sleeve hex (`opponentSleeveColor`). It gains the
  opponent's primary/secondary colors (read from that seat's stored `PlayerArea`, which already
  stores `sleeveColor` per seat and will now also store primary/secondary) and passes them
  through the same way, so a commander-damage counter tracking player X renders with X's colors,
  not a monochrome sleeve hex.
- **Tabletop: player-area title**. The text shape built in `ensurePlayerArea` currently
  hardcodes tldraw's stock color name `"green"`. It switches to whichever of the seat's
  primary/secondary is darker. Since tldraw's `text` shape color prop takes a fixed palette of
  named colors rather than arbitrary hex, resolve this by rendering the title through whatever
  mechanism in this codebase already renders arbitrary hex as shape styling (the life counter's
  approach of computing inline style rather than using tldraw's `color` prop is the precedent) —
  or, if the title must stay a stock tldraw `text` shape for editability/selection reasons, snap
  the computed darker hex to the nearest tldraw stock color. Which approach is used is an open
  implementation call for whoever picks up that ticket — flagged in Further Notes below.
- **Storage**: `PlayerArea` (`tableFurniture.ts`) gains `primaryColor`/`secondaryColor` fields
  alongside its existing `sleeveColor`, set in `ensurePlayerArea` from the incoming seat.joined
  payload, so later reads (commander-damage counters, any future consumer) have a single source
  of truth per seat.

## Testing Decisions

- **Shuffler unit test**: `table-look.test.ts` gains a `describe("colorsForPlaymat", ...)` block
  in the same style as its existing `sleeveQuickPicksForPlaymat`/`isKnownPlaymatPath` tests — no
  I/O, direct function calls, covering: sleeve-chosen case picks the more-contrasting playmat
  color as secondary; no-sleeve case picks the darker playmat color as primary; a playmat with no
  `chosenTwo` entry falls back to the fixed default pair rather than throwing or returning
  `undefined`.
- **Tabletop integration test**: extend `seatJoined.test.ts`'s existing pattern — a real HTTP
  POST of a `seat.joined` envelope (with `primaryColor`/`secondaryColor` in the payload) to a
  real running server (`startServer`), then assert on the real shapes the room registry produced:
  the life counter's props carry the right colors, a commander-damage counter minted for that
  seat carries the same colors, and the player-area title reflects the darker of the two. One
  seam, one test file extension — covers contract validation (real ajv, not a mock) and shape
  creation together, matching this repo's "fakes, not mocks" preference.
- **Backward-compatibility case**: a `seat.joined` payload with sleeveColor only (no primary/
  secondary — simulating an old Shuffler build) still validates and still produces a life counter
  with the existing fallback behavior, added as a case in the same test file.

## Out of Scope

- Snap-to-nearest-tldraw-stock-color logic for the title (or any alternative rendering
  mechanism) is a decision left to the implementing ticket, not resolved here.
- Re-deriving colors for seats that joined before this feature shipped (no migration of
  already-running tables/games — this only affects seats joining fresh).
- Any change to how sleeve color itself is chosen or validated in the Shuffler's prep flow —
  this spec only adds a derived pair of colors alongside the existing sleeve color, it doesn't
  touch sleeve-color selection.
- The Spine. `seat.joined` today is a direct Shuffler→Tabletop POST, not routed through the
  Spine (per `seatJoined.ts`'s own comment on this being scaffolding for a future Spine feed) —
  nothing here changes that, and no Spine-side validation exists to update.
- Changing `chosenFive`/`chosenThree` consumers (sleeve quick-picks) — `chosenTwo` is newly read,
  the other arrays' existing consumers are untouched.

## Further Notes

- The player-area title's color mechanism (stock tldraw color vs. arbitrary hex via inline
  styling) is the one real open design call in this spec. The life counter precedent (rendering
  hex directly rather than using tldraw's named-color prop) suggests the same approach for the
  title, but the title is a plain `text` shape today and changing how its color is set may have
  implications for selection/editing behavior worth a quick sanity check against
  `tabletop-shape-mechanics` before landing.
- This spec supersedes the informal note under the old `playmat-colours-fleet-or-shuffler` TODO
  item (now resolved and removed): that item's "dynamic colors based on playmat choice" intent
  lives here now, under new names, rather than reviving `--playmat-one`/`--playmat-two`.
- Consult `shuffler-looks-like-itself` before landing on the title's color mechanism, and
  `tabletop-shape-mechanics` on any hook/behavior change to the title shape.
