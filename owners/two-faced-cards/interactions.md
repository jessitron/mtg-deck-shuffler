# Two-Faced Cards Interactions

This is the most cross-cutting feature in the app. Two-faced cards add complexity to almost every feature that touches card display, data, or persistence.

## Depends On

### Scryfall (image URLs + image API)
- Image URLs are **stored** on the card (`imageUris`/`backImageUris`), fetched from Scryfall at ingestion via `src/port-card-images/` (`ScryfallCardImagesGateway` → `POST /cards/collection`). `getCardImageUrl(card, format, face)` prefers the stored URL; `constructCardImageUrl(scryfallId, format, face)` is the fallback.
- Both faces still share the same `scryfallId`. At render the back is read from `card.backImageUris`; at ingestion it comes from `card_faces[1].image_uris`. When stored URLs are absent (legacy data, Scryfall miss), the back falls back to the constructed `face=back` path — so the old "same id, swap the path segment" behavior still exists as the fallback.
- **Why stored:** bare constructed `normal` URLs 404 for freshly-released cards; Scryfall only serves them at the versioned URL (`...jpg?<timestamp>`).
- Scryfall requires `User-Agent` + `Accept` headers (else 400) — set in `ScryfallCardImagesGateway.fetchBatch`.
- If Scryfall's path scheme changes, the stored URLs still work (verbatim from Scryfall); only the fallback `constructCardImageUrl()` in `src/types.ts` would need updating.

### Card Repository
- `SqliteCardRepositoryAdapter` stores `card_types` as JSON text column (no `back_face`/`mana_cost`/`cmc`/`oracle_text`)
- The cards table is a gitignored cache; on startup an old-schema table (lacking `card_types`) is DROPped and recreated
- Hydration/dehydration in `src/port-card-repository/hydration.ts` preserves `currentFace`

### Deck Adapters
- **Both adapters share `src/port-deck-retrieval/twoFacedLayouts.ts`** (`isDoubleSidedLayout()` / `DOUBLE_SIDED_LAYOUTS`) — the single source of truth for what's flippable
- Archidekt adapter: `twoFaced = faces.length === 2 && isDoubleSidedLayout(layout)`. `cardTypes` = union of all faces' types. Single-image layouts (`prepare`, `adventure`, `split`, `aftermath`, `flip`) are NOT two-faced but still contribute all their parts' types to `cardTypes`.
- MTGJSON adapter: `twoFaced = isDoubleSidedLayout(layout)`; `cardTypes` = union of the card's types + all `otherFaceIds` faces' types (any layout)
- MTGJSON requires AllIdentifiers data to resolve other faces by UUID (for `cardTypes` and the double-sided guard)

### Modal System
- Card modal (`views/partials/card-modal.ejs`) receives `currentFace` and renders the flip button conditionally
- Game flip uses `POST /flip-card-modal/` replacing `#card-modal-container`
- Prep flip uses `GET /prep-card-modal/` with `?face=` query parameter

### Prep vs Game Id Spaces
- `prepId` (`game_preps`) and `gameId` (`game_states`) are **independent** auto-increment sequences — the same number can name both a prep and an unrelated game
- `validateStateVersion` treats a missing `expected-version` as valid, so a stray game-route call is not caught by the optimistic lock
- Therefore prep surfaces must call prep routes. `FlipRequest` (`{page:"game"|"prep"}`) makes the asking page explicit rather than letting a prepId masquerade as a gameId

### Optimistic Locking
- Both flip routes use `requireValidVersion` middleware
- Flip changes state version (via persist), so stale clients get version errors

## Depended On By

### Library Search (tight coupling)
- Type grouping reads `gc.card.cardTypes` directly at `src/app.ts` (game library modal ~lines 523-528 and prep library modal ~lines 825-830) — no per-request merge, since `cardTypes` is pre-unioned at ingestion
- If `cardTypes` stops being the full union (e.g. an adapter only stores the front type), grouping silently loses groups
- Multi-face cards show in multiple type groups (e.g., Creature and Planeswalker)

### Card Display (every card rendering path)
- `formatCardContainer()` branches on `card.twoFaced` to decide between simple `<img>` and `formatFlippingContainer()`
- Any new card display context must handle the two-faced branch
- The flip container has nested divs that affect CSS selectors — animations targeting `.mtg-card-image` need to reach inside `.flip-container-inner`

### Commander Display
- `formatCommandZoneHtmlFragment()` calls `formatCardContainer()` which handles two-faced commanders
- Commander cards can be two-faced (e.g., Nicol Bolas, the Ravager)

### Card Modal Navigation
- Modal flip preserves `navList` for group-scoped navigation
- Game: `navList` passed in POST body, threaded through to new flip button's `hx-vals`
- Prep: `navList` passed as query parameter in flip button's `hx-get` URL
- If navigation changes, both flip routes need updating

### Game State Persistence
- `PersistedGameCard` includes `currentFace`
- `GameState.flipCard()` mutates `currentFace` on the GameCard
- State migration (v3→v4) defaults `currentFace` to `"front"` for legacy data

### Copy-to-Clipboard
- Card copy uses the current face's image URL
- The `copyCardImageToClipboard()` call in the modal receives the face-specific image URL
- The `/proxy-image` route (CORS proxy for copy) now **looks up the card** from `cardRepository` to use its stored URL, falling back to `constructCardImageUrl(cardId, "png", face)` when the card isn't cached

### Being-Played Animation
- CSS animation for cards being played must target images inside the flip container's nested structure
- Fix at `e904a8c` addressed this — regression risk if card container structure changes

### Test Infrastructure
- Test generators (`test/generators.ts`) generate `cardTypes` and a `twoFaced` boolean (no `CardFace`/`backFace`)
- `nicolBolas` fixture in generators is a ready-made two-faced card for tests

### The Tabletop port (card.played sender, JES-127)
- `src/port-tabletop/types.ts` `buildCardPlayedEvent` is the ONE door where a GameCard is serialized for the table: it sends `face: gameCard.currentFace` and the face-specific `imageUrl` via `getCardImageUrl(card, "normal", currentFace)`. Any new face semantics (a third face? partner backs?) must go through here and the contract (`contracts/payloads/card.played.v1.json` — schemaVersion bump, new file).
- Discard keeps `currentFace` (a flipped card is discarded as the face it was); mulligan resets it. If you add zone-moving operations, decide face-reset explicitly.

## Watch Points

These are specific things that could break two-faced cards if changed elsewhere:

1. **CardDefinition changes**: `CardDefinition` is intentionally minimal — identity fields, `twoFaced`, `cardTypes`, plus the optional `imageUris`/`backImageUris` (Scryfall image URLs). Don't re-add per-face card *text* (`manaCost`/`oracleText`/`cmc`/`backFace`); the card image is the source of truth and a future "is this hand worth keeping?" feature should read canonical data from MTGJSON/Scryfall. Image URLs are the deliberate exception — they're read on every render and *are* the image. If you add a field, both adapters and the SQLite cache schema must populate it. **An optional field with a graceful fallback (like `imageUris`) does NOT require a version bump** — see watch point #9 and the "optional fields" exception in `DESIGN-persistence-versioning.md`.

2. **New card display contexts**: Any new place that renders a card image must handle `twoFaced === true`. Use `formatCardContainer()` rather than building card HTML directly.

3. **CSS selector depth**: The flip container has 3 levels of nesting (`flip-container-outer` → `flip-container-inner` → `img`). CSS rules targeting `.mtg-card-image` or card animations must account for this depth.

4. **Modal re-render on flip**: The modal flip route re-renders the ENTIRE modal. If the card modal template adds new data requirements, the `/flip-card-modal/` route must also provide them.

5. **HTMX swap targets**: The inline flip button's `outerHTML` target differs by page — `#card-N-outer-flip-container-with-button` in a game, `#card-N-container` on the prepare screen (because the container's modal URL carries the face there). Changing either ID scheme, or adding wrapper elements, breaks inline flip on that page. Both come from `formatFlippingContainer`.

6. **Prep flip gaining persistence**: Currently prep flip is stateless (query param) on both surfaces — the card modal (`/prep-card-modal/?face=`) and the inline commander (`/prep-flip-card/?face=`). When this changes, the prep page will need a persistence mechanism for flip state, and **both** prep routes will need to read/write it.

   Note the one-way coupling is **deliberate, not a gap**: the page passes its face to the modal, but flipping in the modal leaves the page alone (Jess, 2026-07-27: "If I flip the card in the card modal, I actually don't want that to change the state on the page"). Don't "fix" it into two-way sync. Guarded by `verify-prep-commander-flip.spec.ts`.

6a. **New prep card surfaces**: Anything new on the prepare screen that renders a two-faced card inline must pass `flipRequest: { page: "prep", prepId }` to `formatCardContainer()`. Omitting it falls back to the game flip route with `gameId` — the JES-90 bug (see "Prep vs Game Id Spaces" above). Note that `renderPrepCommanderCard`'s regex rewrite of `/card-modal/` → `/prep-card-modal/` does **not** cover the flip button, and can't: the flip URL encodes the target face, so it has to be built where `currentFace` is known.

6b. **Don't reach for `hx-vals='js:…'` to pass the face**: it looks like the obvious way to read the `card-flipped` class at click time, and it breaks. `hx-vals` is inherited by descendants (the flip button is one), and htmx appends GET params to an existing query string, producing `?face=back&face=front`. Express reads a repeated key as an array, so a `req.query.face === "back"` check silently falls through to the front face. The face travels in the re-rendered container's URL instead. Full reasoning in [architecture.md](architecture.md#data-flow-flip-on-prep-page).

7. **New deck adapters**: Must determine `twoFaced` via `isDoubleSidedLayout(layout)` (from `twoFacedLayouts.ts`) and set `cardTypes` to the union of ALL faces'/parts' types. Do NOT infer two-faced from "two faces in the data" — split/adventure/prepare cards have two faces but one image (so `twoFaced=false`) yet still contribute both parts' types to `cardTypes`.

8. **Precon deck regeneration**: Required whenever the deck file format changes (bump `PERSISTED_DECK_VERSION` — see [`notes/DESIGN-persistence-versioning.md`](../../DESIGN-persistence-versioning.md)). When regenerating, AllIdentifiers data must be available for the MTGJSON adapter to resolve other faces. Without it, the adapter throws an error. AllIdentifiers.json now exceeds Node's max string length, so `fetch-mtgjson-precons.ts` stream-parses it with `stream-json` (commit `5b3e5b5`) rather than `fs.readFile` + `JSON.parse`. If you touch `loadCardDatabase()`, keep it streaming — a whole-file read will throw `RangeError: Invalid string length`.

9. **Game/prep state version**: `currentFace` is persisted on `PersistedGameCard`. Persisted state is now version-gated and **rejected** rather than migrated: `PERSISTED_GAME_STATE_VERSION` (now **10**) and `PERSISTED_GAME_PREP_VERSION` (3), and `fromPersistedGameState` / the prep routes throw `IncompatibleStateVersionError` / `IncompatiblePrepVersionError` (clear 410 page) for older versions. (8→9 added `mulliganStage`/`mulliganCount` to the envelope; 9→10 removed them again — the mulligan stage/count are now DERIVED from the event log via "deal opening hand"/"mulligan" events; 10→11 made those events atomic with their `moves` so a mulligan is one undoable event.) **If you change the card-data or persisted shapes again, follow the runbook: [`notes/DESIGN-persistence-versioning.md`](../../DESIGN-persistence-versioning.md)** — a `CardDefinition` field change normally means bumping all three version constants, **unless** the field is optional with a graceful fallback (like `imageUris`/`backImageUris`), in which case old data stays valid and no bump is needed (see the runbook's "optional fields" exception).

   Also: `GameState.mulligan()` resets each returning hand card's `currentFace` to `"front"` as it goes back to the library, so a redrawn two-faced card starts on its front (matching `newGame`). If you add more zone-moving operations that should "reset" a card, consider whether they too should clear `currentFace`.

10. **Single-image multi-face layouts** (`prepare`, `adventure`, `split`, `aftermath`, `flip`): These are deliberately NOT two-faced (no flip button) but DO contribute all their parts' types to `cardTypes`, so they appear under every relevant group in library search (e.g. a Prepared creature shows under both Creature and Sorcery). If a future feature needs both halves shown as images, that's a display feature, not a flip — don't reach for `twoFaced`.

11. **Stale cached deck files**: `twoFaced`/`cardTypes` are baked into `decks/*.json` at download time. Changing adapter logic does NOT retroactively fix already-downloaded decks — they keep their old values until re-downloaded (`npm run deck:download -- <id>` for Archidekt, `npm run precons:fetch-mtgjson -- --convert` for MTGJSON). The deck-file format is version-gated (`PERSISTED_DECK_VERSION`, currently 3); `LocalFileAdapter` rejects mismatched files, so a format change means regenerating all decks.

## Not Related To

### Card Back (library face-down)
The MTG card back image (`/images/mtg-card-back.jpg`, `CARD_BACK` constant) is the generic card back shown for face-down library cards. This is completely unrelated to two-faced cards' back face. Don't confuse "card back" (library stack display) with "back face" (second face of a two-faced card).

### Deck Selection Search
The text filter on the deck selection page (`deck-selection.js`) is a UI filter for finding decks, not cards. Unrelated to two-faced card display or data.
