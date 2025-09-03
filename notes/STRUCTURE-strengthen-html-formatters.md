# HTML Formatters Refactoring Recommendations

## Current Issues

The `src/html-formatters.ts` file contains significant duplication and large HTML segments that make it difficult to maintain and extend.

## Key Areas of Duplication

### 1. Commander Image Rendering
- Lines 44-48, 167-172, 217-222: Nearly identical commander image HTML generation
- **Recommendation**: Extract to `formatCommanderImageHtml(commanders: Commander[])`

### 2. Modal Structure
- Lines 140-163 (`formatLibraryModalHtml`) and 431-454 (`formatTableModalHtml`): Same modal wrapper
- **Recommendation**: Extract to `formatModalHtml(title: string, bodyContent: string)`

### 3. Card Action Buttons
- Lines 121-135 (library modal), 250-279 (revealed cards), 318-335 (hand cards): Similar button patterns
- **Recommendation**: Create button factory functions:
  - `formatCardActionButton(action: string, endpoint: string, gameId: string, cardIndex: string, title: string)`
  - `formatCardActionsGroup(actions: CardAction[], gameId: string, cardIndex: string)`

### 4. Card Container Templates
- Lines 244-280 (revealed cards) and 313-337 (hand cards): Similar card container structure
- **Recommendation**: Extract to `formatCardContainer(gameCard: GameCard, containerType: 'revealed' | 'hand', actions: CardAction[])`

### 5. Game Details Section
- Lines 181-185 and 350-355: Identical game details rendering
- **Recommendation**: Extract to `formatGameDetailsHtml(game: GameState)`

## Large HTML Segments to Break Down

### 1. `formatActiveGameHtml` (Lines 216-408)
**Current size**: 193 lines
**Break into**:
- `formatGameHeaderHtml(game: GameState)` - command zone + game details
- `formatLibrarySectionHtml(game: GameState, whatHappened: WhatHappened)` - library stack + buttons
- `formatRevealedCardsHtml(game: GameState, whatHappened: WhatHappened)` - revealed cards section
- `formatHandSectionHtml(game: GameState, whatHappened: WhatHappened)` - hand cards section
- `formatGameActionsHtml(game: GameState)` - end game buttons

### 2. `formatGamePageHtml` (Lines 75-105)
**Break into**:
- `formatHtmlHead(title: string)` - head section with scripts and styles
- `formatPageWrapper(title: string, content: string)` - full page structure

### 3. Card List Rendering in Modals
- Lines 111-138 (`formatLibraryModalHtml`) and 414-429 (`formatTableModalHtml`): Similar list item generation
- **Recommendation**: Extract to `formatCardListItems(cards: GameCard[], cardType: 'library' | 'table', gameId: string)`

## Proposed New Structure

```typescript
// Core building blocks
function formatCommanderImageHtml(commanders: Commander[]): string
function formatGameDetailsHtml(game: GameState): string
function formatModalHtml(title: string, bodyContent: string): string

// Button factories
function formatCardActionButton(action: string, endpoint: string, gameId: string, cardIndex: string, title: string): string
function formatCardActionsGroup(actions: CardAction[], gameId: string, cardIndex: string): string

// Card containers
function formatCardContainer(gameCard: GameCard, containerType: 'revealed' | 'hand', actions: CardAction[], animationClass?: string): string
function formatCardListItems(cards: GameCard[], cardType: 'library' | 'table', gameId: string): string

// Game sections
function formatGameHeaderHtml(game: GameState): string
function formatLibrarySectionHtml(game: GameState, whatHappened: WhatHappened): string
function formatRevealedCardsHtml(game: GameState, whatHappened: WhatHappened): string
function formatHandSectionHtml(game: GameState, whatHappened: WhatHappened): string
function formatGameActionsHtml(game: GameState): string

// Page structure
function formatHtmlHead(title: string): string
function formatPageWrapper(title: string, content: string): string
```

## Benefits

1. **Reduced Duplication**: Single source of truth for repeated HTML patterns
2. **Better Maintainability**: Changes to button styles or modal structure only need to be made in one place
3. **Improved Testability**: Smaller functions are easier to test in isolation
4. **Enhanced Readability**: Main formatter functions become high-level composition functions
5. **Easier Extension**: Adding new card actions or modal types becomes straightforward

## Implementation Priority

1. **High**: Commander image rendering (used in 3 places)
2. **High**: Modal structure (used in 2 places with potential for more)
3. **Medium**: Card action buttons (complex but localized impact)
4. **Medium**: Game details section (simple extraction)
5. **Low**: Breaking down large functions (improves structure but doesn't reduce duplication)