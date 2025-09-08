# Golden Master Testing for HTML Formatting

## Overview

Golden master testing (also known as snapshot testing) will capture the current HTML output of our view formatting functions and detect any unintended changes during refactoring. This is especially valuable for ensuring UI consistency while allowing us to safely refactor the HTML generation logic.

## Current HTML Formatting Structure

The application has three main view modules in `src/view/`:

### 1. `load-deck-view.ts`

- **Primary exports**: `formatChooseDeckHtml()`, `formatDeckHtml()`
- **Key functions to test**:
  - `formatChooseDeckHtml()` - Initial deck selection screen
  - `formatDeckHtml()` - Deck review after loading from Archidekt
- **Dependencies**: Takes `AvailableDecks` and `Deck` objects
- **Environment variables**: Uses `process.env.HONEYCOMB_INGEST_API_KEY` in head

### 1a. `error-view.ts`

- **Primary exports**: `formatErrorPage()`
- **Key functions to test**:
  - `formatErrorPage()` - General error page formatter for all error scenarios
- **Dependencies**: Takes `ErrorPageOptions` with icon, title, message, and optional details
- **Environment variables**: Uses `process.env.HONEYCOMB_INGEST_API_KEY` in head

### 2. `review-deck-view.ts`

- **Primary exports**: `formatGamePageHtml()`, `formatLibraryModalHtml()`, `formatDeckReviewHtml()`
- **Key functions to test**:
  - `formatGamePageHtml()` - Full page wrapper for game state
  - `formatLibraryModalHtml()` - Modal showing library contents
  - `formatDeckReviewHtml()` - Game setup screen before shuffling
- **Dependencies**: Takes `GameState` objects with different game statuses
- **Dynamic content**: Card counts, game IDs, library contents

### 3. `active-game-view.ts`

- **Primary exports**: Multiple specialized formatting functions for active game UI
- **Key functions to test**: (functions that generate complete HTML sections)
  - Functions for rendering different game zones (hand, battlefield, library, etc.)
  - Card action buttons and modals
  - Game state transitions
- **Dependencies**: Takes `GameState` objects and `GameCard` arrays
- **Complex state**: Different card locations, game phases, user interactions

## Golden Master Testing Strategy

### Test Structure

```
test/
├── snapshots/           # Generated snapshot files
│   ├── load-deck-view/
│   ├── review-deck-view/
│   └── active-game-view/
└── view-snapshots.test.ts
```

### Implementation Approach

1. **Test Framework**: Use Node.js built-in test runner (already in use)
2. **Snapshot Storage**: Store snapshots as `.html` files for easy diff viewing
3. **Test Data**: Create realistic but deterministic test fixtures
4. **Environment Isolation**: Mock environment variables and dates for consistency

### Test Coverage Plan

#### Phase 1: Load Deck Views (`src/view/load-deck-view.ts`)

**`formatChooseDeckHtml(availableDecks: AvailableDecks)`**
- Empty array `[]` → Only Archidekt input shown
- Single local deck `[{localFile: "deck1.json", description: "Test Deck", deckSource: "local"}]`
- Multiple local decks with varied descriptions
- Mixed archidekt/local sources (edge case)

**`formatDeckHtml(deck: Deck)`**
- Commander deck with 1 commander, 99 cards, Archidekt provenance
- Commander deck with 2 commanders (partner commanders)  
- Regular 60-card deck with no commanders
- Deck with very long name (>50 chars)
- Deck with special characters in name

#### Phase 1b: Error Views (`src/view/error-view.ts`)

**`formatErrorPage(options: ErrorPageOptions)`**
- Game not found: `{icon: "🎯", title: "Game Not Found", message: "Game 123 could not be found", details: "..."}`
- Deck load error: `{icon: "🚫", title: "Deck Load Error", message: "Could not fetch deck...", details: null}`
- Generic error with all fields populated
- Error with minimal fields (no details)

#### Phase 2: Review Deck Views (`src/view/review-deck-view.ts`)

**`formatGamePageHtml(game: GameState)`**
- GameStatus.NotStarted, 0 commanders, 60 cards in library
- GameStatus.NotStarted, 1 commander, 99 cards in library  
- GameStatus.NotStarted, 2 commanders, 99 cards in library

**`formatDeckReviewHtml(game: GameState)`** 
- GameStatus.NotStarted, gameId: 12345, empty hand, full library (99 cards)
- GameStatus.NotStarted, gameId: 67890, empty hand, small library (40 cards)

**`formatLibraryModalHtml(game: GameState)`**
- Library with 3 cards (minimal case)
- Library with 99 cards (full Commander deck)
- Library with 20 cards (mid-game scenario)

#### Phase 3: Active Game Views (`src/view/active-game-view.ts`)

**`formatGamePageHtml(game: GameState, whatHappened: WhatHappened)`**
- GameStatus.Active, empty whatHappened `{}`
- GameStatus.Active, card drawn: `{cardDrawn: {card: {...}, fromLocation: "Library"}}`
- GameStatus.Active, card played: `{cardPlayed: {card: {...}, toLocation: "Table"}}`

**`formatActiveGameHtml(game: GameState, whatHappened: WhatHappened)`**
- Empty hand (0 cards), empty table (0 cards), full library (99 cards)
- Full hand (7 cards), empty table, reduced library (92 cards)
- Mixed state: 3 cards in hand, 5 cards on table, 84 cards in library
- Cards revealed: 2 cards in revealed zone

**`formatGameHtml(game: GameState, whatHappened: WhatHappened)`**
- Fresh active game with default whatHappened
- Game with recent card movement (whatHappened populated)

**`formatTableModalHtml(game: GameState)`**
- Empty table (no cards played)
- Table with 1 card 
- Table with 10+ cards (stress test layout)

### Test Data Requirements

#### Specific Mock Objects Needed:

**1. AvailableDecks Arrays:**
```typescript
const emptyDecks: AvailableDecks = [];
const singleLocalDeck: AvailableDecks = [
  {localFile: "test-deck.json", description: "Kaalia Angels", deckSource: "local"}
];
const multipleLocalDecks: AvailableDecks = [
  {localFile: "deck1.json", description: "Kaalia Angels", deckSource: "local"},
  {localFile: "deck2.json", description: "Ygra Lifegain", deckSource: "local"},
  {localFile: "deck3.json", description: "Mono-Red Burn", deckSource: "local"}
];
```

**2. Deck Objects:**
```typescript
const commanderDeckSingle: Deck = {
  id: "123456",
  name: "Kaalia of the Vast Angel Tribal", 
  totalCards: 100,
  commanders: [{name: "Kaalia of the Vast", scryfallId: "abc123", multiverseid: 12345}],
  provenance: {retrievedDate: new Date("2024-01-15T10:30:00Z"), sourceUrl: "https://archidekt.com/decks/123456", deckSource: "archidekt"}
};

const commanderDeckPartners: Deck = {
  id: "789012", 
  name: "Tevesh & Kodama Partners",
  totalCards: 100,
  commanders: [
    {name: "Tevesh Szat, Doom of Fools", scryfallId: "def456", multiverseid: 67890},
    {name: "Kodama of the East Tree", scryfallId: "ghi789", multiverseid: 11111}
  ],
  provenance: {retrievedDate: new Date("2024-01-15T10:30:00Z"), sourceUrl: "https://archidekt.com/decks/789012", deckSource: "archidekt"}
};

const regularDeck: Deck = {
  id: "345678",
  name: "Mono Red Burn",
  totalCards: 60, 
  commanders: [],
  provenance: {retrievedDate: new Date("2024-01-15T10:30:00Z"), sourceUrl: "https://archidekt.com/decks/345678", deckSource: "archidekt"}
};
```

**3. GameState Objects:**
```typescript
const gameNotStartedCommander: GameState = {
  gameId: 12345,
  status: GameStatus.NotStarted,
  deckName: "Kaalia of the Vast Angel Tribal",
  totalCards: 100,
  commanders: [{name: "Kaalia of the Vast", scryfallId: "abc123", multiverseid: 12345}],
  deckProvenance: {...},
  cards: [/* 99 cards in library positions 0-98 */]
};

const gameActiveWithHand: GameState = {
  gameId: 67890, 
  status: GameStatus.Active,
  deckName: "Tevesh & Kodama Partners",
  totalCards: 100,
  commanders: [/* 2 partner commanders */],
  deckProvenance: {...},
  cards: [
    /* 7 cards with HandLocation {type: "Hand", position: 0-6} */,
    /* 92 cards with LibraryLocation {type: "Library", position: 0-91} */
  ]
};
```

**4. WhatHappened Objects:**
```typescript
const emptyWhatHappened: WhatHappened = {};
const cardDrawnEvent: WhatHappened = {
  cardDrawn: {
    card: {name: "Lightning Bolt", scryfallId: "xyz789", multiverseid: 22222},
    fromLocation: {type: "Library", position: 0}
  }
};
const cardPlayedEvent: WhatHappened = {
  cardPlayed: {
    card: {name: "Sol Ring", scryfallId: "abc999", multiverseid: 33333},
    toLocation: {type: "Table"}
  }
};
```

**5. ErrorPageOptions Objects:**
```typescript
const gameNotFoundError: ErrorPageOptions = {
  icon: "🎯",
  title: "Game Not Found", 
  message: "Game 123 could not be found.",
  details: "It may have expired or the ID might be incorrect."
};
const deckLoadError: ErrorPageOptions = {
  icon: "🚫",
  title: "Deck Load Error",
  message: "Could not fetch deck 456789 from archidekt.",
  details: null
};
```

**6. Environment Variables:**
- Mock `process.env.HONEYCOMB_INGEST_API_KEY = "hny_test_key_123"`
- Mock `process.env.HONEYCOMB_API_KEY = "hny_test_key_456"` (fallback)

**7. Date/Time Handling:**
- Mock all `Date` constructors to return `new Date("2024-01-15T10:30:00Z")`
- Use fixed `retrievedDate` in all DeckProvenance objects
- Ensure consistent `.toLocaleString()` output across environments

### Snapshot Management

#### File Organization:

```
test/snapshots/
├── load-deck-view/
│   ├── formatChooseDeckHtml-empty.html                 # formatChooseDeckHtml([])
│   ├── formatChooseDeckHtml-single-local.html          # formatChooseDeckHtml(singleLocalDeck)
│   ├── formatChooseDeckHtml-multiple-locals.html       # formatChooseDeckHtml(multipleLocalDecks)
│   ├── formatDeckHtml-commander-single.html            # formatDeckHtml(commanderDeckSingle)
│   ├── formatDeckHtml-commander-partners.html          # formatDeckHtml(commanderDeckPartners)
│   ├── formatDeckHtml-regular-deck.html                # formatDeckHtml(regularDeck)
│   └── formatDeckHtml-long-name.html                   # formatDeckHtml(deckWithLongName)
├── error-view/
│   ├── formatErrorPage-game-not-found.html             # formatErrorPage(gameNotFoundError)
│   ├── formatErrorPage-deck-load-error.html            # formatErrorPage(deckLoadError)
│   └── formatErrorPage-minimal.html                    # formatErrorPage(minimalError)
├── review-deck-view/
│   ├── formatGamePageHtml-not-started-no-commander.html    # formatGamePageHtml(gameNotStartedRegular)
│   ├── formatGamePageHtml-not-started-one-commander.html   # formatGamePageHtml(gameNotStartedCommander)
│   ├── formatGamePageHtml-not-started-two-commanders.html  # formatGamePageHtml(gameNotStartedPartners)
│   ├── formatDeckReviewHtml-full-library.html              # formatDeckReviewHtml(gameWithFullLibrary)
│   ├── formatDeckReviewHtml-small-library.html             # formatDeckReviewHtml(gameWithSmallLibrary)
│   ├── formatLibraryModalHtml-minimal.html                 # formatLibraryModalHtml(gameWith3Cards)
│   ├── formatLibraryModalHtml-full.html                    # formatLibraryModalHtml(gameWith99Cards)
│   └── formatLibraryModalHtml-midgame.html                 # formatLibraryModalHtml(gameWith20Cards)
└── active-game-view/
    ├── formatGamePageHtml-active-empty-event.html          # formatGamePageHtml(gameActive, {})
    ├── formatGamePageHtml-active-card-drawn.html           # formatGamePageHtml(gameActive, cardDrawnEvent)
    ├── formatGamePageHtml-active-card-played.html          # formatGamePageHtml(gameActive, cardPlayedEvent)
    ├── formatActiveGameHtml-empty-zones.html               # formatActiveGameHtml(gameActiveEmptyZones, {})
    ├── formatActiveGameHtml-full-hand.html                 # formatActiveGameHtml(gameActiveFullHand, {})
    ├── formatActiveGameHtml-mixed-state.html               # formatActiveGameHtml(gameActiveMixedState, {})
    ├── formatActiveGameHtml-revealed-cards.html            # formatActiveGameHtml(gameActiveRevealed, {})
    ├── formatGameHtml-fresh-game.html                      # formatGameHtml(freshActiveGame, {})
    ├── formatGameHtml-recent-movement.html                 # formatGameHtml(activeGame, cardMovementEvent)
    ├── formatTableModalHtml-empty.html                     # formatTableModalHtml(gameEmptyTable)
    ├── formatTableModalHtml-single-card.html               # formatTableModalHtml(gameSingleCardTable)
    └── formatTableModalHtml-many-cards.html                # formatTableModalHtml(gameManyCardsTable)
```

#### Snapshot Update Workflow:

1. Run tests normally to detect changes
2. When HTML formatting changes intentionally, update snapshots
3. Use `--update-snapshots` flag pattern for snapshot regeneration
4. Git diff snapshots to review changes before committing

### Benefits

1. **Regression Detection**: Catch unintended HTML changes during refactoring
2. **Visual Review**: Easy to see exactly what changed in the UI
3. **Documentation**: Snapshots serve as living examples of expected output
4. **Confidence**: Safe to refactor view logic knowing output is validated
5. **Integration**: Works with existing Node.js test infrastructure

### Implementation Steps

1. Create test fixtures for all required mock objects
2. Set up snapshot comparison utilities
3. Write tests for load-deck-view functions first (simpler dependencies)
4. Add review-deck-view tests (moderate complexity)
5. Implement active-game-view tests (most complex)
6. Create npm script for snapshot updating
7. Document snapshot update process in README

### Considerations

- **Environment Variables**: Mock all environment-dependent values
- **Non-Deterministic Content**: Mock dates, IDs, and random values
- **Large Snapshots**: Consider splitting very large HTML outputs
- **Maintenance**: Plan for periodic snapshot review and cleanup
- **CI Integration**: Ensure tests fail appropriately in CI when snapshots differ

This approach will provide comprehensive coverage of our HTML formatting while maintaining development velocity and ensuring UI consistency.
