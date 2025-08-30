import { GameState } from "../GameState.js";
import { PersistedGameState, PersistedGameCard } from "./types.js";

export function gameStateToPersistedGameState(gameState: GameState): PersistedGameState {
  const gameCards = gameState.getCards();
  
  const persistedGameCards: PersistedGameCard[] = gameCards.map(gameCard => ({
    card: gameCard.card,
    location: gameCard.location
  }));

  return {
    gameId: gameState.gameId.toString(),
    status: gameState.status,
    deckProvenance: gameState.deckProvenance,
    commanders: gameState.commanders,
    deckName: gameState.deckName,
    deckId: gameState.deckId,
    totalCards: gameState.totalCards,
    gameCards: persistedGameCards
  };
}