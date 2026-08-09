# Plan — ticket 16: prep-screen picker v1 (playmat swatches + sleeve color)

Ticket: `.scratch/tabletop-table-layout/issues/16-prep-screen-picker-v1.md`
Design source: issue 09 (resolved grilling). Prototype verdict: **variant A, "setup panel"**
(commit `683ca1c`, reverted; one compact opaque panel on the mat: mat-thumb row + sleeve-chip
row with None / mana-pie / custom color input). Live previews are part of the design:
mat pick swaps the page's mat art; sleeve pick tints `.cool-command-zone-surround` and
`.game-title`.

## What already exists (ticket 17 landed first)

- `PersistedGamePrep.sleeveColor?: string` (#rrggbb) + both persist adapters pass it through.
- `sendSeatJoinedBestEffort(tabletopPort, tableInfo, deckName, sleeveColor)` sends it in
  `seat.joined`; `buildSeatJoinedEvent` omits `cardBackImageUrl` when sleeved.
- `playmatImageUrl` in `seat.joined` is still hardcoded: `defaultPlaymatImageUrl()` =
  `${shufflerPublicUrl()}/images/aeoe-43-cascading-cataracts.png`.
- **Nothing sets `prep.sleeveColor` yet** — ticket 16 is the picker that writes it.

## Changes (all in `apps/shuffler/` except none)

1. **`src/table-look.ts`** (new): curated data, server-side truth.
   - `PLAYMATS`: the 5 `aeoe-*` images (slug, display name, path e.g.
     `/images/aeoe-43-cascading-cataracts.png`); `DEFAULT_PLAYMAT_PATH` = cascading-cataracts
     (today's hardcoded mat).
   - `SLEEVE_QUICK_PICKS`: mana-pie five (hexes mirroring the fleet's `--mana-*` tokens —
     domain data values, not chrome).
   - `isKnownPlaymatPath()`, `isValidSleeveColor()` (`#rrggbb` regex).
2. **Prep state**: `PersistedGamePrep.playmatImagePath?: string` — relative path, same
   optional-field-no-version-bump exception as `sleeveColor`; passthrough in
   `InMemoryPersistPrepAdapter` + `SqlitePersistPrepAdapter`.
   Stored relative (not absolute) so `SHUFFLER_PUBLIC_URL` differences between local/prod
   can't bake a wrong host into old preps.
3. **Route** `POST /prep-table-look/:prepId` (app.ts): form fields `playmat-path` and/or
   `sleeve-color` (empty string clears the sleeve = "None"). Validates against
   `table-look.ts`; 400 on unknown mat path / bad color; saves prep; 204 No Content.
   Fire-and-forget from the browser — picks persist immediately, so a reload or a later
   Shuffle Up (or /restart-game) sees them.
4. **Send wiring**: `sendSeatJoinedBestEffort(..., sleeveColor, playmatImagePath)`;
   `playmatImageUrl = playmatImagePath ? shufflerPublicUrl() + path : defaultPlaymatImageUrl()`.
   Both call sites (start-game, restart-game) pass `prep.playmatImagePath`.
5. **View**: `views/partials/table-look-panel.ejs` — variant A panel, rendered from prep
   state (selected mat defaults to `DEFAULT_PLAYMAT_PATH`; selected sleeve defaults to None).
   Included in `prepare.ejs` on the mat. Prepare.ejs also renders the picked mat as an
   inline `background-image` style on the playmat div (so a reload shows your mat).
6. **JS**: `public/prep-picker.js` — click a swatch → selection class moves, live preview
   (mat art on `.playmat`; sleeve tint on `.cool-command-zone-surround` + `.game-title`),
   fetch POST to persist. Color input uses `change` (not `input`) for the POST, `input`
   for live tint. Applies saved sleeve tint on DOMContentLoaded. (Custom JS, not htmx:
   live-preview + color-input interplay is the htmx-incompatible kind.)
7. **CSS** (`public/prepare.css`): adapt prototype variant-A block, tokens only,
   per owner-context guidance (2026-08-09):
   - Panel: opaque white, **square corners**, frame in the play pages' `black` (the
     join-table panel is precedent for the *idea* only — none of its `#888`/`#222`
     literals). Placement `.playmat .table-look-panel { grid-column: 2 / 7; grid-row: 4 }`.
   - Swatches: real `<button>`s (global focus ring reaches them; no outline rules ever),
     `--narrow-border` `--dark-pink` border, `--radius-soft` (pressable), selection =
     locked lift + 4px `--dark-pink` underline via `::after` (the `.hero-button.active`
     pattern — sanctioned for exclusive-choice controls).
   - Custom color input: 2px solid `--deep-space` on white (values from `.candidate-input`,
     which lives in design-candidates.css and can't be referenced), `--radius-soft` with a
     comment (a color input is pressed, not typed into — deliberate deviation from the
     flat text-input radius). **Selected state goes on the wrapper `<label>`** — inputs
     can't carry `::after`.
   - "None" chip shows the standard Magic card back image (null ⇔ unsleeved doctrine).
   - Sleeve tint is **JS-applied inline style only** — never a `.playmat-prepare .game-title`
     rule (appearance stays in the shared sheet; page-sheet rules leak onto /design).
   - Watch `--mana-W` (pale) vs the None chip at chip size — the card-back image on None
     should keep them distinguishable.
8. **Design gallery**: add a table-look-panel specimen to `views/design.ejs` in the same
   commit (house rule). Stage on `.stage-playmat` (Shuffler play-page convention), plain
   specimen (approved variant, not a `.choice` block), showing a selected mat swatch, the
   None chip, mana chips, and the color input. No APP_STYLESHEETS change (prepare.css
   already loads in the gallery). Run `verify-design-gallery` after as the canary.

## Verification (test-first at these seams)

- **Playwright `test/verification/verify-prep-picker.spec.ts`** (new):
  - default state: cascading-cataracts swatch selected, None sleeve selected;
  - pick another mat → `.playmat` background-image changes (live preview), reload →
    selection + mat art persist (prep state capture proven);
  - pick a sleeve color → command-zone surround + plaque tint, reload → chip still
    selected (capture proven);
  - custom color input round-trips.
- **Playmat end-to-end** (checklist: "picked playmat renders on that seat's player area"):
  extend `test/verification/verify-tabletop-integration.spec.ts` — pick a non-default mat
  on /prepare before Shuffle Up, assert the Tabletop's player area carries that mat's URL.
- **Unit** (`test/port-tabletop/sendToTable.test.ts`): `sendSeatJoinedBestEffort` sends the
  picked playmat as absolute URL; defaults to `defaultPlaymatImageUrl()` when unpicked.
- Full suite (`npm test`, `./verify.sh`) once at the end.

## Out of scope (v1 fog, per issue 09)

Modal, free-text URL, image sleeves, two-color sleeves, sleeves dressing the library
(separate task), Tabletop-side changes (none needed — playmat plumbing exists).
