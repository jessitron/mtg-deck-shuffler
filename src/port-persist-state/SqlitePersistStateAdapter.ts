import sqlite3 from "sqlite3";
import { PersistStatePort, PersistedGameState, GameId, GameHistorySummary } from "./types.js";

export class SqlitePersistStateAdapter implements PersistStatePort {
  private db: sqlite3.Database;
  private nextGameId = 1;
  private initializationPromise: Promise<void>;
  private isClosed = false;

  constructor(dbPath: string = "./data.db") {
    this.db = new sqlite3.Database(dbPath);
    this.initializationPromise = this.initializeDatabase();
  }

  private async initializeDatabase(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS game_states (
          id INTEGER PRIMARY KEY,
          state TEXT NOT NULL,
          version INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      this.db.run(createTableSQL, (err) => {
        if (err) {
          reject(new Error(`Failed to create game_states table: ${err.message}`));
          return;
        }

        // Initialize nextGameId based on existing data
        this.db.get(
          "SELECT MAX(id) as maxId FROM game_states",
          (err, row: { maxId: number | null }) => {
            if (err) {
              console.warn(`Warning: Could not determine next game ID: ${err.message}`);
            } else if (row.maxId !== null) {
              this.nextGameId = row.maxId + 1;
            }
            resolve();
          }
        );
      });
    });
  }

  async save(psg: PersistedGameState): Promise<GameId> {
    await this.initializationPromise;
    
    return new Promise((resolve, reject) => {
      const insertOrUpdateSQL = `
        INSERT OR REPLACE INTO game_states (id, state, version, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `;

      const stateJson = JSON.stringify(psg);
      
      this.db.run(
        insertOrUpdateSQL,
        [psg.gameId, stateJson, psg.version],
        function (err) {
          if (err) {
            reject(new Error(`Failed to save game state: ${err.message}`));
          } else {
            resolve(psg.gameId);
          }
        }
      );
    });
  }

  async retrieve(gameId: GameId): Promise<PersistedGameState | null> {
    await this.initializationPromise;
    
    return new Promise((resolve, reject) => {
      const selectSQL = "SELECT state FROM game_states WHERE id = ?";
      
      this.db.get(
        selectSQL,
        [gameId],
        (err, row: { state: string } | undefined) => {
          if (err) {
            reject(new Error(`Failed to retrieve game state: ${err.message}`));
          } else if (row) {
            try {
              const gameState = JSON.parse(row.state) as PersistedGameState;
              // Convert date strings back to Date objects
              if (gameState.deckProvenance?.retrievedDate) {
                gameState.deckProvenance.retrievedDate = new Date(gameState.deckProvenance.retrievedDate);
              }
              resolve(gameState);
            } catch (parseErr) {
              reject(new Error(`Failed to parse game state JSON: ${parseErr}`));
            }
          } else {
            resolve(null);
          }
        }
      );
    });
  }

  newGameId(): GameId {
    return this.nextGameId++;
  }

  async getAllGames(): Promise<GameHistorySummary[]> {
    await this.initializationPromise;

    return new Promise((resolve, reject) => {
      const selectSQL = "SELECT id, state, created_at, updated_at FROM game_states ORDER BY created_at DESC";

      this.db.all(
        selectSQL,
        [],
        (err, rows: Array<{ id: number; state: string; created_at: string; updated_at: string }>) => {
          if (err) {
            reject(new Error(`Failed to retrieve game history: ${err.message}`));
          } else {
            const summaries: GameHistorySummary[] = rows.map(row => {
              try {
                const gameState = JSON.parse(row.state) as PersistedGameState;

                // Extract commander names
                const commanders = gameState.gameCards
                  .filter(gc => gc.isCommander)
                  .map(gc => gc.card.name);

                // Count actions (events minus "start game" event)
                const actionCount = gameState.events.filter(e => e.eventName !== "start game").length;

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
            resolve(summaries);
          }
        }
      );
    });
  }

  async waitForInitialization(): Promise<void> {
    await this.initializationPromise;
  }

  close(): Promise<void> {
    if (this.isClosed) {
      return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(new Error(`Failed to close database: ${err.message}`));
        } else {
          this.isClosed = true;
          resolve();
        }
      });
    });
  }
}
