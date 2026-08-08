import { GameState, WhatHappened, GameId } from "./GameState.js";
import { PersistStatePort, IncompatibleStateVersionError } from "./port-persist-state/types.js";
import { CardRepositoryPort } from "./port-card-repository/types.js";
import { GameEvent } from "./GameEvents.js";

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

/**
 * The protocol shared by every game-mutating route: retrieve the persisted
 * game, reconstruct it, check it's still Active and that the caller's
 * expected version is current, run the command, then persist. Express-free
 * on purpose — the route decides how each outcome renders.
 *
 * Errors thrown by `mutate` propagate uncaught and are not persisted; each
 * route's own catch block still owns command-specific error handling (e.g.
 * draw's empty-library case).
 */
export async function applyGameCommand(
  deps: ApplyGameCommandDeps,
  gameId: GameId,
  expectedVersion: number | undefined,
  mutate: (game: GameState) => WhatHappened | void
): Promise<CommandOutcome> {
  const persistedGame = await deps.persistStatePort.retrieve(gameId);
  if (!persistedGame) {
    return { kind: "not-found" };
  }

  let game: GameState;
  try {
    game = await GameState.fromPersistedGameState(persistedGame, deps.cardRepository);
  } catch (error) {
    if (error instanceof IncompatibleStateVersionError) {
      return { kind: "incompatible-version", error };
    }
    throw error;
  }

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

  const whatHappened = mutate(game) ?? undefined;
  await deps.persistStatePort.save(game.toPersistedGameState());

  return { kind: "applied", game, whatHappened };
}
