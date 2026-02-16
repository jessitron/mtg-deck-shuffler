import Database from "better-sqlite3";
import { PersistStatePort, PersistedGameState, GameId, GameHistorySummary } from "./types.js";

export class SqlitePersistStateAdapter implements PersistStatePort {
  private db: Database.Database;
  private nextGameId = 1;
  private isClosed = false;

  constructor(dbPath: string = "./data.db") {
    this.db = new Database(dbPath);
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS game_states (
        id INTEGER PRIMARY KEY,
        state TEXT NOT NULL,
        version INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    this.db.exec(createTableSQL);

    const row = this.db.prepare("SELECT MAX(id) as maxId FROM game_states").get() as
      | { maxId: number | null }
      | undefined;
    if (row?.maxId !== null && row?.maxId !== undefined) {
      this.nextGameId = row.maxId + 1;
    }
  }

  async save(psg: PersistedGameState): Promise<GameId> {
    const insertOrUpdateSQL = `
      INSERT OR REPLACE INTO game_states (id, state, version, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `;

    const stateJson = JSON.stringify(psg);
    this.db.prepare(insertOrUpdateSQL).run(psg.gameId, stateJson, psg.version);
    return psg.gameId;
  }

  async retrieve(gameId: GameId): Promise<PersistedGameState | null> {
    const selectSQL = "SELECT state FROM game_states WHERE id = ?";
    const row = this.db.prepare(selectSQL).get(gameId) as { state: string } | undefined;

    if (row) {
      const gameState = JSON.parse(row.state) as PersistedGameState;
      // Convert date strings back to Date objects
      if (gameState.deckProvenance?.retrievedDate) {
        gameState.deckProvenance.retrievedDate = new Date(gameState.deckProvenance.retrievedDate);
      }
      return gameState;
    }
    return null;
  }

  newGameId(): GameId {
    return this.nextGameId++;
  }

  async getAllGames(): Promise<GameHistorySummary[]> {
    const selectSQL = "SELECT id, state, created_at, updated_at FROM game_states ORDER BY created_at DESC";
    const rows = this.db.prepare(selectSQL).all() as Array<{
      id: number;
      state: string;
      created_at: string;
      updated_at: string;
    }>;

    return rows.map((row) => {
      try {
        const gameState = JSON.parse(row.state) as PersistedGameState;

        // Extract commander names
        const commanders = gameState.gameCards.filter((gc) => gc.isCommander).map((gc) => gc.card.name);

        // Count actions (events minus "start game" event)
        const actionCount = gameState.events.filter((e) => e.eventName !== "start game").length;

        return {
          gameId: row.id,
          deckName: gameState.deckName,
          commanderNames: commanders,
          actionCount,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
        };
      } catch (parseErr) {
        console.error(`Failed to parse game state for game ${row.id}: ${parseErr}`);
        return {
          gameId: row.id,
          deckName: "Unknown",
          commanderNames: [],
          actionCount: 0,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
        };
      }
    });
  }

  async waitForInitialization(): Promise<void> {
    // No-op: initialization is synchronous with better-sqlite3
  }

  close(): Promise<void> {
    if (this.isClosed) {
      return Promise.resolve();
    }

    this.db.close();
    this.isClosed = true;
    return Promise.resolve();
  }
}
