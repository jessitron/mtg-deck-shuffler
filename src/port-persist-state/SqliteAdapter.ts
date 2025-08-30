import pkg from "sqlite3";
const { Database } = pkg;
import { GameId, StateId, PersistedGameState, PersistStatePort } from "./types.js";

export class SqliteAdapter implements PersistStatePort {
  private gameIdCounter = 1;
  private stateIdCounter = 1;
  private db: InstanceType<typeof Database>;

  constructor(dbPath: string = "./data.db") {
    this.db = new Database(dbPath);
  }

  private async initializeDatabase(): Promise<void> {
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS game_states (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id TEXT NOT NULL,
        state_id TEXT NOT NULL,
        state_data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(game_id, state_id)
      )
    `;
    
    return new Promise((resolve, reject) => {
      this.db.run(createTableSql, (err: any) => {
        if (err) {
          console.error("Error creating game_states table:", err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  newGameId(): GameId {
    return `game-${this.gameIdCounter++}`;
  }

  async save(psg: PersistedGameState): Promise<StateId> {
    await this.initializeDatabase();
    
    const stateId = `state-${this.stateIdCounter++}`;
    const stateData = JSON.stringify(psg);
    
    return new Promise((resolve, reject) => {
      const sql = `INSERT INTO game_states (game_id, state_id, state_data) VALUES (?, ?, ?)`;
      this.db.run(sql, [psg.gameId, stateId, stateData], function(err: any) {
        if (err) {
          reject(new Error(`Failed to save game state: ${err.message}`));
        } else {
          resolve(stateId);
        }
      });
    });
  }

  async retrieve(gameId: GameId, expectedStateId: StateId): Promise<PersistedGameState> {
    await this.initializeDatabase();
    
    return new Promise((resolve, reject) => {
      const sql = `SELECT state_data FROM game_states WHERE game_id = ? AND state_id = ?`;
      this.db.get(sql, [gameId, expectedStateId], (err: any, row: any) => {
        if (err) {
          reject(new Error(`Failed to retrieve game state: ${err.message}`));
        } else if (!row) {
          reject(new Error(`No state found for game ${gameId} with state ${expectedStateId}`));
        } else {
          try {
            const state = JSON.parse(row.state_data) as PersistedGameState;
            resolve(state);
          } catch (parseErr) {
            reject(new Error(`Failed to parse game state data: ${parseErr}`));
          }
        }
      });
    });
  }

  close(): void {
    this.db.close();
  }
}