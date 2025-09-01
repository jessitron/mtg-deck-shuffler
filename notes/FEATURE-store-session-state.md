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

Create tests for the adapter in test/ports-persist-state/

## Gateways

There are no external services to wrap.
