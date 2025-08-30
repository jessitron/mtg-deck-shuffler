import { Game } from "../types.js";

export type GameId = string;
export type StateId = string;

export interface PersistedGameState {
  gameId: GameId;
  stateId: StateId;
  timestamp: Date;
  game: Game;
}

export interface PersistStatePort {
  save(psg: PersistedGameState): StateId;
  retrieve(gameId: GameId, expectedStateId: StateId): Promise<PersistedGameState | null>;
  newGameId(): GameId;
}