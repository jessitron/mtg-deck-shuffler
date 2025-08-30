import { GameStatus, CardLocation } from "../GameState.js";
import { Card, DeckProvenance } from "../types.js";

export type GameId = string;
export type StateId = string;

export interface PersistedGameCard {
  card: Card;
  location: CardLocation;
}

export interface PersistedGameState {
  gameId: GameId;
  status: GameStatus;
  deckProvenance: DeckProvenance;
  commanders: Card[];
  deckName: string;
  deckId: number;
  totalCards: number;
  gameCards: PersistedGameCard[];
}

export interface PersistStatePort {
  save(psg: PersistedGameState): Promise<StateId>;
  retrieve(gameId: GameId, expectedStateId: StateId): Promise<PersistedGameState>;
  newGameId(): GameId;
}