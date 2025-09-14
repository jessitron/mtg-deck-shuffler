# View Module Organization Refactoring Plan

Status: planned

Waiting on: @notes/STRUCTURE-snapshot-tests.md

## Proposed New Structure - Organized by Application Flow

```
src/view/
├── common/
│   ├── html-layout.ts      # Page wrapper, head, footer, error page layout
│   └── shared-components.ts # Components used across multiple app phases
├── deck-selection/         # Phase 1: Choosing a deck
│   ├── deck-selection-page.ts
│   └── deck-list-components.ts
├── deck-review/           # Phase 2: Reviewing deck before game starts
│   ├── deck-review-page.ts
│   ├── commander-display.ts
│   └── deck-info-components.ts
└── play-game/             # Phase 3: Active gameplay
    ├── active-game-page.ts
    ├── hand-components.ts
    ├── library-components.ts
    ├── revealed-cards-components.ts
    └── game-modals.ts
```

## Implementation Plan - Following User Journey

### Phase 1: Extract Truly Common Infrastructure

1. Create `src/view/common/html-layout.ts`:

   - Move `formatHtmlHead()` (single implementation)
   - Move `formatPageWrapper()` (single implementation)
   - Move error page layout functions (these are truly common across the app)
   - Export `formatFullPage(title: string, content: string)`

#### Phase 1A: common components

1. List functions that are duplicated in multiple places right now:

(put them here)

2. Create `src/view/common/shared-components.ts`:
   - Only components that appear in multiple phases of the app
   - Basic modal wrapper (if used across phases)
   - Any truly shared UI elements

### Phase 2: Organize by Deck Selection Flow

1. Create `src/view/deck-selection/` directory:
   - Move `load-deck-view.ts` → `deck-selection-page.ts`
   - Extract deck listing components if they become complex
   - Focus on the "choose your deck" user experience

### Phase 3: Organize by Deck Review Flow

1. Create `src/view/deck-review/` directory:
   - Move `review-deck-view.ts` → `deck-review-page.ts`
   - Create `commander-display.ts` for commander-specific formatting
   - Create `deck-info-components.ts` for deck statistics and info
   - Focus on the "review your deck before playing" experience

### Phase 4: Organize by Play Game Flow

1. Create `src/view/play-game/` directory:
   - Move `active-game-view.ts` → `active-game-page.ts`
   - Create `hand-components.ts` for hand-related UI
   - Create `library-components.ts` for library interactions
   - Create `revealed-cards-components.ts` for revealed card displays
   - Create `game-modals.ts` for game-specific modal content
   - Focus on the active gameplay experience

### Phase 5: Update Imports and Clean Up

1. Update `src/app.ts` imports to use new structure
2. Remove any remaining duplication within each phase
3. Ensure naming reflects the user's mental model of the app

## Function Organization Philosophy

### By Application Phase, Not Technical Similarity

- **Deck Selection**: Everything related to choosing which deck to play
- **Deck Review**: Everything related to reviewing your deck before starting
- **Play Game**: Everything related to active gameplay
- **Common**: Only things that truly appear across multiple phases

### Duplication is OK When Logic Differs

- If deck review shows commander images differently than gameplay, keep separate functions
- If the modal behavior differs between phases, keep separate implementations
- Only consolidate when the logic truly needs to be identical

### Focus on User Mental Model

- Group functions by when they appear in the user's journey
- Name functions based on what the user is trying to accomplish
- Make the code structure mirror the application structure

## Function Naming Conventions

### Page-Level Functions (Complete Screens)

- `formatDeckSelectionPage()` - The deck selection screen
- `formatDeckReviewPage()` - The deck review screen
- `formatActiveGamePage()` - The active game screen
- `formatErrorPage()` - Error screens (in common)

### Component Functions (Within Each Phase)

- Deck Selection: `formatDeckListItem()`, `formatDeckSearchForm()`
- Deck Review: `formatCommanderDisplay()`, `formatDeckStats()`, `formatStartGameButton()`
- Play Game: `formatHandCards()`, `formatLibrarySection()`, `formatRevealedCards()`, `formatGameModal()`

## Benefits of This Structure

1. **Mirrors User Experience**: Code organization matches how users think about the app
2. **Intuitive Navigation**: Developers can find code by thinking about user flow

## Migration Strategy

1. **Phase-by-Phase**: Migrate one user flow at a time
2. **Test Each Phase**: Ensure each user flow works after migration
3. **Update Documentation**: Update CLAUDE.md to reflect user-centric organization
