# Two-Faced Cards Files

## Core Types

| File | Role |
|---|---|
| `src/types.ts:2-8` | `CardFace` interface (back-face data) |
| `src/types.ts:10-23` | `CardDefinition` with `twoFaced` flag and `backFace?: CardFace` |
| `src/types.ts:49-54` | `getCardImageUrl()` — constructs Scryfall URL with `face` parameter |
| `src/port-persist-state/types.ts:72-78` | `GameCard` with `currentFace: "front" \| "back"` |
| `src/port-persist-state/persisted-types.ts:24-30` | `PersistedGameCard` with `currentFace` |

## State Mutation

| File | Role |
|---|---|
| `src/GameState.ts:593-611` | `flipCard()` — toggles `currentFace`, validates card is two-faced |
| `src/GameState.ts:100` | `newGame()` sets `currentFace: "front"` for all cards |
| `src/GameState.ts:147-186` | v3→v4 migration defaults `currentFace` to `"front"` |

## Routes (in `src/app.ts`)

| Route | Lines (approx) | Role |
|---|---|---|
| `POST /flip-card/:gameId/:gameCardIndex` | ~1234-1261 | Inline flip — returns `formatFlippingContainer()` |
| `POST /flip-card-modal/:gameId/:gameCardIndex` | ~1264-1377 | Modal flip — returns full card modal with navigation |
| `GET /card-modal/:gameId/:cardIndex` | ~580-696 | Card modal — shows flip button if `twoFaced` |
| `GET /prep-card-modal/:prepId/:cardIndex` | ~698-804 | Prep card modal — flip via `?face=` query param |
| `GET /library-modal/:gameId` | ~500-542 | Game library modal — merges back-face types |
| `GET /prep-library-modal/:prepId` | ~807-845 | Prep library modal — merges back-face types |

## View Rendering

| File | Role |
|---|---|
| `src/view/common/shared-components.ts:33-71` | `formatCardContainer()` — branches on `twoFaced` |
| `src/view/common/shared-components.ts:73-93` | `formatFlippingContainer()` — builds 3D flip HTML structure |
| `views/partials/card-modal.ejs` | Card modal template — receives `currentFace`, renders flip button |

## Styling

| File | Role |
|---|---|
| `public/game.css:104-143` | Flip animation CSS for game page |
| `public/prepare.css:221-276` | Flip animation CSS and button styling for prep page |
| `public/playmat.css:463` | `.modal-action-button.flip-button` styling in card modal |

## Deck Adapters (Ingestion)

| File | Role |
|---|---|
| `src/port-deck-retrieval/archidektAdapter/ArchidektDeckToDeckAdapter.ts:84-127` | Extracts `twoFaced` and `backFace` from Archidekt faces array |
| `src/port-deck-retrieval/mtgjsonAdapter/MtgjsonDeckAdapter.ts:65-109` | Extracts `twoFaced` from layout, `backFace` via `otherFaceIds` lookup |
| `src/port-deck-retrieval/mtgjsonAdapter/mtgjsonTypes.ts:16` | `side` field used to identify back face ("b") |

## Persistence

| File | Role |
|---|---|
| `src/port-card-repository/SqliteCardRepositoryAdapter.ts` | Stores `back_face` as JSON, `two_faced` as integer |
| `src/port-card-repository/hydration.ts:80-123` | Hydrates/dehydrates `currentFace` between GameCard and PersistedGameCard |

## Tests

| File | Role |
|---|---|
| `test/GameState.test.ts` | `flipCard` tests: flip two-faced card, error on non-existent, error on single-faced |
| `test/generators.ts:90-117` | `CardFace` generator, `cardDefinition` with linked `twoFaced`/`backFace` |
| `test/generators.ts:342-360` | `nicolBolas` fixture — ready-made two-faced card |
| `test/port-deck-retrieval/archidekt-deck-adapter.test.ts` | Two-faced card extraction tests |
| `test/port-deck-retrieval/mtgjson-deck-adapter.test.ts` | Two-faced card extraction tests |
| `test/port-card-repository/InMemoryCardRepositoryAdapter.test.ts` | Persistence round-trip tests |
| `test/port-card-repository/SqliteCardRepositoryAdapter.test.ts` | Persistence round-trip tests |
| `test/verification/verify-library-grouping.spec.ts` | E2E: flip preserves group-scoped navigation (game + prep) |

## Test Data

| File | Role |
|---|---|
| `src/scripts/seed-test-data.ts` | Seeds game with "From Cute to Brute" precon (many two-faced cards) |
| `test/decks/` | Local deck files — some contain two-faced cards |
