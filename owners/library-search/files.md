# Library Search Files

_All paths below are relative to `apps/shuffler/` — e.g. `src/app.ts` is `apps/shuffler/src/app.ts`._

All files involved in the library search feature, grouped by role.

## Core Implementation

| File | Lines | Role |
|------|-------|------|
| `src/app.ts` | search `/library-modal/:gameId` | Game library modal route — reads `?groupBy=`/`?order=`, sorts alphabetically unless `order=position` (line numbers drift; other routes are interleaved) |
| `src/app.ts` | search `/prep-library-modal/:prepId` | Prep library modal route — same `?groupBy=`/`?order=` handling |
| `views/partials/library-modal.ejs` | all | Modal template (grouping logic, order-toggle buttons, type icons, card list) |

## Navigation (navList)

| File | Role |
|------|------|
| `src/navList.ts` | `resolveNavListNavigation()` and `navListQueryParam()` helpers |
| `test/navList.test.ts` | Unit tests for navList parsing and navigation |

## UI Entry Points

| File | Lines | Role |
|------|-------|------|
| `src/view/play-game/library-components.ts` | 20-23 | Search button on game page |
| `views/prepare.ejs` | 19-32 | Clickable library stack + Search button on prep page (both open the modal) |

## Client-Side Support

| File | Role |
|------|------|
| `public/modal-query-params.js` | Auto-open library modal from URL params, threading `groupBy` and `order` |
| `public/modal-focus.js` | Generic focus trap/inert/restore for all `#modal-container`/`#card-modal-container` consumers (library modal included) — not library-search-specific, owned jointly with every other modal co-tenant. See interactions.md. |

## Styling

| File | Key Selectors |
|------|---------------|
| `public/playmat.css` | `.group-by-type-toggle`, `.modal-subtitle-controls`, `.library-order-toggle`, `.order-toggle-btn`, `.order-toggle-btn.active`, `.card-type-group`, `.card-type-header`, `.card-type-icon`, `.card-type-header-icon`, `.library-search-list`, `.library-card-item` |

## Assets

| Directory | Contents |
|-----------|----------|
| `public/icons/card-types/` | `artifact.svg`, `creature.svg`, `enchantment.svg`, `instant.svg`, `land.svg`, `planeswalker.svg`, `sorcery.svg`, `multi-type.svg` |

## Data Model

| File | Relevant Parts |
|------|----------------|
| `src/types.ts` | `CardDefinition.cardTypes` (union of all faces' types), `CardDefinition.colorIdentity` |
| `src/GameState.ts` | `listLibrary()` method (~line 251) |
| `src/port-persist-state/types.ts` | `GameCard` interface (location, gameCardIndex) |

## Tests

| File | What It Tests |
|------|---------------|
| `test/verification/verify-library-grouping.spec.ts` | E2E: toggle button, grouped headers, group-scoped nav, flip preserves navList (game + prep) |
| `test/verification/verify-prep-library-click.spec.ts` | E2E: clicking the library stack on the prep page opens the search modal |
| `test/verification/verify-library-alphabetical-order.spec.ts` | E2E: default-state alphabetical order by name — ungrouped and within each type group — on both game and prep routes, including after a shuffle; plus a "Library Search - Order Toggle" block covering default state, switching to Position order (stable, differs from alphabetical after a shuffle), and that the order toggle survives the Group by Type toggle |
| `test/game-modals.test.ts` | Unit — not library search itself, but pins `formatTableCardListHtmlFragment()`'s alphabetical order (Cards on Table); see "Related, Not Library Search" below |
| `test/verification/verify-modal-focus.spec.ts` | E2E (generic focus mechanism, exercised via the library modal): open → Tab-trap → close → focus-restore |

## Documentation

| File | Relevance |
|------|-----------|
| `notes/FEATURE-card-type-grouping.md` | Task notes for implementing grouping |
| `notes/DESIGN-card-type-symbols.md` | Available SVG icons and which types have them |
| `apps/shuffler/notes/pages-and-modals.md` | Query parameter states including library modal |
| `views/design.ejs` | `/design` gallery: stages the order-toggle markup, flagged `badge-candidate` (unreviewed pattern) — see interactions.md |

## Related, Not Library Search

| File | Role |
|------|------|
| `src/view/play-game/game-modals.ts` `formatTableCardListHtmlFragment()` | Cards-on-Table list — a different zone/feature. Landed in the same commit as the library alphabetical-sort change (both made "sorted, always" explicit) but is not part of library search. Listed here for cross-reference only. |
