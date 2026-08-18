import { GameState, WhatHappened, GameId } from "./GameState.js";
import { PersistStatePort, IncompatibleStateVersionError } from "./port-persist-state/types.js";
import { CardRepositoryPort } from "./port-card-repository/types.js";
import { GameEvent } from "./GameEvents.js";
import { markCurrentSpanAsError, setCommonSpanAttributes } from "./tracing_util.js";

export interface ApplyGameCommandDeps {
  persistStatePort: PersistStatePort;
  cardRepository: CardRepositoryPort;
}

export type CommandOutcome =
  | { kind: "not-found" }
  | { kind: "incompatible-version"; error: IncompatibleStateVersionError }
  | { kind: "not-active"; game: GameState }
  | { kind: "version-conflict"; game: GameState; expectedVersion: number; currentVersion: number; missedEvents: GameEvent[] }
  | { kind: "applied"; game: GameState; whatHappened?: WhatHappened };

export async function applyGameCommand(
  deps: ApplyGameCommandDeps,
  gameId: GameId,
  expectedVersion: number | undefined,
  mutate: (game: GameState) => WhatHappened | void,
  beforeMutate?: (game: GameState) => Promise<void>
): Promise<CommandOutcome> {
  const persistedGame = await deps.persistStatePort.retrieve(gameId);
  if (!persistedGame) {
    markCurrentSpanAsError(`Game ${gameId} not found`, {
      "game.load.failure": "not_found",
      "game.game_id": gameId,
      "game.found": false,
    });
    return { kind: "not-found" };
  }

  let game: GameState;
  try {
    game = await GameState.fromPersistedGameState(persistedGame, deps.cardRepository);
  } catch (error) {
    if (error instanceof IncompatibleStateVersionError) {
      markCurrentSpanAsError(error.message, {
        "game.load.failure": "incompatible_state_version",
        "game.game_id": gameId,
        "game.state.version.compatible": false,
        "game.state.version.found": String(error.foundVersion),
        "game.state.version.expected": error.expectedVersion,
      });
      return { kind: "incompatible-version", error };
    }
    throw error;
  }

  // Stamp table/player onto the request span for every mutation route (solo games omit them)
  setCommonSpanAttributes({ tableName: game.tableName, playerName: game.playerName });

  if (expectedVersion !== undefined) {
    const currentVersion = game.getStateVersion();
    if (expectedVersion !== currentVersion) {
      const missedEvents = game.getEventLog().getEvents().slice(expectedVersion, currentVersion);
      return { kind: "version-conflict", game, expectedVersion, currentVersion, missedEvents };
    }
  }

  if (game.gameStatus() !== "Active") {
    return { kind: "not-active", game };
  }

  if (beforeMutate) {
    await beforeMutate(game);
  }

  const whatHappened = mutate(game) ?? undefined;
  await deps.persistStatePort.save(game.toPersistedGameState());

  return { kind: "applied", game, whatHappened };
}
