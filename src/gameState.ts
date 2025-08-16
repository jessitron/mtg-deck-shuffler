export interface GameState {
  id: string;
  status: 'active' | 'ended';
  deckId?: string;
  libraryCards?: Array<{ name: string; count: number }>;
  startDate: Date;
  lastUpdated: Date;
}

export interface GameStateAdapter {
  startGame(gameId: string, deckId?: string): Promise<GameState>;
  retrieveGame(gameId: string): Promise<GameState | null>;
  updateGame(gameId: string, updates: Partial<Omit<GameState, 'id' | 'startDate'>>): Promise<GameState>;
  endGame(gameId: string): Promise<void>;
}