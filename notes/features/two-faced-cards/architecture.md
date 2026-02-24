# Two-Faced Cards Architecture

## Data Model

### CardFace (`src/types.ts:2-8`)
Represents the back face's data:
```
CardFace { name, types[], manaCost?, cmc, oracleText? }
```

### CardDefinition (`src/types.ts:10-23`)
Every card has:
- `twoFaced: boolean` — whether the card has two faces
- `backFace?: CardFace` — back-face data (present when `twoFaced` is true)

Front-face data lives directly on `CardDefinition` (name, types, manaCost, etc.).

### GameCard (`src/port-persist-state/types.ts:72-78`)
Runtime game state tracks:
- `currentFace: "front" | "back"` — which face is currently showing

### PersistedGameCard (`src/port-persist-state/persisted-types.ts:24-30`)
Persisted version also stores `currentFace`. On hydration, the full `CardDefinition` is loaded from the card repository, and `currentFace` comes from the persisted game card.

## Data Flow: Ingestion

### Archidekt Adapter (`src/port-deck-retrieval/archidektAdapter/ArchidektDeckToDeckAdapter.ts:84-127`)
- Checks `faces.length === 2` to determine `twoFaced`
- Front face data: tries `faces[0]` fields first, falls back to top-level oracle card fields
- Back face: constructs `CardFace` from `faces[1]`

### MTGJSON Adapter (`src/port-deck-retrieval/mtgjsonAdapter/MtgjsonDeckAdapter.ts:65-109`)
- Checks card `layout` against known two-faced layouts: `transform`, `modal_dfc`, `reversible_card`, `double_faced_token`
- Looks up back face via `otherFaceIds` → finds card with `side === "b"` in the card database
- Throws error if a two-faced card's back face can't be found (requires AllIdentifiers data)

### Card Repository Storage (`src/port-card-repository/SqliteCardRepositoryAdapter.ts`)
- `back_face` column stores JSON-serialized `CardFace` (or null)
- `two_faced` column stores 0/1 integer
- On read, `back_face` JSON is parsed back to `CardFace`

## Data Flow: Flip in Game

```
User clicks "Flip" button
  → POST /flip-card/:gameId/:gameCardIndex  (inline flip)
  → POST /flip-card-modal/:gameId/:gameCardIndex  (modal flip)
    → loadGameFromParams middleware loads GameState
    → requireValidVersion middleware checks optimistic lock
    → GameState.flipCard(gameCardIndex) toggles currentFace
    → persistStatePort.save() persists new face state
    → Response: updated HTML fragment
      - inline: formatFlippingContainer() (just the flip container)
      - modal: full card-modal partial (with image, actions, navigation)
    → HX-Trigger: "game-state-updated" refreshes game container
```

### Inline Flip (`/flip-card/`)
- Returns the `formatFlippingContainer()` HTML, which replaces the `#card-N-outer-flip-container-with-button` element
- The flip button uses `hx-swap="outerHTML"` and `hx-target` pointing at its own container
- Uses `onclick="event.stopPropagation()"` to prevent the card click (which opens the modal) from firing

### Modal Flip (`/flip-card-modal/`)
- Returns the full card modal partial, replacing `#card-modal-container` contents
- Preserves navigation context: reads `navList` from request body and passes it through to the new flip button and nav arrows
- This was a hard-won design — earlier attempts tried to flip within the modal without a full re-render, which caused the modal to close

## Data Flow: Flip on Prep Page

```
User clicks "Flip" in prep card modal
  → GET /prep-card-modal/:prepId/:cardIndex?face=back(&navList=...)
    → Reads prep from persistence
    → Uses ?face query param to determine which face to show
    → Constructs image URL with face parameter
    → Flip button links back with opposite face value
    → No state mutation — purely URL-driven
```

Key difference from game flip: prep flip is stateless. The face is a query parameter, not persisted. If the modal closes and reopens, the card shows front face again.

## View Rendering

### `formatCardContainer()` (`src/view/common/shared-components.ts:33-71`)
Branches on `gameCard.card.twoFaced`:
- **Two-faced**: wraps card in `formatFlippingContainer()` with flip animation structure
- **Single-faced**: simple `<img>` tag

### `formatFlippingContainer()` (`src/view/common/shared-components.ts:73-93`)
Builds the 3D CSS flip structure:
```
div.flip-container-with-button
  div.flip-container-outer [.card-flipped if back face showing]
    div.flip-container-inner
      img.two-sided-back  (back face image)
      img.two-sided-front (front face image)
  button.flip-button (POST to /flip-card/)
```
Both face images are always in the DOM. CSS 3D transforms with `backface-visibility: hidden` show only the current face. The `.card-flipped` class triggers a 180-degree Y rotation.

### Image URL Construction (`src/types.ts:49-54`)
`getCardImageUrl(scryfallId, format, face)` builds Scryfall CDN URLs:
```
https://cards.scryfall.io/{format}/{face}/{id[0]}/{id[1]}/{scryfallId}.{ext}
```
The `face` parameter (`"front"` or `"back"`) is part of the URL path.

## CSS Animation

Two separate CSS files define flip styles:

### `public/game.css` (lines 104-143)
- Card dimensions: 200px × 278px
- `perspective: 1000px` on outer container
- `transition: transform 0.8s` on inner container
- `transform: rotateY(180deg)` when `.card-flipped`
- `translateX(-100px)` offset for centering

### `public/prepare.css` (lines 221-276)
- Same flip mechanics but with prep-page-specific styling
- Additional `.flip-button` styling (positioned below card)
- `.flip-container-with-button` layout container

### `public/playmat.css` (line 463)
- `.modal-action-button.flip-button` — styles the flip button inside the card modal

## Type Merging for Library Search

In both game and prep library modal routes (`src/app.ts`), when mapping cards for the library search template:
```typescript
types: [...new Set([...gc.card.types, ...(gc.card.backFace?.types || [])])]
```
This merges front and back face types, deduplicating, so a transform card appears in all relevant type groups.
