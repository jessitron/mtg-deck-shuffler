import sqlite3 from "sqlite3";
import { GameId } from "../GameState.js";
import { PersistStatePort, PersistedGameState } from "./types.js";

export class SqliteAdapter implements PersistStatePort {
  private db: sqlite3.Database;
  private dbPath: string;
  private nextGameId = 1;

  constructor(dbPath: string = "./data.db") {
    this.dbPath = dbPath;
    this.db = new sqlite3.Database(dbPath);
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    this.db.serialize(() => {
      this.db.run(`
        CREATE TABLE IF NOT EXISTS game_states (
          game_id INTEGER PRIMARY KEY,
          status TEXT NOT NULL,
          deck_provenance TEXT NOT NULL,
          commanders TEXT NOT NULL,
          deck_name TEXT NOT NULL,
          deck_id INTEGER NOT NULL,
          total_cards INTEGER NOT NULL,
          game_cards TEXT NOT NULL
        )
      `);
      
      // Get the next game ID by finding the max existing ID
      this.db.get("SELECT MAX(game_id) as max_id FROM game_states", (err: Error | null, row: any) => {
        if (!err && row && row.max_id) {
          this.nextGameId = row.max_id + 1;
        }
      });
    });
  }

  async save(psg: PersistedGameState): Promise<GameId> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO game_states 
        (game_id, status, deck_provenance, commanders, deck_name, deck_id, total_cards, game_cards)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        psg.gameId,
        psg.status,
        JSON.stringify(psg.deckProvenance),
        JSON.stringify(psg.commanders),
        psg.deckName,
        psg.deckId,
        psg.totalCards,
        JSON.stringify(psg.gameCards),
        function(err: Error | null) {
          if (err) {
            reject(err);
          } else {
            resolve(psg.gameId);
          }
        }
      );

      stmt.finalize();
    });
  }

  async retrieve(gameId: GameId): Promise<PersistedGameState | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        "SELECT * FROM game_states WHERE game_id = ?",
        [gameId],
        (err: Error | null, row: any) => {
          if (err) {
            reject(err);
          } else if (!row) {
            resolve(null);
          } else {
            try {
              const persistedState: PersistedGameState = {
                gameId: row.game_id,
                status: row.status,
                deckProvenance: JSON.parse(row.deck_provenance),
                commanders: JSON.parse(row.commanders),
                deckName: row.deck_name,
                deckId: row.deck_id,
                totalCards: row.total_cards,
                gameCards: JSON.parse(row.game_cards)
              };
              resolve(persistedState);
            } catch (parseErr) {
              reject(parseErr);
            }
          }
        }
      );
    });
  }

  newGameId(): GameId {
    return this.nextGameId++;
  }

  close(): void {
    this.db.close();
  }
}