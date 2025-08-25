import sqlite3 from 'sqlite3';
import { GameState, GameStateAdapter } from './gameState.js';

export class SQLiteGameStateAdapter implements GameStateAdapter {
  private db: sqlite3.Database;

  constructor(dbPath: string = ':memory:') {
    this.db = new sqlite3.Database(dbPath);
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    this.db.serialize(() => {
      this.db.run(`
        CREATE TABLE IF NOT EXISTS game_states (
          id TEXT PRIMARY KEY,
          status TEXT NOT NULL,
          deck_id TEXT,
          library_cards TEXT,
          start_date TEXT NOT NULL,
          last_updated TEXT NOT NULL
        )
      `);
    });
  }

  async startGame(gameId: string, deckId?: string): Promise<GameState> {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      
      this.db.get(
        'SELECT id FROM game_states WHERE id = ?',
        [gameId],
        (err, row) => {
          if (err) return reject(err);
          if (row) return reject(new Error(`Game with id ${gameId} already exists`));

          const gameState: GameState = {
            id: gameId,
            status: 'active',
            deckId,
            startDate: new Date(now),
            lastUpdated: new Date(now)
          };

          this.db.run(
            'INSERT INTO game_states (id, status, deck_id, start_date, last_updated) VALUES (?, ?, ?, ?, ?)',
            [gameId, gameState.status, deckId || null, now, now],
            function(err) {
              if (err) return reject(err);
              resolve(gameState);
            }
          );
        }
      );
    });
  }

  async retrieveGame(gameId: string): Promise<GameState | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM game_states WHERE id = ?',
        [gameId],
        (err, row: any) => {
          if (err) return reject(err);
          if (!row) return resolve(null);

          const gameState: GameState = {
            id: row.id,
            status: row.status,
            deckId: row.deck_id,
            libraryCards: row.library_cards ? JSON.parse(row.library_cards) : undefined,
            startDate: new Date(row.start_date),
            lastUpdated: new Date(row.last_updated)
          };

          resolve(gameState);
        }
      );
    });
  }

  async updateGame(gameId: string, updates: Partial<Omit<GameState, 'id' | 'startDate'>>): Promise<GameState> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM game_states WHERE id = ?',
        [gameId],
        (err, row: any) => {
          if (err) return reject(err);
          if (!row) return reject(new Error(`Game with id ${gameId} not found`));

          const now = new Date().toISOString();
          const updatedState: GameState = {
            id: gameId,
            status: updates.status || row.status,
            deckId: updates.deckId !== undefined ? updates.deckId : row.deck_id,
            libraryCards: updates.libraryCards !== undefined ? updates.libraryCards : (row.library_cards ? JSON.parse(row.library_cards) : undefined),
            startDate: new Date(row.start_date),
            lastUpdated: new Date(now)
          };

          this.db.run(
            'UPDATE game_states SET status = ?, deck_id = ?, library_cards = ?, last_updated = ? WHERE id = ?',
            [
              updatedState.status,
              updatedState.deckId || null,
              updatedState.libraryCards ? JSON.stringify(updatedState.libraryCards) : null,
              now,
              gameId
            ],
            function(err) {
              if (err) return reject(err);
              resolve(updatedState);
            }
          );
        }
      );
    });
  }

  async endGame(gameId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT id FROM game_states WHERE id = ?',
        [gameId],
        (err, row) => {
          if (err) return reject(err);
          if (!row) return reject(new Error(`Game with id ${gameId} not found`));

          this.db.run(
            'DELETE FROM game_states WHERE id = ?',
            [gameId],
            function(err) {
              if (err) return reject(err);
              resolve();
            }
          );
        }
      );
    });
  }

  close(): void {
    this.db.close();
  }
}