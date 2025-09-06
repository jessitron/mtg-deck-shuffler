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

#### Phase 1: Core Page Templates

- `formatChooseDeckHtml()` with various deck availability scenarios
- `formatDeckHtml()` with different deck types (Commander vs regular)
- Error pages (`formatErrorPage()` with different error scenarios)
- Full page wrappers with consistent head sections

#### Phase 2: Game State Views

- `formatDeckReviewHtml()` for pre-game state
- `formatLibraryModalHtml()` with different library sizes
- Game header components with various commander configurations

#### Phase 3: Dynamic Game Content

- Active game views with cards in different locations
- Modal dialogs for various game actions
- Card action buttons for different game states
- Animation and interaction triggers

### Test Data Requirements

#### Fake Objects Needed:

1. **AvailableDecks**: Array with both Archidekt and local deck options
2. **Deck**: Complete deck with commanders, cards, provenance
3. **GameState**: Various game statuses (NotStarted, Active, etc.)
4. **GameCard**: Cards in different locations (library, hand, battlefield)
5. **Environment Variables**: Consistent Honeycomb API keys for testing

#### Date/Time Handling:

- Mock `Date` objects for consistent timestamps
- Use fixed dates like `2024-01-15T10:30:00Z` for reproducible output

### Snapshot Management

#### File Organization:

```
test/snapshots/
├── choose-deck-empty.html          # No available decks
├── choose-deck-with-locals.html    # Local decks available
├── deck-commander.html             # Commander deck review
├── deck-regular.html               # Regular deck review
├── game-not-started.html           # Pre-shuffle game state
├── game-active-empty-hand.html     # Active game, no cards in hand
├── library-modal-small.html        # Library with few cards
└── library-modal-large.html        # Library with many cards
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
