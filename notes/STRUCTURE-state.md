# Implement @notes/DESIGN-state.md

Status: implemented

## Implementation Plan

### Phase 0: Prepare existing types to support these changes

- the current Card type should be CardDefinition.
- Make a gameState directory for all this. Game State becomes a subdomain, so it gets its own types.ts

### Phase 1: Core Data Types

- **Step 1.1**: Define card location types (CommandZone, Library, Hand, Revealed, Table)
- **Step 1.2**: Define GameCard type that combines CardDefinition with location
- **Step 1.3**: Create GameState class, holding deck retrieval spec and card list
- **Step 1.4**: Add invariant validation functions

Remember that these are defined in @notes/DESIGN-state.md

### Phase 2: Game State Operations

- **Step 2.1**: Implement initialize operation (from deck to game state) in the GameState constructor
- **Step 2.2**: Unit test initialize operation
- **Step 2.2**: Implement shuffle operation as a method on GameState; it alters the positions of cards in Library and returns `this`. The implementation moves out of @src/types.ts
- **Step 2.3**: Unit test shuffle operation. Check that the positions of the cards change, and verify invariants.
- **Step 2.3**: Integrate initialize and shuffle operations into app flow
- **Step 2.4**: Test that the app functions as before: you can start a game, and you can see the list of cards in the library.

### Phase 3: Game State Operations - STOP HERE, NOT YET

- **Step 2.3**: Implement draw operation (Library → Hand)
- **Step 2.4**: Implement reveal operation (Library → Revealed)

### Phase 3: Card Movement Operations

- **Step 3.1**: Implement return operations (Revealed → Library top/bottom)
- **Step 3.2**: Implement move to hand (Revealed → Hand)
- **Step 3.3**: Implement move to table (Revealed/Hand → Table)
- **Step 3.4**: Implement return from table (Table → Revealed)

### Phase 4: Hand Management

- **Step 4.1**: Implement hand reordering (move left/right)
- **Step 4.2**: Add position management utilities

### Phase 5: Views and Queries

- **Step 5.1**: Implement list commanders view
- **Step 5.2**: Implement list library view (ordered by position)
- **Step 5.3**: Implement list hand view (ordered by position)
- **Step 5.4**: Implement list revealed view (ordered by position)
- **Step 5.5**: Implement list table view (ordered by display name)

### Phase 6: Integration

- **Step 6.1**: Replace server endpoints to use new GameState operations
- **Step 6.2**: Update HTML formatters for new game state structure
- **Step 6.3**: Remove old GameState files (gameState.ts, gameStateInMemory.ts, gameStateSqlite.ts)
- **Step 6.4**: Replace existing Game interface usage with new GameState

### Implementation Notes

**Current State Analysis:**

- Current `Game` interface has `deck: Deck` and `library: Library`
- Current `GameState` interface is for persistence only (simple status tracking)
- Current `GameStateAdapter` implementations (InMemory, SQLite) will be replaced
- Current card structure in `src/types.ts` is basic with `name`, `uid`, `multiverseid`

**Key Decisions:**

- Replace existing `GameState` interface completely with new design
- Replace `GameStateAdapter` with new game state operations
- Extend current `Card` interface rather than replace it
- Implement operations as pure functions that return new state
- Position tracking starts at 0 for consistency
- Commander detection should use existing deck structure

**Implementation Strategy:**

- Complete replacement of existing GameState with new design
- Remove existing gameState.ts, gameStateInMemory.ts and gameStateSqlite.ts
- Current `shuffleDeck` function can be adapted for the new shuffle operation
- HTML formatters will be updated for new game state structure
