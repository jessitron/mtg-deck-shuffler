import { PersistStatePort, PersistedGameState, GameId, StateId } from "./types.js";

export class InMemoryAdapter implements PersistStatePort {
  private storage = new Map<string, PersistedGameState>();
  private gameCounter = 0;
  private stateCounter = 0;

  save(psg: PersistedGameState): StateId {
    const newStateId = this.generateStateId();
    const updatedState: PersistedGameState = {
      ...psg,
      stateId: newStateId,
      timestamp: new Date()
    };
    
    const key = `${psg.gameId}-${newStateId}`;
    this.storage.set(key, updatedState);
    
    return newStateId;
  }

  async retrieve(gameId: GameId, expectedStateId: StateId): Promise<PersistedGameState | null> {
    const key = `${gameId}-${expectedStateId}`;
    return this.storage.get(key) || null;
  }

  newGameId(): GameId {
    this.gameCounter++;
    return `game-${this.gameCounter}`;
  }

  private generateStateId(): StateId {
    this.stateCounter++;
    return `state-${this.stateCounter}`;
  }
}