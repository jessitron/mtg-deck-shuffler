import { PersistStatePort, PersistedGameState, GameId, GameHistorySummary } from "./types.js";

export class InMemoryPersistStateAdapter implements PersistStatePort {
  private storage = new Map<GameId, PersistedGameState>();
  private timestamps = new Map<GameId, { createdAt: Date; updatedAt: Date }>();
  private nextGameId = 1;

  async save(psg: PersistedGameState): Promise<GameId> {
    this.storage.set(psg.gameId, { ...psg });

    // Track timestamps
    const existing = this.timestamps.get(psg.gameId);
    if (existing) {
      this.timestamps.set(psg.gameId, { createdAt: existing.createdAt, updatedAt: new Date() });
    } else {
      const now = new Date();
      this.timestamps.set(psg.gameId, { createdAt: now, updatedAt: now });
    }

    return psg.gameId;
  }

  async retrieve(gameId: GameId): Promise<PersistedGameState | null> {
    const stored = this.storage.get(gameId);
    return stored ? { ...stored } : null;
  }

  newGameId(): GameId {
    return this.nextGameId++;
  }

  async getAllGames(): Promise<GameHistorySummary[]> {
    const summaries: GameHistorySummary[] = [];

    for (const [gameId, gameState] of this.storage.entries()) {
      // Extract commander names
      const commanders = gameState.gameCards
        .filter(gc => gc.isCommander)
        .map(gc => gc.card.name);

      // Count actions (events minus "start game" event)
      const actionCount = gameState.events.filter(e => e.eventName !== "start game").length;

      const timestamps = this.timestamps.get(gameId) || { createdAt: new Date(), updatedAt: new Date() };

      summaries.push({
        gameId,
        deckName: gameState.deckName,
        commanderNames: commanders,
        actionCount,
        createdAt: timestamps.createdAt,
        updatedAt: timestamps.updatedAt,
      });
    }

    // Sort by creation date descending (most recent first)
    summaries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return summaries;
  }
}