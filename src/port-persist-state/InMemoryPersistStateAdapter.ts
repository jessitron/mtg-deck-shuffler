import { GameId } from "../GameState.js";
import { PersistStatePort, PersistedGameState } from "./types.js";

export class InMemoryPersistStateAdapter implements PersistStatePort {
  private storage = new Map<GameId, PersistedGameState>();
  private nextGameId = 1;

  async save(psg: PersistedGameState): Promise<GameId> {
    this.storage.set(psg.gameId, { ...psg });
    return psg.gameId;
  }

  async retrieve(gameId: GameId): Promise<PersistedGameState | null> {
    const stored = this.storage.get(gameId);
    return stored ? { ...stored } : null;
  }

  newGameId(): GameId {
    return this.nextGameId++;
  }
}