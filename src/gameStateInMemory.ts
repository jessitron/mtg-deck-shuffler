import { GameState, GameStateAdapter } from './gameState.js';

export class InMemoryGameStateAdapter implements GameStateAdapter {
  private games: Map<string, GameState> = new Map();

  async startGame(gameId: string, deckId?: string): Promise<GameState> {
    if (this.games.has(gameId)) {
      throw new Error(`Game with id ${gameId} already exists`);
    }

    const now = new Date();
    const gameState: GameState = {
      id: gameId,
      status: 'active',
      deckId,
      startDate: now,
      lastUpdated: now
    };

    this.games.set(gameId, gameState);
    return gameState;
  }

  async retrieveGame(gameId: string): Promise<GameState | null> {
    return this.games.get(gameId) || null;
  }

  async updateGame(gameId: string, updates: Partial<Omit<GameState, 'id' | 'startDate'>>): Promise<GameState> {
    const existingGame = this.games.get(gameId);
    if (!existingGame) {
      throw new Error(`Game with id ${gameId} not found`);
    }

    const updatedGame: GameState = {
      ...existingGame,
      ...updates,
      id: gameId,
      startDate: existingGame.startDate,
      lastUpdated: new Date()
    };

    this.games.set(gameId, updatedGame);
    return updatedGame;
  }

  async endGame(gameId: string): Promise<void> {
    if (!this.games.has(gameId)) {
      throw new Error(`Game with id ${gameId} not found`);
    }
    this.games.delete(gameId);
  }
}