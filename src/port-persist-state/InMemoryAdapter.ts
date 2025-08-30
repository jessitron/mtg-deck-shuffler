import { GameId } from "../GameState.js";
import { PersistStatePort, PersistedGameState } from "./types.js";

export class InMemoryAdapter implements PersistStatePort {
  private storage = new Map<GameId, PersistedGameState>();
  private nextGameId = 1;

  async save(psg: PersistedGameState): Promise<GameId> {
    this.storage.set(psg.gameId, psg);
    return psg.gameId;
  }

  async retrieve(gameId: GameId): Promise<PersistedGameState | null> {
    return this.storage.get(gameId) || null;
  }

  newGameId(): GameId {
    return this.nextGameId++;
  }
}