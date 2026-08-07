# Library Search Interactions

How library search connects to other parts of the app.

## Depends On

### Card Repository & Persistence
- Game route needs `persistStatePort.retrieve(gameId)` to load game state
- Prep route needs `persistPrepPort.retrievePrep(prepId)` to load prep
- Game route reconstructs `GameState` via `GameState.fromPersistedGameState(persisted, cardRepository)` — since JES-127 this also mints `cardInstanceId` on load for old saves (optional field, no version bump, signature unchanged). Harmless to library search: reads that never save just re-mint until some action persists.
- Card data must include `cardTypes: string[]` (union of all faces' types) and optionally `colorIdentity`

### GameState Model
- `game.listLibrary()` - provides the cards to display
- `game.getStateVersion()` - used for optimistic concurrency on card modal links
- Library cards know their `gameCardIndex` for linking to card modals. (`gameCardIndex` stays the internal modal-link key; the table-facing `cardInstanceId` (JES-127) is a separate, boundary-crossing identity — never swap one for the other.)

### Prep View Helpers
- `createPrepViewHelpers(prep).libraryCards` - provides cards for prep page

### Modal System
- Uses `#modal-container` target (shared with table modal, history modal, debug modal)
- Uses `#card-modal-container` for overlaid card detail modals
- Close via `/close-modal` route or Escape key / overlay click
- Modal CSS classes: `.modal-overlay`, `.modal-dialog`, `.modal-header`, `.modal-body`

### Card Type Icons
- SVG files in `public/icons/card-types/`
- CSS mask technique in `public/playmat.css`
- Mana color CSS custom properties (`--mana-W`, `--mana-U`, etc.)

## Depended On By

### Card Modal (from Library) - Critical Coupling
- Clicking a card name in the library modal opens a card detail modal
- Card modal URL template: `/card-modal/:gameId/{cardIndex}` or `/prep-card-modal/:prepId/{cardIndex}`
- Card modal overlays on top of library modal (uses separate `#card-modal-container`)
- **On the game page, the card modal provides actions (e.g. "draw") so library search + card modal together form the complete "search your library and pick a card" flow.** Library search is the browse step; card modal is the act step.
- On the prep page, the card modal is view-only (no game actions available)

### URL Query Parameter System
- `public/modal-query-params.js` auto-opens library modal on page load
- Used for testing: direct URLs to specific modal states
- Documented in `apps/shuffler/notes/pages-and-modals.md`

## Interaction Points to Watch

When making changes elsewhere, consider these interactions:

### CardDefinition Changes
If `CardDefinition` fields change (especially `cardTypes`, `colorIdentity`), the library search template mapping in `src/app.ts` needs updating (game ~523-528 and prep ~825-830). Note: `cardTypes` is the pre-unioned set of all faces'/parts' types (there is no separate `backFace`); the merge that used to happen here was removed once adapters started unioning at ingestion (commit `f76b49c`).

### New Card Locations
If new card locations are added (beyond Library, Hand, Table, Revealed), `listLibrary()` filtering still works since it checks `location.type === "Library"`.

### Modal System Changes
Library search uses the shared modal pattern. Changes to modal overlay behavior, close mechanism, or container IDs affect this feature.

Other co-tenants of `#modal-container` / `/close-modal` (same pattern, not part of library search): the table/history/debug modals. Changes to the shared modal classes or `/close-modal` affect all of them.

The game-screen **hamburger menu** (`src/view/play-game/game-menu.ts`, `#game-menu-panel`) now hosts the Action History and debug "State" modal triggers (still targeting the shared `#modal-container`, same pattern). Its dropdown panel uses `z-index: 500`, deliberately below `.modal-overlay` (1000) and `.card-modal-overlay` (2000), so the library modal and overlaid card modal render on top of the menu. If you change library-modal z-index, keep it above the menu panel. (The Search button itself stayed in the library section, not the menu.)

### Deck Data Sources
New deck adapters (beyond MTGJSON, Archidekt, local files) must ensure `cardTypes` is populated in `CardDefinition` (unioned across all faces) or grouping will put cards in "Other".

### Precon Deck Regeneration
When precon decks are regenerated, `cardTypes` must include every face's/part's types (the MTGJSON adapter unions them via `otherFaceIds`). Missing face types degrade grouping accuracy for multi-face cards. Regeneration requires AllIdentifiers data so the adapter can resolve other faces.

## Not Related To

### Precon Deck List Search
There's a separate "search" feature for filtering the precon deck selection list (`deck-selection.js`, commits like `77362ef`). That's a text filter on the deck selection page - completely different from library search. Don't confuse the two.

### Gatherer Search Links
Cards can link to Gatherer (`55b319e`). This is a card detail feature, not related to library browsing.
