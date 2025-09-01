# Tracking the Game State

Status: ✅ Port and InMemory adapter implemented. Ready to implement SQLite adapter.

Before we can manipulate the library, we have to save the game state.

We will use a Hexagonal Architecture for state management; see @notes/DESIGN-layering.md and @notes/PATTERN-port-adapter-gateway.md

## Port

✅ **COMPLETED** - The port definition lives in src/port-persist-state/types.ts, including a PersistedGameState type. PersistedGameState uses types from @src/GameState.ts where it can, and it is simple data. GameId is a number, as defined in @src/GameState.ts.

The PersistStatePort interface:

```typescript
save(psg: PersistedGameState): Promise<GameId>
retrieve(gameId: GameId): Promise<PersistedGameState | null>
newGameId(): GameId
```

✅ **COMPLETED** - Conversion functions from GameState to PersistedGameState and back are implemented. GameState has a `fromPersistedGameState()` static method and `toPersistedGameState()` instance method. Tests exist for these.

## Adapters

✅ **COMPLETED** - InMemoryPersistStateAdapter is implemented and tested.

🚧 **IN PROGRESS** - SqlitePersistStateAdapter implementation plan:

### SQLite Adapter Implementation Plan

#### 1. Dependencies and Setup

- Add `sqlite3` as a dependency: `npm install sqlite3`
- Add `@types/sqlite3` as a dev dependency: `npm install --save-dev @types/sqlite3`

#### 2. Database Schema Design

Create a single table `game_states` with the following structure:

```sql
CREATE TABLE IF NOT EXISTS game_states (
  game_id INTEGER PRIMARY KEY,
  status TEXT NOT NULL,
  deck_provenance TEXT NOT NULL,  -- JSON serialized
  commanders TEXT NOT NULL,       -- JSON serialized array
  deck_name TEXT NOT NULL,
  deck_id INTEGER NOT NULL,
  total_cards INTEGER NOT NULL,
  game_cards TEXT NOT NULL,       -- JSON serialized array
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. SqlitePersistStateAdapter Implementation

File: `src/port-persist-state/SqlitePersistStateAdapter.ts`

Key features:

- Constructor takes database file path (default: "./data.db")
- Implements PersistStatePort interface
- Uses prepared statements for performance and security
- Handles JSON serialization/deserialization for complex objects
- Proper error handling and database connection management
- Auto-incrementing game IDs using SQLite's AUTOINCREMENT

#### 4. Database Operations

- **save()**: INSERT or UPDATE based on whether gameId exists
- **retrieve()**: SELECT with JSON parsing of complex fields
- **newGameId()**: Use SQLite's `last_insert_rowid()` or maintain a counter

#### 5. Error Handling

- Database connection errors
- JSON serialization/deserialization errors
- File system permission errors
- Database corruption scenarios

#### 6. Testing Strategy

File: `test/ports-persist-state/SqlitePersistStateAdapter.test.ts`

Test scenarios:

- Basic save/retrieve operations
- Game ID generation and uniqueness
- JSON serialization round-trip integrity
- Database file creation and initialization
- Error handling (corrupted data, missing files)
- Concurrent access patterns
- Database schema migration (future-proofing)

#### 7. Development Workflow

1. Install dependencies
2. Create SqlitePersistStateAdapter class
3. Implement database initialization and schema creation
4. Implement core CRUD operations
5. Add comprehensive error handling
6. Write and run tests
7. Integration testing with existing GameState conversion methods

#### 8. File Structure

```
src/port-persist-state/
├── types.ts                           # ✅ Existing
├── InMemoryPersistStateAdapter.ts     # ✅ Existing
└── SqlitePersistStateAdapter.ts       # 🚧 To implement

test/ports-persist-state/
├── InMemoryPersistStateAdapter.test.ts # ✅ Existing
└── SqlitePersistStateAdapter.test.ts   # 🚧 To implement
```

#### 9. Configuration Considerations

- Database file location configurable via constructor
- Option to enable WAL mode for better concurrent access
- Configurable timeout settings
- Optional database encryption (future enhancement)

#### 10. Migration Strategy

Since we're in early development:

- Simple approach: delete and recreate database file when schema changes
- Add version tracking in a separate `schema_version` table for future migrations
- Document breaking changes in commit messages

## Gateways

There are no external services to wrap for the SQLite adapter - it uses the Node.js sqlite3 library directly.
