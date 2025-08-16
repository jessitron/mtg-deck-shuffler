# Tracking the library

Status: not started.

Before we can manipulate the library, we have to save the state of the library.

We will use a Hexagonal Architecture for state management.

Create an adapter for game state.

It can save the game state, starting with "start game". It will be updated when we add library manipulation. At "end game" it is deleted. It can be retrieved, too. The start date and last updated date are recorded.

Locally, we will use sqlite. In production, we will use probably dynamodb (later). Warn me if that's going to be hard. Warn me if any of these plans are going to be hard in dynamodb.

Create an implementation that uses sqlite.

Create an implementation that stores the state in memory.

Create tests for the adapter interface. Test both the in-memory and sqlite implementations through a lifecycle of start, retrieve, update, retrieve, delete, attempt to retrieve but fail.

## Implementation Results

**Status: COMPLETED** ✅

### What was implemented:

1. **GameState interface and adapter pattern** - Created a clean hexagonal architecture with:
   - `GameState` type definition with id, status, deckId, libraryCards, startDate, lastUpdated
   - `GameStateAdapter` interface with startGame, retrieveGame, updateGame, endGame methods

2. **InMemoryGameStateAdapter** - Simple Map-based implementation:
   - Fast and lightweight for testing/development
   - No external dependencies
   - Perfect for unit tests

3. **SQLiteGameStateAdapter** - Persistent storage implementation:
   - Uses SQLite database with proper schema
   - JSON serialization for complex fields (libraryCards)
   - Supports both file-based and in-memory databases
   - All database operations are properly async/await wrapped

4. **Comprehensive test suite** - Tests both implementations through full lifecycle:
   - ✅ Start game
   - ✅ Retrieve game
   - ✅ Update game state (including library cards)
   - ✅ Retrieve updated game
   - ✅ Delete game
   - ✅ Fail to retrieve deleted game
   - ✅ Error handling for duplicate games, missing games

### Key Learnings:

- **SQLite integration worked smoothly** - No major blockers for SQLite implementation
- **Hexagonal architecture pays off** - Both implementations satisfy the same interface perfectly
- **JSON serialization approach** - Storing complex libraryCards as JSON strings in SQLite works well
- **Error handling is consistent** - Both adapters throw meaningful errors for edge cases

### DynamoDB Compatibility Assessment:

**🟡 MODERATE DIFFICULTY** - The current design will need some adjustments for DynamoDB:

1. **Date handling** - DynamoDB doesn't have native Date types, will need string conversion
2. **Error handling** - DynamoDB has different error types and patterns
3. **Async patterns** - Similar to SQLite, so existing Promise-based design is compatible
4. **JSON serialization** - DynamoDB supports Map types, but JSON approach will still work
5. **Primary key** - Current `id` field maps perfectly to DynamoDB partition key

**Recommendation:** The interface design is solid and will transition to DynamoDB smoothly with minimal changes to the adapter implementation.

### Files created:
- `src/gameState.ts` - Interface definitions
- `src/gameStateInMemory.ts` - In-memory implementation  
- `src/gameStateSqlite.ts` - SQLite implementation
- `test/gameState.test.ts` - Comprehensive test suite

### Dependencies added:
- `sqlite3` and `@types/sqlite3` for database support
