# STRUCTURE: Commanders Are Cards

## Problem

Currently commanders are stored separately from regular cards in both `GameState` and `PersistedGameState`. This creates a dual structure where we have:
- `commanders: CardDefinition[]` - stored separately
- `gameCards: GameCard[]` - regular deck cards

This separation makes it harder to track commanders when they move between zones during gameplay (e.g., commander goes to hand, gets played to table, etc.).

## Solution

Move commanders into the regular `gameCards` array while maintaining their special status through:
1. An `isCommander: boolean` flag on each `GameCard`
2. A `CommandZone` location type for their default position
3. UI that always shows commanders in the command zone section regardless of actual location

## Structural Changes

### 1. Add isCommander flag to GameCard
**File**: `src/port-persist-state/types.ts:44`
```typescript
export interface GameCard {
  card: CardDefinition;
  location: CardLocation;
  gameCardIndex: number;
  isCommander: boolean;
}
```

### 2. Add CommandZone Location Type
**File**: `src/port-persist-state/types.ts:31`
```typescript
export interface CommandZoneLocation {
  type: "CommandZone";
  position: number;
}

export type CardLocation = LibraryLocation | HandLocation | RevealedLocation | TableLocation | CommandZoneLocation;
```

Update `printLocation()` function to handle CommandZone.

### 3. Update GameState Structure
**File**: `src/GameState.ts`

Remove:
- `commanders: CardDefinition[]` property (line 40)
- commanders parameter from constructor (line 79, 86)
- commanders from `toPersistedGameState()` (line 428)

Update `GameState.newGame()` (line 47):
```typescript
static newGame(gameId: GameId, deck: Deck) {
  // Combine all cards and sort alphabetically (maintaining existing invariant)
  const allCards = [
    ...deck.commanders.map(card => ({ card, isCommander: true })),
    ...deck.cards.map(card => ({ card, isCommander: false }))
  ].sort((a, b) => a.card.name.localeCompare(b.card.name));

  let commanderPositionCounter = 0;
  let libraryPositionCounter = 0;

  const gameCards: GameCard[] = allCards.map((item, index) => ({
    card: item.card,
    isCommander: item.isCommander,
    location: item.isCommander
      ? { type: "CommandZone", position: commanderPositionCounter++ } as CommandZoneLocation
      : { type: "Library", position: libraryPositionCounter++ } as LibraryLocation,
    gameCardIndex: index,
  }));

  // ... rest of method
}
```

**Key decisions:**
- **Maintain alphabetical ordering**: Cards remain sorted by name to preserve existing validation invariant
- **Use isCommander flag**: The `Deck` object already separates commanders from regular cards, so we use that information during construction
- **Separate location counters**: Commanders get sequential positions in CommandZone, regular cards in Library

Add new methods:
```typescript
export function isInCommandZone(gameCard: GameCard): gameCard is GameCard & { location: CommandZoneLocation } {
  return gameCard.location.type === "CommandZone";
}

public listCommandZone(): readonly (GameCard & { location: CommandZoneLocation })[] {
  return this.gameCards.filter(isInCommandZone).sort((a, b) => a.location.position - b.location.position);
}

public listCommanders(): readonly GameCard[] {
  return this.gameCards.filter(gc => gc.isCommander);
}
```

### 4. Update PersistedGameState
**File**: `src/port-persist-state/types.ts`

Remove:
- `commanders: CardDefinition[]` from interface (line 57)

Update:
- `PERSISTED_GAME_STATE_VERSION` to `4` (breaking change)

Add migration logic in `GameState.fromPersistedGameState()` to handle version 3 format.

### 5. Update View Components
**Files**:
- `src/view/deck-review/deck-review-page.ts:96`
- `src/view/deck-selection/deck-selection-page.ts:94`
- `src/view/play-game/active-game-page.ts:70`

Change from:
```typescript
formatCommanderImageHtmlFragment(game.commanders)
```

To:
```typescript
formatCommanderImageHtmlFragment(game.listCommanders().map(gc => gc.card))
```

### 6. Update Tests
**Files**: All test files that reference `.commanders`

Update expectations to:
- Look for commanders via `listCommanders()` method
- Check `isCommander` flag on game cards
- Update test generators to create game cards with `isCommander` flag

**Key test files to update**:
- `test/GameState.test.ts` (lines 32, 41-42, 51-53)
- `test/GameState-conversion-simple.test.ts` (lines 22-23, 35)
- `test/port-deck-retrieval/archidekt-deck-adapter.test.ts` (multiple lines)
- `test/generators.ts` (line 244)

### 7. Update Other References
**Files**:
- `src/scripts/download-deck.ts:31-32` - update commander display logic

## Benefits

1. **Unified data model**: All cards in one array with consistent structure
2. **Location tracking**: Can track where commanders actually are during gameplay
3. **UI consistency**: Command zone UI always shows commanders regardless of location
4. **Simplified logic**: No need to manage two separate card collections

## Migration Strategy

1. Increment `PERSISTED_GAME_STATE_VERSION` to 4
2. Add migration logic to handle version 3 saved games:
   - Convert separate `commanders` array to game cards with `isCommander: true`
   - Place them in CommandZone location
3. Existing games will be migrated on load

## Corner Cases Handled

- Commander in hand: `isCommander: true`, `location.type: "Hand"` - UI still shows in command zone
- Commander on table: `isCommander: true`, `location.type: "Table"` - UI still shows in command zone
- Commander in graveyard: `isCommander: true`, `location.type: "Graveyard"` - UI still shows in command zone