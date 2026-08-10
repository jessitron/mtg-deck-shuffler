import { SqlitePersistStateAdapter } from "../../src/port-persist-state/SqlitePersistStateAdapter.js";
import { PersistedGameState, PERSISTED_GAME_STATE_VERSION } from "../../src/port-persist-state/types.js";
import { GameStatus } from "../../src/GameState.js";
import fs from "node:fs";
import path from "node:path";
import * as fc from "fast-check";
import { deckWithOneCommander, createTestPersistedGameState } from "../generators.js";
import { ShuffleEvent } from "../../src/GameEvents.js";
import { SqliteCardRepositoryAdapter } from "../../src/port-card-repository/SqliteCardRepositoryAdapter.js";
import { CardRepositoryPort } from "../../src/port-card-repository/types.js";
import { GAME_ID_WORD_FORMAT } from "../../src/gameIdGenerator.js";
import Database from "better-sqlite3";

describe("SqlitePersistStateAdapter", () => {
  let adapter: SqlitePersistStateAdapter;
  let cardRepository: CardRepositoryPort;
  let testGameState: PersistedGameState;
  let testDbPath: string;

  beforeEach(async () => {
    // Create a unique test database file
    testDbPath = path.join(process.cwd(), `test-${Date.now()}-${Math.random()}.db`);
    cardRepository = new SqliteCardRepositoryAdapter(testDbPath);
    adapter = new SqlitePersistStateAdapter(testDbPath, cardRepository);
    await adapter.waitForInitialization();

    // Use generator to create test deck, then convert to PersistedGameState
    const testDeck = fc.sample(deckWithOneCommander, { numRuns: 1 })[0];

    // Save all cards to the repository so they can be hydrated later
    await cardRepository.saveCards([...testDeck.cards, ...testDeck.commanders]);

    testGameState = createTestPersistedGameState(1, testDeck, GameStatus.Active);
  });

  afterEach(async () => {
    // Clean up: close database and remove test file
    await adapter.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it("should generate fun word-combo game IDs, not sequential numbers", () => {
    const id1 = adapter.newGameId();
    const id2 = adapter.newGameId();
    const id3 = adapter.newGameId();

    // Not derivable from one another the way sequential integers are.
    expect(id1).not.toBe(id2);
    expect(id2).not.toBe(id3);
    for (const id of [id1, id2, id3]) {
      expect(typeof id).toBe("string");
      expect(id as string).toMatch(GAME_ID_WORD_FORMAT);
    }
  });

  it("should save and retrieve a game with a word-combo id (new format)", async () => {
    const wordIdGameState: PersistedGameState = {
      ...testGameState,
      gameId: "brave-falcon-42",
    };

    const gameId = await adapter.save(wordIdGameState);
    expect(gameId).toBe("brave-falcon-42");

    const retrieved = await adapter.retrieve("brave-falcon-42");
    expect(retrieved).toEqual(wordIdGameState);
  });

  it("should load a game saved by old code with a plain numeric id, from a database created with the old INTEGER PRIMARY KEY schema", async () => {
    // Simulate a pre-existing data.db: build the table the way the OLD code did
    // (id INTEGER PRIMARY KEY), insert a numeric-id game directly, close it, then
    // open it with the current adapter and confirm the migration it runs on
    // startup doesn't break loading that old game.
    await adapter.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    const oldGameState: PersistedGameState = { ...testGameState, gameId: 47 };
    const legacyDb = new Database(testDbPath);
    legacyDb.exec(`
      CREATE TABLE game_states (
        id INTEGER PRIMARY KEY,
        state TEXT NOT NULL,
        version INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    legacyDb.prepare("INSERT INTO game_states (id, state, version) VALUES (?, ?, ?)").run(47, JSON.stringify(oldGameState), oldGameState.version);
    legacyDb.close();

    const migratedAdapter = new SqlitePersistStateAdapter(testDbPath, cardRepository);
    await migratedAdapter.waitForInitialization();

    try {
      const retrieved = await migratedAdapter.retrieve(47);
      expect(retrieved).toEqual(oldGameState);

      // And the migrated database accepts new word-combo ids too.
      const newId = migratedAdapter.newGameId();
      expect(newId as string).toMatch(GAME_ID_WORD_FORMAT);
      await migratedAdapter.save({ ...testGameState, gameId: newId });
      expect(await migratedAdapter.retrieve(newId)).toEqual({ ...testGameState, gameId: newId });
    } finally {
      await migratedAdapter.close();
    }
  });

  it("should save and retrieve game state", async () => {
    const gameId = await adapter.save(testGameState);

    expect(gameId).toBe(testGameState.gameId);

    const retrieved = await adapter.retrieve(gameId);

    expect(retrieved).not.toBe(null);
    expect(retrieved).toEqual(testGameState);
    expect(retrieved).not.toBe(testGameState); // Should be a copy
  });

  it("should return null for non-existent game ID", async () => {
    const retrieved = await adapter.retrieve(999);
    expect(retrieved).toBe(null);
  });

  it("should store multiple game states independently", async () => {
    const gameState2: PersistedGameState = {
      ...testGameState,
      gameId: 2,
      deckName: "Second Deck",
    };

    await adapter.save(testGameState);
    await adapter.save(gameState2);

    const retrieved1 = await adapter.retrieve(1);
    const retrieved2 = await adapter.retrieve(2);

    expect(retrieved1?.deckName).toEqual(testGameState.deckName);
    expect(retrieved2?.deckName).toEqual("Second Deck");
  });

  it("should update existing game state when saving with same ID", async () => {
    await adapter.save(testGameState);

    const updatedGameState: PersistedGameState = {
      ...testGameState,
      status: GameStatus.Active,
      deckName: "Updated Deck Name",
    };

    await adapter.save(updatedGameState);

    const retrieved = await adapter.retrieve(testGameState.gameId);

    expect(retrieved?.status).toBe(GameStatus.Active);
    expect(retrieved?.deckName).toBe("Updated Deck Name");
  });

  it("should handle date serialization correctly", async () => {
    const testDate = new Date("2023-06-15T10:30:00.000Z");
    const gameStateWithDate: PersistedGameState = {
      ...testGameState,
      deckProvenance: {
        ...testGameState.deckProvenance,
        retrievedDate: testDate,
      },
    };

    await adapter.save(gameStateWithDate);
    const retrieved = await adapter.retrieve(gameStateWithDate.gameId);

    expect(retrieved).not.toBe(null);
    expect(new Date(retrieved!.deckProvenance.retrievedDate)).toEqual(testDate);
  });

  it("should persist data across adapter instances", async () => {
    // Save with first adapter instance
    await adapter.save(testGameState);
    await adapter.close();

    // Create new adapter instance with same database file (reuse same cardRepository)
    const adapter2 = new SqlitePersistStateAdapter(testDbPath, cardRepository);
    await adapter2.waitForInitialization();

    try {
      const retrieved = await adapter2.retrieve(testGameState.gameId);
      expect(retrieved).toEqual(testGameState);
    } finally {
      await adapter2.close();
    }
  });

  it("should persist gameEventIndex in events", async () => {
    const gameStateWithEvents: PersistedGameState = {
      ...testGameState,
      events: [
        {
          eventName: "start game",
          gameEventIndex: 0,
        },
        {
          eventName: "shuffle library",
          gameEventIndex: 1,
          compactMoves: [
            [1, 0, 1],
            [2, 1, 0],
          ],
        },
      ],
    };

    await adapter.save(gameStateWithEvents);
    const retrieved = await adapter.retrieve(gameStateWithEvents.gameId);

    expect(retrieved?.events).toHaveLength(2);
    expect(retrieved?.events[0].gameEventIndex).toBe(0);
    expect(retrieved?.events[1].gameEventIndex).toBe(1);
    expect((retrieved?.events[1] as ShuffleEvent).compactMoves).toEqual((gameStateWithEvents.events[1] as ShuffleEvent).compactMoves);
  });
});
