import Database from "better-sqlite3";
import { PersistPrepPort, PersistedGamePrep, PrepId } from "./types.js";
import { CardRepositoryPort } from "../port-card-repository/types.js";
import { PersistedDeck } from "../port-persist-state/persisted-types.js";
import { hydrateDeck, dehydrateDeck } from "../port-card-repository/hydration.js";

// Internal storage type with dehydrated deck
interface StoredPrep {
  version: number;
  prepId: PrepId;
  deck: PersistedDeck;
  createdAt: Date;
  updatedAt: Date;
}

export class SqlitePersistPrepAdapter implements PersistPrepPort {
  private db: Database.Database;
  private nextPrepId = 1;
  private isClosed = false;
  private cardRepository: CardRepositoryPort;

  constructor(dbPath: string = "./data.db", cardRepository: CardRepositoryPort) {
    this.db = new Database(dbPath);
    this.cardRepository = cardRepository;
    this.initializeDatabase();
  }

  // 'prep' is a blob of JSON with all the info
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

    // Dehydrate the deck before storing
    const storedPrep: StoredPrep = {
      ...prep,
      deck: dehydrateDeck(prep.deck),
    };

    const prepJson = JSON.stringify(storedPrep);
    this.db.prepare(insertOrUpdateSQL).run(prep.prepId, prepJson, prep.version, prep.createdAt.toISOString());
    return prep.prepId;
  }

  async retrievePrep(prepId: PrepId): Promise<PersistedGamePrep | null> {
    const selectSQL = "SELECT prep FROM game_preps WHERE id = ?";
    const row = this.db.prepare(selectSQL).get(prepId) as { prep: string } | undefined;

    if (row) {
      const storedPrep = JSON.parse(row.prep) as StoredPrep;

      // Convert date strings back to Date objects
      if (storedPrep.createdAt) {
        storedPrep.createdAt = new Date(storedPrep.createdAt);
      }
      if (storedPrep.updatedAt) {
        storedPrep.updatedAt = new Date(storedPrep.updatedAt);
      }

      // Hydrate the deck before returning
      const hydratedDeck = await hydrateDeck(storedPrep.deck, this.cardRepository);

      // Convert provenance date if present
      if (hydratedDeck.provenance?.retrievedDate) {
        hydratedDeck.provenance.retrievedDate = new Date(hydratedDeck.provenance.retrievedDate);
      }

      return {
        version: storedPrep.version as 2,
        prepId: storedPrep.prepId,
        deck: hydratedDeck,
        createdAt: storedPrep.createdAt,
        updatedAt: storedPrep.updatedAt,
      };
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
