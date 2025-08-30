import { GameId, StateId, PersistedGameState, PersistStatePort } from "./types.js";

export class InMemoryAdapter implements PersistStatePort {
  private gameIdCounter = 1;
  private stateIdCounter = 1;
  private states = new Map<string, PersistedGameState>();

  newGameId(): GameId {
    return `game-${this.gameIdCounter++}`;
  }

  async save(psg: PersistedGameState): Promise<StateId> {
    const stateId = `state-${this.stateIdCounter++}`;
    const key = this.makeKey(psg.gameId, stateId);
    this.states.set(key, { ...psg });
    return stateId;
  }

  async retrieve(gameId: GameId, expectedStateId: StateId): Promise<PersistedGameState> {
    const key = this.makeKey(gameId, expectedStateId);
    const state = this.states.get(key);
    if (!state) {
      throw new Error(`No state found for game ${gameId} with state ${expectedStateId}`);
    }
    return { ...state };
  }

  private makeKey(gameId: GameId, stateId: StateId): string {
    return `${gameId}:${stateId}`;
  }
}