import Database from "better-sqlite3";
import { trace } from "@opentelemetry/api";
import { PersistStatePort, PersistedGameState, GameHistorySummary } from "./types.js";
import { GameId } from "../domain-types.js";
import { CardRepositoryPort } from "../port-card-repository/types.js";
import { generateUniqueGameId } from "../gameIdGenerator.js";
import { log } from "../log.js";

export class SqlitePersistStateAdapter implements PersistStatePort {
  private db: Database.Database;
  private isClosed = false;
  private cardRepository: CardRepositoryPort;

  constructor(dbPath: string = "./data.db", cardRepository: CardRepositoryPort) {
    this.db = new Database(dbPath);
    this.cardRepository = cardRepository;
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    const idColumnType = this.db
      .prepare("SELECT type FROM pragma_table_info('game_states') WHERE name = 'id'")
      .get() as { type: string } | undefined;

    if (idColumnType && idColumnType.type.toUpperCase() === "INTEGER") {
      log.info("Migrating game_states.id off INTEGER PRIMARY KEY to allow word-combo ids", {});
      this.db.exec(`
        BEGIN;
        ALTER TABLE game_states RENAME TO game_states_pre_word_ids;
        CREATE TABLE game_states (
          id PRIMARY KEY,
          state TEXT NOT NULL,
          version INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO game_states SELECT * FROM game_states_pre_word_ids;
        DROP TABLE game_states_pre_word_ids;
        COMMIT;
      `);
      return;
    }

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS game_states (
        id PRIMARY KEY,
        state TEXT NOT NULL,
        version INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    this.db.exec(createTableSQL);
  }

  async save(psg: PersistedGameState): Promise<GameId> {
    const insertOrUpdateSQL = `
      INSERT OR REPLACE INTO game_states (id, state, version, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `;

    const stateJson = JSON.stringify(psg);
    this.db.prepare(insertOrUpdateSQL).run(psg.gameId, stateJson, psg.version);
    return psg.gameId;
  }

  async retrieve(gameId: GameId): Promise<PersistedGameState | null> {
    const selectSQL = "SELECT state FROM game_states WHERE id = ?";
    const row = this.db.prepare(selectSQL).get(gameId) as { state: string } | undefined;

    if (row) {
      const gameState = JSON.parse(row.state) as PersistedGameState;
      // Convert date strings back to Date objects
      if (gameState.deckProvenance?.retrievedDate) {
        gameState.deckProvenance.retrievedDate = new Date(gameState.deckProvenance.retrievedDate);
      }
      return gameState;
    }
    return null;
  }

  newGameId(): GameId {
    const exists = (candidate: string): boolean => {
      const row = this.db.prepare("SELECT 1 FROM game_states WHERE id = ?").get(candidate);
      return row !== undefined;
    };
    return generateUniqueGameId(exists);
  }

  async getAllGames(): Promise<GameHistorySummary[]> {
    const selectSQL = "SELECT id, state, created_at, updated_at FROM game_states ORDER BY created_at DESC";
    const rows = this.db.prepare(selectSQL).all() as Array<{
      id: GameId;
      state: string;
      created_at: string;
      updated_at: string;
    }>;

    return Promise.all(rows.map(async (row) => {
      try {
        const gameState = JSON.parse(row.state) as PersistedGameState;

        // Extract commander scryfallIds
        const commanderIds = gameState.gameCards.filter((gc) => gc.isCommander).map((gc) => gc.scryfallId);

        // Hydrate commander cards to get names
        const commanderCards = await this.cardRepository.getCards(commanderIds);
        const commanders = commanderCards.map(c => c.name);

        // Count actions (events minus "start game" event)
        const actionCount = gameState.events.filter((e) => e.eventName !== "start game").length;

        return {
          gameId: row.id,
          deckName: gameState.deckName,
          commanderNames: commanders,
          actionCount,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
        };
      } catch (parseErr) {
        const attrs = { "game.id": row.id };
        trace.getActiveSpan()?.setAttributes(attrs);
        log.warn("Failed to parse game state row; showing placeholder", attrs, parseErr);
        return {
          gameId: row.id,
          deckName: "Unknown",
          commanderNames: [],
          actionCount: 0,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
        };
      }
    }));
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
