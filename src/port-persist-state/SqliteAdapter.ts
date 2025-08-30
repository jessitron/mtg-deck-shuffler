import sqlite3 from "sqlite3";
import { PersistStatePort, PersistedGameState, GameId, StateId } from "./types.js";

export class SqliteAdapter implements PersistStatePort {
  private db: sqlite3.Database;
  private gameCounter = 0;
  private stateCounter = 0;

  constructor(dbPath: string = "./data.db") {
    this.db = new sqlite3.Database(dbPath);
    this.initDatabase();
  }

  private initDatabase(): void {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS game_states (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id TEXT NOT NULL,
        state_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        game_data TEXT NOT NULL,
        UNIQUE(game_id, state_id)
      )
    `;
    
    this.db.run(createTableQuery, (err) => {
      if (err) {
        console.error("Error creating game_states table:", err);
      }
    });
  }

  save(psg: PersistedGameState): StateId {
    const newStateId = this.generateStateId();
    const updatedState: PersistedGameState = {
      ...psg,
      stateId: newStateId,
      timestamp: new Date()
    };

    const insertQuery = `
      INSERT OR REPLACE INTO game_states (game_id, state_id, timestamp, game_data)
      VALUES (?, ?, ?, ?)
    `;

    this.db.run(
      insertQuery,
      [
        updatedState.gameId,
        updatedState.stateId,
        updatedState.timestamp.toISOString(),
        JSON.stringify(updatedState.game)
      ],
      (err) => {
        if (err) {
          console.error("Error saving game state:", err);
        }
      }
    );

    return newStateId;
  }

  async retrieve(gameId: GameId, expectedStateId: StateId): Promise<PersistedGameState | null> {
    return new Promise((resolve, reject) => {
      const selectQuery = `
        SELECT game_id, state_id, timestamp, game_data
        FROM game_states
        WHERE game_id = ? AND state_id = ?
      `;

      this.db.get(selectQuery, [gameId, expectedStateId], (err, row: any) => {
        if (err) {
          console.error("Error retrieving game state:", err);
          reject(err);
          return;
        }

        if (!row) {
          resolve(null);
          return;
        }

        try {
          const gameData = JSON.parse(row.game_data);
          const persistedState: PersistedGameState = {
            gameId: row.game_id,
            stateId: row.state_id,
            timestamp: new Date(row.timestamp),
            game: gameData
          };
          resolve(persistedState);
        } catch (parseError) {
          console.error("Error parsing game data:", parseError);
          reject(parseError);
        }
      });
    });
  }

  newGameId(): GameId {
    this.gameCounter++;
    return `game-${this.gameCounter}`;
  }

  private generateStateId(): StateId {
    this.stateCounter++;
    return `state-${this.stateCounter}`;
  }

  close(): void {
    this.db.close((err) => {
      if (err) {
        console.error("Error closing database:", err);
      }
    });
  }
}