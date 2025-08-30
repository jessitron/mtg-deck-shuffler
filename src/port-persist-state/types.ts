import { GameId, GameStatus, CardLocation } from "../GameState.js";
import { Card, DeckProvenance } from "../types.js";

export type StateId = string;

export interface PersistedGameCard {
  card: Card;
  location: CardLocation;
}

export interface PersistedGameState {
  gameId: GameId;
  stateId: StateId;
  status: GameStatus;
  deckProvenance: DeckProvenance;
  commanders: Card[];
  deckName: string;
  deckId: number;
  totalCards: number;
  gameCards: PersistedGameCard[];
}

export interface PersistStatePort {
  save(psg: Omit<PersistedGameState, 'stateId'>): Promise<StateId>;
  retrieve(gameId: GameId, expectedStateId: StateId): Promise<PersistedGameState | null>;
  newGameId(): Promise<GameId>;
}