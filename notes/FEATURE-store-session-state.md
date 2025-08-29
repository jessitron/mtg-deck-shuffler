# Tracking the Game State

Status: not yet specified.

Before we can manipulate the library, we have to save the game state.

We will use a Hexagonal Architecture for state management; see DESIGN-layering.md in this directory.

The port definition will live in src/port-persist-state/types.ts, including a PersistedGameState type.

The PersistStatePort interface will include

```
save(psg: PersistedGameState): StateId
retrieve(gameId: GameId, expectedStateId: StateId)
```

.....
