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
  - Maps GameCards to simple objects: { name, gameCardIndex, cardTypes, colorIdentity }
  - cardTypes comes straight from gc.card.cardTypes (already unioned across all faces at ingestion)
  - Reads `?order=alphabetical|position` (default alphabetical). Sorts the mapped
    cards alphabetically by name for display only when order === "alphabetical" —
    never touches listLibrary()'s position order either way. Both routes (game and
    prep) read the same param and default the same way.
  - Passes groupBy and order query params through
  |
  v
EJS template renders (views/partials/library-modal.ejs)
  - If groupBy=type: groups cards into Map by type, sorts groups, renders with headers
  - If ungrouped: renders flat list, in whatever order the route sent (alphabetical or
    position)
  - Renders "A-Z"/"Position" order-toggle buttons and the existing Group by Type toggle
    in the modal subtitle; each toggle URL preserves the other's current state
  - Each card name is clickable (HTMX GET to card modal)
  - Type icons rendered as CSS-masked SVG sprites
  |
  v
HTML fragment inserted into #modal-container
```

## Routes

### Game Library Modal

**Route**: `GET /library-modal/:gameId`
**File**: `src/app.ts` (`app.get("/library-modal/:gameId", ...)`)
**Query params**: `?groupBy=type`, `?order=alphabetical|position` (default alphabetical), `?expected-version=N`

Retrieves `PersistedGameState` from persistence, reconstructs `GameState` via `GameState.fromPersistedGameState()`, gets library cards via `game.listLibrary()`.

### Prep Library Modal

**Route**: `GET /prep-library-modal/:prepId`
**File**: `src/app.ts` (`app.get("/prep-library-modal/:prepId", ...)`)
**Query params**: `?groupBy=type`, `?order=alphabetical|position` (default alphabetical)

Retrieves `PersistedGamePrep` from prep persistence, gets library cards via `createPrepViewHelpers(prep).libraryCards`. No expected-version needed since preps are immutable.

Note: exact line numbers in `src/app.ts` shift often (other routes are interleaved between
the two library-modal handlers); search for the route strings above rather than trusting
a cached line number.

### Close Modal

**Route**: `GET /close-modal`
Returns empty string, clearing `#modal-container`.

## Template

**File**: `views/partials/library-modal.ejs`

Single template shared by both routes. Parameters:

| Parameter | Type | Description |
|-----------|------|-------------|
| `cards` | `Array<{name, gameCardIndex, cardTypes, colorIdentity}>` | Cards to display, already in the order the route chose |
| `cardModalUrlTemplate` | `string` | URL template with `{cardIndex}` placeholder |
| `groupBy` | `string \| undefined` | `"type"` for grouped view |
| `order` | `"alphabetical" \| "position"` | Display order; route defaults it to `"alphabetical"` when the query param is absent or not `"position"` |
| `gameId` | `number \| undefined` | Game ID (for toggle URL) |
| `prepId` | `number \| undefined` | Prep ID (for toggle URL) |
| `expectedVersion` | `number \| undefined` | Version for optimistic concurrency |

### Grouping Logic (in-template)

When `groupBy === "type"`:
1. Cards grouped into a `Map<string, Card[]>` by type
2. Cards with multiple types appear in multiple groups
3. Cards with no types go to "Other" group
4. Groups sorted: known types first (Creature, Planeswalker, Instant, Sorcery, Enchantment, Artifact, Battle, Land), then alphabetically

### Order Toggle (in-template)

Two buttons in the modal subtitle, `#library-order-alphabetical` and `#library-order-position`,
alongside the existing `#library-group-by-type-toggle`. Each is an HTMX link built from
`buildModalUrl(nextGroupBy, nextOrder)`, which carries forward whichever of `groupBy`/`order`
isn't being changed — so switching order preserves the current grouping, and vice versa.
The active button gets an `active` class (`isPositionOrder ? ...` for Position,
`!isPositionOrder ? ...` for A-Z) styled the same way as the Group by Type toggle's active state.
`order=alphabetical` is the implicit default: `buildModalUrl` only appends `order=position` to
the URL, never `order=alphabetical`, keeping default-state URLs clean.

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

`public/modal-query-params.js` handles `?openLibrary=true`, `?openLibrary=true&groupBy=type`, and now `?openLibrary=true&order=position` (any combination of `groupBy`/`order`) on page load, either clicking the search button or making a direct HTMX ajax call (needed whenever `groupBy` or `order` is present, same pattern for both params, for both game and prep pages).

## Focus Management

The library modal's `.modal-overlay` carries static `role="dialog" aria-modal="true"`
alongside its existing `tabindex="0"`. Focus-in-on-open, Tab-trapping,
background-`inert`, and focus-restore-on-close are all handled by the generic
`public/modal-focus.js` (see interactions.md) — the template itself has no focus
logic beyond those static attributes.

## Card Modal Navigation (navList)

When the library is displayed grouped by type, each type section builds a `navList` query parameter — a comma-separated list of card indices in that section. This is appended to card modal URLs so that prev/next navigation stays within the type group.

**Helper**: `src/navList.ts` — `resolveNavListNavigation()` parses the navList and returns prev/next indices, position, and total count. `navListQueryParam()` builds the query string fragment.

**Flow**: Library modal (grouped) → card modal URL includes `&navList=12,45,7,...` → card modal route checks for navList before falling back to zone-order navigation → prev/next URLs preserve navList.

**Fallback**: Without navList (ungrouped view, other entry points), navigation uses the existing zone-order logic (`findPrevCardInZone`/`findNextCardInZone`).

**Flip support**: Both flip routes preserve navList. The game flip-card-modal POST route reads navList from the request body. The prep card modal flip (GET with `?face=back`) passes navList as a query parameter.

## GameState Integration

`GameState.listLibrary()` (src/GameState.ts):
- Filters cards where `location.type === "Library"`
- Sorts by `location.position` (0 = top of library)
- Returns read-only array of `GameCard & { location: LibraryLocation }`
- **Not sorted by name.** This return value is load-bearing for draw / Put on Top /
  Put on Bottom, which all depend on `location.position`. Both library-modal routes
  (game and prep) sort their own copy of the mapped cards by name for display, unless
  `order=position` was requested, in which case the mapped copy is left in
  `listLibrary()`'s own position order; never change `listLibrary()` itself to sort by
  name.
