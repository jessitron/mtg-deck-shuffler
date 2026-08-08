import { GameState, WhatHappened, GameId } from "./GameState.js";
import { PersistStatePort, IncompatibleStateVersionError } from "./port-persist-state/types.js";
import { CardRepositoryPort } from "./port-card-repository/types.js";
import { GameEvent } from "./GameEvents.js";
import { markCurrentSpanAsError } from "./tracing_util.js";

export interface ApplyGameCommandDeps {
  persistStatePort: PersistStatePort;
  cardRepository: CardRepositoryPort;
}

export type CommandOutcome =
  | { kind: "not-found" }
  | { kind: "incompatible-version"; error: IncompatibleStateVersionError }
  | { kind: "not-active"; game: GameState }
  | { kind: "version-conflict"; game: GameState; expectedVersion: number; currentVersion: number; missedEvents: GameEvent[] }
  | { kind: "send-failed"; errorHtml: string }
  | { kind: "applied"; game: GameState; whatHappened?: WhatHappened };

/**
 * Thrown by a `beforeMutate` hook to abort a command before it mutates or
 * persists anything. Carries pre-rendered HTML for the caller's error
 * modal. Any other error `beforeMutate` throws propagates uncaught, same
 * as `mutate`'s contract.
 */
export class TableSendFailedError extends Error {
  constructor(public readonly errorHtml: string) {
    super("Tabletop did not accept the card; blocking the command");
    this.name = "TableSendFailedError";
  }
}

/**
 * The protocol shared by every game-mutating route: retrieve the persisted
 * game, reconstruct it, check it's still Active and that the caller's
 * expected version is current, run the command, then persist. Express-free
 * on purpose — the route decides how each outcome renders.
 *
 * `beforeMutate`, if given, runs after those checks and before `mutate`. It
 * is for required side effects a command can't safely proceed without (e.g.
 * sending a card to the Tabletop first) — not a permission check. Throwing
 * `TableSendFailedError` aborts the command (no mutate, no persist) and
 * yields a `"send-failed"` outcome; any other error propagates uncaught.
 *
 * Errors thrown by `mutate` propagate uncaught and are not persisted; each
 * route's own catch block still owns command-specific error handling (e.g.
 * draw's empty-library case).
 */
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
    try {
      await beforeMutate(game);
    } catch (error) {
      if (error instanceof TableSendFailedError) {
        return { kind: "send-failed", errorHtml: error.errorHtml };
      }
      throw error;
    }
  }

  const whatHappened = mutate(game) ?? undefined;
  await deps.persistStatePort.save(game.toPersistedGameState());

  return { kind: "applied", game, whatHappened };
}
