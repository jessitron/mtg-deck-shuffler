# Library Search History

## Timeline (oldest to newest)

### Foundation

- **`b4823cf`** - Implement library display feature for game state
- **`c8142b8`** - Add `listLibrary()` method to display library cards in position order
- **`f9cf1a5`** - Implement Search modal for library (first version)
- **`f106b32`** - Document Search Library Modal UI design

### HTMX Rewrite

- **`ada2d07`** - Reimplement Search modal to use only HTMX without JavaScript
  - Originally used custom JS; rewritten to pure HTMX pattern

### Prep Page Support

- **`0e92738`** - Replace library list with search button on `/prepare` page
  - Before this, the prep page showed all cards inline; now uses same modal pattern
- **`90cb1d0`** - Create separate format function for deck review state

### Template Unification

- **`a21f8db`** - Unify library search modal into single EJS template
  - Previously had separate templates for game and prep; merged into `library-modal.ejs`

### Card Type Grouping

- **`99322b9`** - Add card type grouping to library search modal (first attempt, tagged `bad-impl-of-library-search-grouping`)
  - Blocked by DB migration issue (cards didn't have `types` in persisted data)
- **`b12411b`** - Add card type grouping toggle to library search modal (successful re-implementation)
  - Added "Group by Type" toggle button
  - Added Playwright tests in `verify-library-grouping.spec.ts`

### Card Type Icons

- **`700fbe6`** - Add card type icons to library search modal
- **`e86fa8e`** - Color land icons by mana identity for basic lands
- **`a9ff6bc`** - Add gradient land icons for multicolor lands
- **`5876f89`** - Move mana colors to CSS custom properties

### Two-Faced Card Support

- **`3af3b01`** - Error on missing back face, download AllIdentifiers for lookups
- **`329baf5`** - Regenerate precon decks with back-face data from AllIdentifiers
- **`037dd01`** - Merge back-face types into Library Search type grouping
  - Two-faced cards now show types from both faces
- **`7c51713`** - Deduplicate merged back-face types in library search grouping
  - Fixed: cards with same type on both faces no longer show duplicate type entries

## Design Decision: EJS vs TypeScript Template

The library search modal is an EJS template (`views/partials/library-modal.ejs`) rather than a TypeScript view function (like `src/view/play-game/`). This follows the project's convention: EJS for informational/pre-game pages and modals, TypeScript for active gameplay page structure.

## Design Decision: Grouping in Template

Card type grouping logic lives in the EJS template itself, not in a separate TypeScript module. An earlier attempt created `src/view/common/card-grouping.ts` but the current implementation does all grouping inline in EJS. This keeps the logic co-located with the display.

## Recurring Challenge: Data Availability

The grouping feature was blocked once because `types` wasn't in persisted card data. This was resolved by ensuring `CardDefinition` always includes `types: string[]`. Any future features depending on card metadata should verify the data is present in persisted state.
