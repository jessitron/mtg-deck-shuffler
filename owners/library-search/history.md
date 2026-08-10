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

### NavList Grouped Navigation

- **`5e5f6dc`** - Scope card modal prev/next to type group in grouped library search
  - `src/navList.ts` helper: `resolveNavListNavigation()` and `navListQueryParam()`
  - Library modal passes `navList` per group section; card modal and flip-card-modal routes preserve it
- **`9fed59c`** - Fix: use `?` vs `&` for navList on prep URLs (no existing query params)
- **`9611995`** - E2E test for grouped nav in `verify-library-grouping.spec.ts`
- **`409ce18`** - Feature owner docs updated with navList architecture

### Test Infrastructure for Two-Faced Cards

- **`b937ea2`** - Seed script creates a game with "From Cute to Brute" precon (47 two-faced cards)
  - `selectPreconDeck()` now accepts optional `deckFilename` parameter
- **`66644e2`** - E2E test: grouped nav test uses game (not prep) with two-faced deck; new test verifies flip → navigate preserves group scope
- **`9338358`** - Fix prep flip button losing navList; add prep flip E2E test
  - Bug: prep card modal flip button was not passing `navList` through in `hx-get` URL
  - Flipping on prep page now preserves `&navList=...` in the flip URL

### cardTypes Replaces types + backFace

- **`f76b49c`** - Replace face data with a single `cardTypes` field (union of all faces)
  - `CardDefinition.types` renamed to `cardTypes`; `backFace`/`CardFace` and the never-displayed `manaCost`/`cmc`/`oracleText` removed.
  - `cardTypes` holds the union of every face's/part's types, computed at ingestion in the deck adapters. The per-request merge in `app.ts` (`[...new Set([...card.types, ...backFace?.types])]`) is gone — both routes now map `cardTypes: gc.card.cardTypes`.
  - `library-modal.ejs`: the three `card.types` reads became `card.cardTypes` (grouping + two icon spans). Grouping/sorting/icon logic unchanged.
  - **Behavior improvement**: split/adventure/prepare cards now group under ALL their parts' types (the MTGJSON adapter unions `otherFaceIds` faces). Previously only the front part's type was stored (e.g. `Eiganjo Dynastorian // Replenish` was `[Creature]`; now `[Creature, Sorcery]`).
- **`ef75759`** - Regenerated all 190 precons + the Archidekt example deck for the `cardTypes` format (PERSISTED_DECK_VERSION 3).

### Clickable Library Stack on Prep Page

- The library stack image on the prepare screen is now itself clickable to open the search modal (in addition to the existing "Search" button).
  - `views/prepare.ejs`: `renderLibraryStack()` is wrapped in a `<div class="library-stack-clickable">` carrying the same HTMX attrs as the Search button (`hx-get="/prep-library-modal/<%= prep.prepId %>"`, `hx-target="#modal-container"`, `hx-swap="innerHTML"`).
  - `public/prepare.css`: added `.library-stack-clickable { cursor: pointer }`.
  - Prep-only: the shared `formatLibraryStack()` (used by the game page, where the stack participates in draw/drag behavior) was NOT modified.
  - E2E: `test/verification/verify-prep-library-click.spec.ts`.

### New Co-Tenant of the Modal System

- The **Trainer "End Chat" evaluation modal** (`src/view/play-game/trainer-eval-modal.ts`) briefly shared `#modal-container` and the `/close-modal` route, using the standard `.modal-overlay`/`.modal-dialog`/`.modal-header`/`.modal-body` classes — same pattern as the library modal. **Since removed** in the Trainer chat rip-out (the Trainer window is being re-implemented from scratch). The shared modal infrastructure is untouched; library search is unaffected. Co-tenant reference dropped from interactions.md.

## 2026-07-27: Tabletop v0 Part B (JES-127) — no library-search behavior change

Neighbors changed around us; the feature is untouched. Recorded for accuracy:
`fromPersistedGameState` mints `cardInstanceId` on load (optional field, no version
bump, same signature); `PersistedGamePrep` gained optional
`tableName`/`playerName`/`seatId`; the hand/revealed card modal action rows gained
Discard + table-mode variants via a new optional 4th param on
`getModalCardActionsByLocation(..., inTableMode)`; htmx `responseHandling` gained a
502 entry. Modal co-tenancy (containers, `/close-modal`, z-index) unchanged; the new
tabletop-failure error modal is another `#modal-container` co-tenant.

## Game Library Search and Cards on Table → Alphabetical, Always

Real-game feedback: the game screen's library modal wasn't alphabetical and Jess
expected it to be. Investigation found position order was always the intended,
documented behavior on the game page — the alphabetical impression came from the
**prep** page, which sorts its deck by name at prep-creation time (`src/app.ts`,
the `sortedDeck` built when a prep is created). Decision: for "search your library
for a Forest," alphabetical is more useful than position — you're finding a card,
not reading positions, and you shuffle afterward anyway. **This is alphabetical,
full stop — no toggle back to position order was wanted or built.**

- `src/app.ts` `/library-modal/:gameId` (game): after mapping `GameCard`s to the
  template's simple card objects, added `.sort((a, b) => a.name.localeCompare(b.name))`.
  **`GameState.listLibrary()` itself was deliberately left untouched** — draw, Put on
  Top, and Put on Bottom all depend on its `location.position` ordering. Sort is
  display-only, applied to the mapped copy.
- `src/app.ts` `/prep-library-modal/:prepId` (prep): got the same sort. Before this,
  prep's alphabetical order was an accident of `sortedDeck` being pre-sorted at
  prep-creation time, not something the render route guaranteed itself — sorting
  here too makes both routes alphabetical on their own terms, independent of
  deck-storage order.
- `library-modal.ejs` needed no changes: the grouped view pushes cards into groups in
  the order it receives them, so a pre-sorted flat array yields alphabetical order
  within each type group too, for free.
- `src/view/play-game/game-modals.ts` `formatTableCardListHtmlFragment()`: Cards on
  Table was *already* alphabetical, but only as a side effect of `GameState`'s global
  `gameCards` name-sort invariant (`validateInvariants()`) plus `listTable()` doing no
  further sort. Made this explicit: sorts `tableCards` by `card.name` directly, so it
  no longer depends on that unrelated invariant holding.
- Sort key is `card.name` everywhere — already the canonical identity name (contains
  both faces for a two-faced card, e.g. `"Front // Back"`), never a face-specific
  name. A flipped card doesn't move in the list. See `notes/GLOSSARY.md` "Card vs Face".
- Tests: `test/game-modals.test.ts` (unit — pins Cards on Table order independent of
  play order) and `test/verification/verify-library-alphabetical-order.spec.ts`
  (Playwright — asserts alphabetical order ungrouped and within each type group,
  regardless of shuffle/position).
- Position order isn't gone — it's the one true order internally
  (`GameState.listLibrary()`), just never surfaced in the UI.
## 2026-08-10: Generic modal focus trap (`public/modal-focus.js`)

A new, generic focus-trap/focus-management mechanism landed for every
`#modal-container`/`#card-modal-container` consumer — not library-modal-specific, but
the library modal is one of its consumers and its main verification target.

- `views/partials/library-modal.ejs`: the outer `.modal-overlay` gained static
  `role="dialog" aria-modal="true"` next to the existing `tabindex="0"`.
- `public/modal-focus.js` (new file): on `htmx:afterSettle`, when a modal transitions
  from absent to present, captures the previously-focused element, moves focus onto
  the overlay, and sets native `inert` on the main page content region
  (`#game-container` or `main.prepare-container`) plus whichever modal container isn't
  currently topmost — so a modal's own content is never made inert while it's open.
  Handles the stacked case (card modal opened from inside the library modal): the
  library modal becomes inert while the card modal is topmost, and closing the card
  modal returns focus into the library modal (per-container prior-focus stack), not
  all the way back to the page opener.
- Verified by new `test/verification/verify-modal-focus.spec.ts` (open → Tab-trap →
  close → focus-restore on the library modal, opened via the real `.search-button`).
  Existing `verify-library-grouping.spec.ts` and `verify-prep-library-click.spec.ts`
  pass unchanged — clicking card-name-links, the group-by-type toggle, and the close
  button all still work.
- Owned primarily by `shuffler-looks-like-itself` (see its docs, commit `e2a97f1`) since
  it's a fleet-wide UI mechanism; recorded here so future library-modal changes know
  focus/inert lifecycle is already covered and shouldn't be reimplemented locally.

## Design Decision: EJS vs TypeScript Template

The library search modal is an EJS template (`views/partials/library-modal.ejs`) rather than a TypeScript view function (like `src/view/play-game/`). This follows the project's convention: EJS for informational/pre-game pages and modals, TypeScript for active gameplay page structure.

## Design Decision: Grouping in Template

Card type grouping logic lives in the EJS template itself, not in a separate TypeScript module. An earlier attempt created `src/view/common/card-grouping.ts` but the current implementation does all grouping inline in EJS. This keeps the logic co-located with the display.

## Recurring Challenge: Data Availability

The grouping feature was blocked once because `types` wasn't in persisted card data. This was resolved by ensuring `CardDefinition` always includes `types: string[]`. Any future features depending on card metadata should verify the data is present in persisted state.
