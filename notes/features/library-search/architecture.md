# Library Search Architecture

## Data Flow

```
User clicks "Search" button
  |
  v
HTMX GET /library-modal/:gameId  (or /prep-library-modal/:prepId)
  |
  v
Route handler (src/app.ts)
  - Retrieves persisted game/prep state
  - For games: reconstructs GameState, calls game.listLibrary()
  - For preps: uses createPrepViewHelpers(prep).libraryCards
  - Maps GameCards to simple objects: { name, gameCardIndex, types, colorIdentity }
  - Merges back-face types: [...new Set([...card.types, ...card.backFace?.types || []])]
  - Passes groupBy query param through
  |
  v
EJS template renders (views/partials/library-modal.ejs)
  - If groupBy=type: groups cards into Map by type, sorts groups, renders with headers
  - If ungrouped: renders flat list in library order
  - Each card name is clickable (HTMX GET to card modal)
  - Type icons rendered as CSS-masked SVG sprites
  |
  v
HTML fragment inserted into #modal-container
```

## Routes

### Game Library Modal

**Route**: `GET /library-modal/:gameId`
**File**: `src/app.ts` lines 501-541
**Query params**: `?groupBy=type`, `?expected-version=N`

Retrieves `PersistedGameState` from persistence, reconstructs `GameState` via `GameState.fromPersistedGameState()`, gets library cards via `game.listLibrary()`.

### Prep Library Modal

**Route**: `GET /prep-library-modal/:prepId`
**File**: `src/app.ts` lines 780-819
**Query params**: `?groupBy=type`

Retrieves `PersistedGamePrep` from prep persistence, gets library cards via `createPrepViewHelpers(prep).libraryCards`. No expected-version needed since preps are immutable.

### Close Modal

**Route**: `GET /close-modal`
Returns empty string, clearing `#modal-container`.

## Template

**File**: `views/partials/library-modal.ejs`

Single template shared by both routes. Parameters:

| Parameter | Type | Description |
|-----------|------|-------------|
| `cards` | `Array<{name, gameCardIndex, types, colorIdentity}>` | Cards to display |
| `cardModalUrlTemplate` | `string` | URL template with `{cardIndex}` placeholder |
| `groupBy` | `string \| undefined` | `"type"` for grouped view |
| `gameId` | `number \| undefined` | Game ID (for toggle URL) |
| `prepId` | `number \| undefined` | Prep ID (for toggle URL) |
| `expectedVersion` | `number \| undefined` | Version for optimistic concurrency |

### Grouping Logic (in-template)

When `groupBy === "type"`:
1. Cards grouped into a `Map<string, Card[]>` by type
2. Cards with multiple types appear in multiple groups
3. Cards with no types go to "Other" group
4. Groups sorted: known types first (Creature, Planeswalker, Instant, Sorcery, Enchantment, Artifact, Battle, Land), then alphabetically

### Type Icons

Rendered via CSS mask technique (not `<img>` tags). Icon files in `public/icons/card-types/`.
Land icons are colored by the card's `colorIdentity` - single color gets solid fill, multicolor gets gradient.

## UI Entry Points

### Game Page (`/game/:gameId`)

Button in `src/view/play-game/library-components.ts` line 20-23:
```html
<button class="search-button"
        hx-get="/library-modal/${game.gameId}"
        hx-target="#modal-container"
        hx-swap="innerHTML">Search</button>
```

### Prep Page (`/prepare/:prepId`)

Button in `views/prepare.ejs` line 22-25:
```html
<button class="search-button"
        hx-get="/prep-library-modal/<%= prep.prepId %>"
        hx-target="#modal-container"
        hx-swap="innerHTML">Search</button>
```

## Auto-Open via URL

`public/modal-query-params.js` handles `?openLibrary=true` and `?openLibrary=true&groupBy=type` on page load, either clicking the search button or making a direct HTMX ajax call (for grouped view).

## GameState Integration

`GameState.listLibrary()` (src/GameState.ts):
- Filters cards where `location.type === "Library"`
- Sorts by `location.position` (0 = top of library)
- Returns read-only array of `GameCard & { location: LibraryLocation }`
