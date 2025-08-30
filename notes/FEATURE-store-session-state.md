# Tracking the Game State

Status: not yet specified.

Before we can manipulate the library, we have to save the game state.

We will use a Hexagonal Architecture for state management; see @notes/DESIGN-layering.md and @notes/PATTERN-port-adapter-gateway.md

## Port

The port definition will live in src/port-persist-state/types.ts, including a PersistedGameState type. PersistedGameState will use types from @src/gameState.ts where it can, and it is simple data. GameId is a number, while StateId is a UUID string.

The PersistStatePort interface

```
save(psg: PersistedGameState): StateId
retrieve(gameId: GameId, expectedStateId: StateId)
newGameId(): GameId
```

## Adapters

We will implement two adapters: InMemory and Sqlite.

Sqlite will store to a file, specified in adapter construction, right now "./data.db". As we iterate on PersistedGameState, we can wipe out and recreate the database file. We have no production environment right now.

## Gateways

There are no external services to wrap.
