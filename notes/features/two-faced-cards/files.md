# Two-Faced Cards Files

## Core Types

| File | Role |
|---|---|
| `src/types.ts` | `CardDefinition` with `twoFaced` flag, `cardTypes` (union of all faces' types), and optional `imageUris`/`backImageUris` (`CardImageUris`); no `CardFace`/`backFace` |
| `src/types.ts` | `getCardImageUrl(card, format, face)` — prefers stored URL; `constructCardImageUrl(scryfallId, format, face)` — fallback construction |
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
| `GET /library-modal/:gameId` | ~500-542 | Game library modal — maps `cardTypes` (already unioned) |
| `GET /prep-library-modal/:prepId` | ~807-845 | Prep library modal — maps `cardTypes` (already unioned) |

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

## Image Fetch (Ingestion)

| File | Role |
|---|---|
| `src/port-card-images/types.ts` | `CardImagesPort`, `FetchedCardImages` (`{front, back?}`) |
| `src/port-card-images/ScryfallCardImagesGateway.ts` | Batches `POST /cards/collection`; pure `mapScryfallCardToImages` reads `card_faces[0/1].image_uris` for DFCs, top-level `image_uris` for single-faced |
| `src/port-card-images/FakeCardImagesGateway.ts` | Test fake (synthesizes/seeds image URLs) |
| `src/port-card-images/enrichDeckWithImages.ts` | Attaches `imageUris` to all cards, `backImageUris` only to `twoFaced` cards |

## Deck Adapters (Ingestion)

| File | Role |
|---|---|
| `src/port-deck-retrieval/twoFacedLayouts.ts` | **Shared source of truth**: `DOUBLE_SIDED_LAYOUTS` + `isDoubleSidedLayout()`. Distinguishes real two-faced layouts from single-image multi-face layouts (split/adventure/prepare/...) |
| `src/port-deck-retrieval/archidektAdapter/ArchidektDeckToDeckAdapter.ts` | Optional injected `imagesPort`; enriches deck with Scryfall images in `retrieveDeck` (best-effort) |
| `src/port-deck-retrieval/archidektAdapter/ArchidektDeckToDeckAdapter.ts:84-110` | `twoFaced = faces.length===2 && isDoubleSidedLayout(layout)`; `cardTypes` = union of all faces' types |
| `src/port-deck-retrieval/archidektAdapter/archidektTypes.ts` | `ArchidektCard.oracleCard.layout?: string` (read for classification) |
| `src/port-deck-retrieval/mtgjsonAdapter/MtgjsonDeckAdapter.ts:66-100` | `twoFaced = isDoubleSidedLayout(layout)` (shared helper); `cardTypes` = union of card + `otherFaceIds` faces' types |
| `src/port-deck-retrieval/mtgjsonAdapter/mtgjsonTypes.ts:16` | `side` field used to identify back face ("b") |
| `src/scripts/inspect-archidekt-card.ts` | Diagnostic: dumps raw Archidekt `oracleCard` (layout, faces) — `npm run card:inspect -- <deckId> <nameSubstring>` |

## Persistence

| File | Role |
|---|---|
| `src/port-card-repository/SqliteCardRepositoryAdapter.ts` | Stores `card_types`/`image_uris`/`back_image_uris` as JSON, `two_faced` as integer; rebuilds the cache table on old schema, adds image columns via `ALTER TABLE` |
| `src/port-card-repository/hydration.ts:80-123` | Hydrates/dehydrates `currentFace` between GameCard and PersistedGameCard |

## Tests

| File | Role |
|---|---|
| `test/GameState.test.ts` | `flipCard` tests: flip two-faced card, error on non-existent, error on single-faced |
| `test/generators.ts` | `cardDefinition` generator (`cardTypes` + boolean `twoFaced`); `nicolBolas` fixture is two-faced with `cardTypes` `[Legendary, Creature, Planeswalker]` |
| `test/generators.ts:342-360` | `nicolBolas` fixture — ready-made two-faced card |
| `test/port-deck-retrieval/archidekt-deck-adapter.test.ts` | Two-faced card extraction tests |
| `test/port-deck-retrieval/mtgjson-deck-adapter.test.ts` | Two-faced card extraction tests |
| `test/port-card-repository/InMemoryCardRepositoryAdapter.test.ts` | Persistence round-trip tests |
| `test/port-card-repository/SqliteCardRepositoryAdapter.test.ts` | Persistence round-trip tests |
| `test/verification/verify-library-grouping.spec.ts` | E2E: flip preserves group-scoped navigation (game + prep) |

## Test Data

| File | Role |
|---|---|
| `test/decks/` | Local deck files — some contain two-faced cards |
