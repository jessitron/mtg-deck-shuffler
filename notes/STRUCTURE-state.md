# Implement @notes/DESIGN-state.md

Status: planning

## Implementation Plan

### Phase 1: Core Data Types
- **Step 1.1**: Define card location types (CommandZone, Library, Hand, Revealed, Table)
- **Step 1.2**: Define GameCard interface that combines Card with location
- **Step 1.3**: Create GameState interface with deck retrieval spec and card list
- **Step 1.4**: Add invariant validation functions

### Phase 2: Game State Operations
- **Step 2.1**: Implement initialize operation (from deck to game state)
- **Step 2.2**: Implement shuffle operation 
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
- **Step 6.1**: Update server endpoints to use new GameState
- **Step 6.2**: Update HTML formatters for new game state structure
- **Step 6.3**: Add persistence layer integration
- **Step 6.4**: Update existing Game interface to be compatible or migrate

### Implementation Notes

**Current State Analysis:**
- Current `Game` interface has `deck: Deck` and `library: Library`
- Current `GameState` interface exists but is for persistence, not game logic
- Need to avoid naming conflicts - suggest `GameSession` for the new design
- Current card structure in `deck.ts` is basic with `name`, `uid`, `multiverseid`

**Key Decisions:**
- Use `GameSession` name to avoid conflict with existing `GameState` interface
- Extend current `Card` interface rather than replace it
- Implement operations as pure functions that return new state
- Position tracking starts at 0 for consistency
- Commander detection should use existing deck structure

**Compatibility:**
- Phase 6 will ensure existing endpoints continue to work
- Current `shuffleDeck` function can be adapted for the new shuffle operation
- HTML formatters will need updates but can reuse display logic
