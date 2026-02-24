# Library Search Files

All files involved in the library search feature, grouped by role.

## Core Implementation

| File | Lines | Role |
|------|-------|------|
| `src/app.ts` | 501-541 | Game library modal route (`/library-modal/:gameId`) |
| `src/app.ts` | 780-819 | Prep library modal route (`/prep-library-modal/:prepId`) |
| `views/partials/library-modal.ejs` | all | Modal template (grouping logic, type icons, card list) |

## UI Entry Points

| File | Lines | Role |
|------|-------|------|
| `src/view/play-game/library-components.ts` | 20-23 | Search button on game page |
| `views/prepare.ejs` | 22-25 | Search button on prep page |

## Client-Side Support

| File | Role |
|------|------|
| `public/modal-query-params.js` | Auto-open library modal from URL params |

## Styling

| File | Key Selectors |
|------|---------------|
| `public/playmat.css` | `.group-by-type-toggle`, `.card-type-group`, `.card-type-header`, `.card-type-icon`, `.card-type-header-icon`, `.library-search-list`, `.library-card-item` |

## Assets

| Directory | Contents |
|-----------|----------|
| `public/icons/card-types/` | `artifact.svg`, `creature.svg`, `enchantment.svg`, `instant.svg`, `land.svg`, `planeswalker.svg`, `sorcery.svg`, `multi-type.svg` |

## Data Model

| File | Relevant Parts |
|------|----------------|
| `src/types.ts` | `CardDefinition.types`, `CardDefinition.backFace.types`, `CardDefinition.colorIdentity` |
| `src/GameState.ts` | `listLibrary()` method (~line 251) |
| `src/port-persist-state/types.ts` | `GameCard` interface (location, gameCardIndex) |

## Tests

| File | What It Tests |
|------|---------------|
| `test/verification/verify-library-grouping.spec.ts` | E2E: toggle button visibility, groupBy=type shows headers |

## Documentation

| File | Relevance |
|------|-----------|
| `notes/FEATURE-card-type-grouping.md` | Task notes for implementing grouping |
| `notes/DESIGN-card-type-symbols.md` | Available SVG icons and which types have them |
| `notes/pages-and-modals.md` | Query parameter states including library modal |
