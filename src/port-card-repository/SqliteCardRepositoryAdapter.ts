import Database from "better-sqlite3";
import { CardRepositoryPort } from "./types.js";
import { CardDefinition } from "../types.js";

interface CardRow {
  scryfall_id: string;
  name: string;
  multiverseid: number | null;
  two_faced: number;
  oracle_card_name: string;
  color_identity: string;
  set_code: string;
  card_types: string;
}

export class SqliteCardRepositoryAdapter implements CardRepositoryPort {
  private db: Database.Database;
  private isClosed = false;

  constructor(dbPath: string = "./data.db") {
    this.db = new Database(dbPath);
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    // The cards table is a local cache. If an older schema is present (it had
    // mana_cost/cmc/oracle_text/back_face columns and a `types` column), drop it
    // and rebuild with the current shape -- cards are re-saved when decks load.
    const columns = this.db.prepare(`PRAGMA table_info(cards)`).all() as Array<{ name: string }>;
    const isStaleSchema = columns.length > 0 && !columns.some(c => c.name === "card_types");
    if (isStaleSchema) {
      this.db.exec(`DROP TABLE cards`);
    }

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS cards (
        scryfall_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        multiverseid INTEGER,
        two_faced INTEGER NOT NULL,
        oracle_card_name TEXT NOT NULL,
        color_identity TEXT NOT NULL,
        set_code TEXT NOT NULL,
        card_types TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    this.db.exec(createTableSQL);
  }

  async saveCards(cards: CardDefinition[]): Promise<void> {
    const insertOrUpdateSQL = `
      INSERT OR REPLACE INTO cards (
        scryfall_id, name, multiverseid, two_faced, oracle_card_name,
        color_identity, set_code, card_types, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;

    const stmt = this.db.prepare(insertOrUpdateSQL);

    // Use a transaction for better performance when inserting multiple cards
    const insertMany = this.db.transaction((cardsToInsert: CardDefinition[]) => {
      for (const card of cardsToInsert) {
        stmt.run(
          card.scryfallId,
          card.name,
          card.multiverseid ?? null,
          card.twoFaced ? 1 : 0,
          card.oracleCardName,
          JSON.stringify(card.colorIdentity),
          card.set,
          JSON.stringify(card.cardTypes)
        );
      }
    });

    insertMany(cards);
  }

  async getCard(scryfallId: string): Promise<CardDefinition | null> {
    const selectSQL = `
      SELECT * FROM cards WHERE scryfall_id = ?
    `;

    const row = this.db.prepare(selectSQL).get(scryfallId) as
      | CardRow
      | undefined;

    if (!row) {
      return null;
    }

    return this.rowToCardDefinition(row);
  }

  async getCards(scryfallIds: string[]): Promise<CardDefinition[]> {
    if (scryfallIds.length === 0) {
      return [];
    }

    // Build a parameterized query with the right number of placeholders
    const placeholders = scryfallIds.map(() => "?").join(", ");
    const selectSQL = `
      SELECT * FROM cards WHERE scryfall_id IN (${placeholders})
    `;

    const rows = this.db.prepare(selectSQL).all(...scryfallIds) as CardRow[];

    return rows.map((row) => this.rowToCardDefinition(row));
  }

  private rowToCardDefinition(row: CardRow): CardDefinition {
    return {
      scryfallId: row.scryfall_id,
      name: row.name,
      multiverseid: row.multiverseid ?? undefined,
      twoFaced: row.two_faced === 1,
      oracleCardName: row.oracle_card_name,
      colorIdentity: JSON.parse(row.color_identity) as string[],
      set: row.set_code,
      cardTypes: JSON.parse(row.card_types) as string[],
    };
  }

  close(): void {
    if (!this.isClosed) {
      this.db.close();
      this.isClosed = true;
    }
  }
}

