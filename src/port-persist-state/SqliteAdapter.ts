import { randomUUID } from "crypto";
import sqlite3 from "sqlite3";
import { GameId } from "../GameState.js";
import { PersistStatePort, PersistedGameState, StateId } from "./types.js";

export class SqliteAdapter implements PersistStatePort {
  private db: sqlite3.Database;
  private nextGameId = 1;

  constructor(dbPath: string = "./data.db") {
    this.db = new sqlite3.Database(dbPath);
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS game_states (
        game_id INTEGER,
        state_id TEXT,
        status TEXT,
        deck_provenance TEXT,
        commanders TEXT,
        deck_name TEXT,
        deck_id INTEGER,
        total_cards INTEGER,
        game_cards TEXT,
        PRIMARY KEY (game_id, state_id)
      )
    `;
    
    const createGameIdTableSql = `
      CREATE TABLE IF NOT EXISTS game_id_counter (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        next_game_id INTEGER
      )
    `;

    this.db.serialize(() => {
      this.db.run(createTableSql);
      this.db.run(createGameIdTableSql);
      this.db.run("INSERT OR IGNORE INTO game_id_counter (id, next_game_id) VALUES (1, 1)");
    });
  }

  async save(psg: PersistedGameState): Promise<StateId> {
    return new Promise((resolve, reject) => {
      const stateId = randomUUID();
      const gameStateWithId = { ...psg, stateId };
      
      const sql = `
        INSERT INTO game_states (
          game_id, state_id, status, deck_provenance, commanders, 
          deck_name, deck_id, total_cards, game_cards
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      this.db.run(
        sql,
        [
          gameStateWithId.gameId,
          stateId,
          gameStateWithId.status,
          JSON.stringify(gameStateWithId.deckProvenance),
          JSON.stringify(gameStateWithId.commanders),
          gameStateWithId.deckName,
          gameStateWithId.deckId,
          gameStateWithId.totalCards,
          JSON.stringify(gameStateWithId.gameCards)
        ],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(stateId);
          }
        }
      );
    });
  }

  async retrieve(gameId: GameId, expectedStateId: StateId): Promise<PersistedGameState | null> {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM game_states 
        WHERE game_id = ? AND state_id = ?
      `;
      
      this.db.get(sql, [gameId, expectedStateId], (err, row: any) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (!row) {
          resolve(null);
          return;
        }
        
        try {
          const gameState: PersistedGameState = {
            gameId: row.game_id,
            stateId: row.state_id,
            status: row.status,
            deckProvenance: JSON.parse(row.deck_provenance),
            commanders: JSON.parse(row.commanders),
            deckName: row.deck_name,
            deckId: row.deck_id,
            totalCards: row.total_cards,
            gameCards: JSON.parse(row.game_cards)
          };
          resolve(gameState);
        } catch (parseErr) {
          reject(parseErr);
        }
      });
    });
  }

  async newGameId(): Promise<GameId> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.get("SELECT next_game_id FROM game_id_counter WHERE id = 1", (err, row: any) => {
          if (err) {
            reject(err);
            return;
          }
          
          const gameId = row.next_game_id;
          this.nextGameId = gameId + 1;
          
          this.db.run(
            "UPDATE game_id_counter SET next_game_id = ? WHERE id = 1",
            [this.nextGameId],
            (updateErr) => {
              if (updateErr) {
                reject(updateErr);
              } else {
                resolve(gameId);
              }
            }
          );
        });
      });
    });
  }

  close(): void {
    this.db.close();
  }
}