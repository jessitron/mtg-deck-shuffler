import { CardDefinition, DeckProvenance, GameCard, GameId, GameStatus } from "../types.js";

/* These exports are for downward, the adapters depend on the port */
export { GameId, GameCard, DeckProvenance, CardDefinition, GameStatus };

export const PERSISTED_GAME_STATE_VERSION: 1 = 1;

export interface PersistedGameState {
  version: typeof PERSISTED_GAME_STATE_VERSION;
  gameId: GameId;
  status: GameStatus;
  deckProvenance: DeckProvenance;
  commanders: CardDefinition[];
  deckName: string;
  deckId: number; // TODO: can we remove this?
  totalCards: number;
  gameCards: GameCard[];
}

export interface PersistStatePort {
  save(psg: PersistedGameState): Promise<GameId>;
  retrieve(gameId: GameId): Promise<PersistedGameState | null>;
  newGameId(): GameId;
}
