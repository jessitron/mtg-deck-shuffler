import sqlite3 from "sqlite3";
import { PersistPrepPort, PersistedGamePrep, PrepId } from "./types.js";

export class SqlitePersistPrepAdapter implements PersistPrepPort {
  private db: sqlite3.Database;
  private nextPrepId = 1;
  private initializationPromise: Promise<void>;
  private isClosed = false;

  constructor(dbPath: string = "./data.db") {
    this.db = new sqlite3.Database(dbPath);
    this.initializationPromise = this.initializeDatabase();
  }

  private async initializeDatabase(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS game_preps (
          id INTEGER PRIMARY KEY,
          prep TEXT NOT NULL,
          version INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      this.db.run(createTableSQL, (err) => {
        if (err) {
          reject(new Error(`Failed to create game_preps table: ${err.message}`));
          return;
        }

        // Initialize nextPrepId based on existing data
        this.db.get(
          "SELECT MAX(id) as maxId FROM game_preps",
          (err, row: { maxId: number | null }) => {
            if (err) {
              console.warn(`Warning: Could not determine next prep ID: ${err.message}`);
            } else if (row.maxId !== null) {
              this.nextPrepId = row.maxId + 1;
            }
            resolve();
          }
        );
      });
    });
  }

  async savePrep(prep: PersistedGamePrep): Promise<PrepId> {
    await this.initializationPromise;

    return new Promise((resolve, reject) => {
      const insertOrUpdateSQL = `
        INSERT OR REPLACE INTO game_preps (id, prep, version, created_at, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;

      const prepJson = JSON.stringify(prep);

      this.db.run(
        insertOrUpdateSQL,
        [prep.prepId, prepJson, prep.version, prep.createdAt.toISOString()],
        function (err) {
          if (err) {
            reject(new Error(`Failed to save prep: ${err.message}`));
          } else {
            resolve(prep.prepId);
          }
        }
      );
    });
  }

  async retrievePrep(prepId: PrepId): Promise<PersistedGamePrep | null> {
    await this.initializationPromise;

    return new Promise((resolve, reject) => {
      const selectSQL = "SELECT prep FROM game_preps WHERE id = ?";

      this.db.get(
        selectSQL,
        [prepId],
        (err, row: { prep: string } | undefined) => {
          if (err) {
            reject(new Error(`Failed to retrieve prep: ${err.message}`));
          } else if (row) {
            try {
              const prep = JSON.parse(row.prep) as PersistedGamePrep;
              // Convert date strings back to Date objects
              if (prep.createdAt) {
                prep.createdAt = new Date(prep.createdAt);
              }
              if (prep.updatedAt) {
                prep.updatedAt = new Date(prep.updatedAt);
              }
              if (prep.deck.provenance?.retrievedDate) {
                prep.deck.provenance.retrievedDate = new Date(prep.deck.provenance.retrievedDate);
              }
              resolve(prep);
            } catch (parseErr) {
              reject(new Error(`Failed to parse prep JSON: ${parseErr}`));
            }
          } else {
            resolve(null);
          }
        }
      );
    });
  }


  newPrepId(): PrepId {
    return this.nextPrepId++;
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
