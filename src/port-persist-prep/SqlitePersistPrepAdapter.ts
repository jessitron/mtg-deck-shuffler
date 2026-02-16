import Database from "better-sqlite3";
import { PersistPrepPort, PersistedGamePrep, PrepId } from "./types.js";

export class SqlitePersistPrepAdapter implements PersistPrepPort {
  private db: Database.Database;
  private nextPrepId = 1;
  private isClosed = false;

  constructor(dbPath: string = "./data.db") {
    this.db = new Database(dbPath);
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS game_preps (
        id INTEGER PRIMARY KEY,
        prep TEXT NOT NULL,
        version INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    this.db.exec(createTableSQL);

    const row = this.db.prepare("SELECT MAX(id) as maxId FROM game_preps").get() as
      | { maxId: number | null }
      | undefined;
    if (row?.maxId !== null && row?.maxId !== undefined) {
      this.nextPrepId = row.maxId + 1;
    }
  }

  async savePrep(prep: PersistedGamePrep): Promise<PrepId> {
    const insertOrUpdateSQL = `
      INSERT OR REPLACE INTO game_preps (id, prep, version, created_at, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;

    const prepJson = JSON.stringify(prep);
    this.db.prepare(insertOrUpdateSQL).run(prep.prepId, prepJson, prep.version, prep.createdAt.toISOString());
    return prep.prepId;
  }

  async retrievePrep(prepId: PrepId): Promise<PersistedGamePrep | null> {
    const selectSQL = "SELECT prep FROM game_preps WHERE id = ?";
    const row = this.db.prepare(selectSQL).get(prepId) as { prep: string } | undefined;

    if (row) {
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
      return prep;
    }
    return null;
  }

  newPrepId(): PrepId {
    return this.nextPrepId++;
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
