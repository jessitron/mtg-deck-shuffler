import { randomUUID } from "crypto";
import { GameId } from "../GameState.js";
import { PersistStatePort, PersistedGameState, StateId } from "./types.js";

export class InMemoryAdapter implements PersistStatePort {
  private gameStates = new Map<string, PersistedGameState>();
  private latestStateIds = new Map<GameId, StateId>();
  private nextGameId = 1;

  private makeKey(gameId: GameId, stateId: StateId): string {
    return `${gameId}:${stateId}`;
  }

  async save(psg: Omit<PersistedGameState, 'stateId'>): Promise<StateId> {
    const stateId = randomUUID();
    const gameStateWithId = { ...psg, stateId };
    const key = this.makeKey(psg.gameId, stateId);
    this.gameStates.set(key, gameStateWithId);
    this.latestStateIds.set(psg.gameId, stateId);
    return stateId;
  }

  async retrieve(gameId: GameId, expectedStateId: StateId): Promise<PersistedGameState | null> {
    const key = this.makeKey(gameId, expectedStateId);
    return this.gameStates.get(key) || null;
  }

  async newGameId(): Promise<GameId> {
    return this.nextGameId++;
  }

  async retrieveLatest(gameId: GameId): Promise<PersistedGameState | null> {
    const latestStateId = this.latestStateIds.get(gameId);
    if (!latestStateId) {
      return null;
    }
    return this.retrieve(gameId, latestStateId);
  }
}