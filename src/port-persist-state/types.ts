import { GameId, GameStatus, GameCard, CardLocation } from "../GameState.js";
import { CardDefinition, DeckProvenance } from "../types.js";

export interface PersistedGameState {
  gameId: GameId;
  status: GameStatus;
  deckProvenance: DeckProvenance;
  commanders: CardDefinition[];
  deckName: string;
  deckId: number;
  totalCards: number;
  gameCards: GameCard[];
}

export interface PersistStatePort {
  save(psg: PersistedGameState): Promise<GameId>;
  retrieve(gameId: GameId): Promise<PersistedGameState | null>;
  newGameId(): GameId;
}