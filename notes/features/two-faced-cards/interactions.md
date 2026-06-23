# Two-Faced Cards Interactions

This is the most cross-cutting feature in the app. Two-faced cards add complexity to almost every feature that touches card display, data, or persistence.

## Depends On

### Scryfall CDN
- Image URLs constructed via `getCardImageUrl()` with `face` parameter
- Both faces share the same `scryfallId`; the `face` path segment (`front`/`back`) differentiates them
- If Scryfall URL structure changes, update `getCardImageUrl()` in `src/types.ts:49-54`

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

### Being-Played Animation
- CSS animation for cards being played must target images inside the flip container's nested structure
- Fix at `e904a8c` addressed this — regression risk if card container structure changes

### Test Infrastructure
- Seed script (`src/scripts/seed-test-data.ts`) creates a game with "From Cute to Brute" precon (47 two-faced cards)
- Test generators (`test/generators.ts`) generate `cardTypes` and a `twoFaced` boolean (no `CardFace`/`backFace`)
- `nicolBolas` fixture in generators is a ready-made two-faced card for tests

## Watch Points

These are specific things that could break two-faced cards if changed elsewhere:

1. **CardDefinition changes**: `CardDefinition` is intentionally minimal — identity fields plus `twoFaced` and `cardTypes`. Don't re-add per-face card text (`manaCost`/`oracleText`/`cmc`/`backFace`); the card image is the source of truth and a future "is this hand worth keeping?" feature should read canonical data from MTGJSON/Scryfall. If you do add a field, both adapters and the SQLite cache schema must populate it.

2. **New card display contexts**: Any new place that renders a card image must handle `twoFaced === true`. Use `formatCardContainer()` rather than building card HTML directly.

3. **CSS selector depth**: The flip container has 3 levels of nesting (`flip-container-outer` → `flip-container-inner` → `img`). CSS rules targeting `.mtg-card-image` or card animations must account for this depth.

4. **Modal re-render on flip**: The modal flip route re-renders the ENTIRE modal. If the card modal template adds new data requirements, the `/flip-card-modal/` route must also provide them.

5. **HTMX swap targets**: The inline flip button targets `#card-N-outer-flip-container-with-button` with `outerHTML` swap. Changing the flip container's ID scheme or adding wrapper elements will break this.

6. **Prep flip gaining persistence**: Currently prep flip is stateless (query param). When this changes, the prep page will need a persistence mechanism for flip state, and the prep-card-modal route will need to read/write that state.

7. **New deck adapters**: Must determine `twoFaced` via `isDoubleSidedLayout(layout)` (from `twoFacedLayouts.ts`) and set `cardTypes` to the union of ALL faces'/parts' types. Do NOT infer two-faced from "two faces in the data" — split/adventure/prepare cards have two faces but one image (so `twoFaced=false`) yet still contribute both parts' types to `cardTypes`.

8. **Precon deck regeneration**: When regenerating precon decks, AllIdentifiers data must be available for MTGJSON adapter to look up back faces. Without it, the adapter throws an error. AllIdentifiers.json now exceeds Node's max string length, so `fetch-mtgjson-precons.ts` stream-parses it with `stream-json` (commit `5b3e5b5`) rather than `fs.readFile` + `JSON.parse`. If you touch `loadCardDatabase()`, keep it streaming — a whole-file read will throw `RangeError: Invalid string length`.

9. **Game state version**: `currentFace` is persisted. If the persisted game state version changes, migration code must preserve or default `currentFace`.

10. **Single-image multi-face layouts** (`prepare`, `adventure`, `split`, `aftermath`, `flip`): These are deliberately NOT two-faced (no flip button) but DO contribute all their parts' types to `cardTypes`, so they appear under every relevant group in library search (e.g. a Prepared creature shows under both Creature and Sorcery). If a future feature needs both halves shown as images, that's a display feature, not a flip — don't reach for `twoFaced`.

11. **Stale cached deck files**: `twoFaced`/`cardTypes` are baked into `decks/*.json` at download time. Changing adapter logic does NOT retroactively fix already-downloaded decks — they keep their old values until re-downloaded (`npm run deck:download -- <id>` for Archidekt, `npm run precons:fetch-mtgjson -- --convert` for MTGJSON). The deck-file format is version-gated (`PERSISTED_DECK_VERSION`, currently 3); `LocalFileAdapter` rejects mismatched files, so a format change means regenerating all decks.

## Not Related To

### Card Back (library face-down)
The MTG card back image (`/images/mtg-card-back.jpg`, `CARD_BACK` constant) is the generic card back shown for face-down library cards. This is completely unrelated to two-faced cards' back face. Don't confuse "card back" (library stack display) with "back face" (second face of a two-faced card).

### Deck Selection Search
The text filter on the deck selection page (`deck-selection.js`) is a UI filter for finding decks, not cards. Unrelated to two-faced card display or data.
