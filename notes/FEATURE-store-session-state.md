# Tracking the Game State

Status: not yet specified.

Before we can manipulate the library, we have to save the game state.

We will use a Hexagonal Architecture for state management; see @notes/DESIGN-layering.md and @notes/PATTERN-port-adapter-gateway.md

## Port

The port definition will live in src/port-persist-state/types.ts, including a PersistedGameState type. PersistedGameState will use types from @src/GameState.ts where it can, and it is simple data. GameId is a number, as defined in @src/GameState.ts.

The PersistStatePort interface

```
save(psg: PersistedGameState): Promise<GameId>
retrieve(gameId: GameId): Promise<PersistedGameState | null>
newGameId(): GameId
```

Include conversion functions from GameState to PersistedGameState and back. It's OK to add a new constructor in GameState. Add tests for these. 

## Adapters

We will implement one adapter, InMemoryPersistStateAdapter.

LATER: there will be a SqlitePersistStateAdapter. Sqlite will store to a file, specified in adapter construction, right now "./data.db". As we iterate on PersistedGameState, we can wipe out and recreate the database file. We have no production environment right now. So we don't even need this adapter right now, haha.

### SQLite Adapter Implementation Plan

When implementing the SqlitePersistStateAdapter:

1. **Dependencies**: Add `sqlite3` and `@types/sqlite3` to package.json
2. **Schema**: Create a simple table structure:
   ```sql
   CREATE TABLE IF NOT EXISTS game_states (
     id INTEGER PRIMARY KEY,
     state TEXT NOT NULL,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
     updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
   );
   ```
3. **Implementation**:
   - Store PersistedGameState as JSON in the `state` column
   - Use `sqlite3.Database` with promisified callbacks or `sqlite3` in async mode
   - Initialize database and create tables in constructor
   - Implement proper connection cleanup in a `close()` method
4. **Error handling**: Wrap SQLite operations in try-catch and convert to appropriate errors
5. **Migration strategy**: Since we can recreate the DB file during iteration, use a simple "drop and recreate" approach for schema changes

Create tests for the adapter in test/ports-persist-state/

## Gateways

There are no external services to wrap.
