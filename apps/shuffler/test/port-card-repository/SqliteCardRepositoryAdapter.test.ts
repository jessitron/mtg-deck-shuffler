import { SqliteCardRepositoryAdapter } from "../../src/port-card-repository/SqliteCardRepositoryAdapter.js";
import { CardDefinition } from "../../src/types.js";
import fs from "node:fs";
import path from "node:path";
import * as fc from "fast-check";
import { cardDefinition, nicolBolas } from "../generators.js";

describe("SqliteCardRepositoryAdapter", () => {
  let adapter: SqliteCardRepositoryAdapter;
  let testDbPath: string;

  beforeEach(() => {
    // Create a unique test database file
    testDbPath = path.join(process.cwd(), `test-cards-${Date.now()}-${Math.random()}.db`);
    adapter = new SqliteCardRepositoryAdapter(testDbPath);
  });

  afterEach(() => {
    // Clean up: close database and remove test file
    adapter.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it("should save and retrieve a single card", async () => {
    const testCard = fc.sample(cardDefinition, { numRuns: 1 })[0];

    await adapter.saveCards([testCard]);

    const retrieved = await adapter.getCard(testCard.cardDefinitionId);

    expect(retrieved).not.toBe(null);
    expect(retrieved).toEqual(testCard);
  });

  it("drops a cards table keyed by the old scryfall_id column and starts fresh", async () => {
    adapter.close();
    const Database = (await import("better-sqlite3")).default;
    const oldDbPath = path.join(process.cwd(), `test-cards-old-${Date.now()}-${Math.random()}.db`);
    const oldDb = new Database(oldDbPath);
    oldDb.exec(`CREATE TABLE cards (scryfall_id TEXT PRIMARY KEY, name TEXT NOT NULL, card_types TEXT NOT NULL)`);
    oldDb.prepare(`INSERT INTO cards (scryfall_id, name, card_types) VALUES (?, ?, ?)`).run("old-id", "Old Card", "[]");
    oldDb.close();

    try {
      adapter = new SqliteCardRepositoryAdapter(oldDbPath);
      expect(await adapter.getCard("old-id")).toBe(null);

      const testCard = fc.sample(cardDefinition, { numRuns: 1 })[0];
      await adapter.saveCards([testCard]);
      expect(await adapter.getCard(testCard.cardDefinitionId)).toEqual(testCard);
    } finally {
      adapter.close();
      fs.unlinkSync(oldDbPath);
      adapter = new SqliteCardRepositoryAdapter(testDbPath);
    }
  });

  it("should return null for non-existent card", async () => {
    const retrieved = await adapter.getCard("non-existent-scryfall-id");
    expect(retrieved).toBe(null);
  });

  it("should save and retrieve multiple cards", async () => {
    const testCards = fc.sample(cardDefinition, { numRuns: 5 });

    await adapter.saveCards(testCards);

    const cardDefinitionIds = testCards.map((c) => c.cardDefinitionId);
    const retrieved = await adapter.getCards(cardDefinitionIds);

    expect(retrieved.length).toBe(testCards.length);
    
    // Sort both arrays by cardDefinitionId for comparison
    const sortedRetrieved = retrieved.sort((a, b) => a.cardDefinitionId.localeCompare(b.cardDefinitionId));
    const sortedTestCards = testCards.sort((a, b) => a.cardDefinitionId.localeCompare(b.cardDefinitionId));
    
    expect(sortedRetrieved).toEqual(sortedTestCards);
  });

  it("should upsert cards (update existing cards)", async () => {
    const testCard: CardDefinition = {
      name: "Lightning Bolt",
      cardDefinitionId: "test-scryfall-id",
      multiverseid: 12345,
      twoFaced: false,
      oracleCardName: "Lightning Bolt",
      colorIdentity: ["R"],
      set: "LEA",
      cardTypes: ["Instant"],
    };

    // Save the card
    await adapter.saveCards([testCard]);

    // Update the card with different data
    const updatedCard: CardDefinition = {
      ...testCard,
      name: "Lightning Bolt (Updated)",
      cardTypes: ["Instant", "Tribal"],
    };

    await adapter.saveCards([updatedCard]);

    // Retrieve and verify it was updated
    const retrieved = await adapter.getCard(testCard.cardDefinitionId);

    expect(retrieved).not.toBe(null);
    expect(retrieved?.name).toBe("Lightning Bolt (Updated)");
    expect(retrieved?.cardTypes).toEqual(["Instant", "Tribal"]);
  });

  it("should handle cards with optional fields", async () => {
    const cardWithoutOptionals: CardDefinition = {
      name: "Test Card",
      cardDefinitionId: "test-id-no-optionals",
      twoFaced: false,
      oracleCardName: "Test Card",
      colorIdentity: [],
      set: "TST",
      cardTypes: ["Creature"],
      // multiverseid is undefined
    };

    await adapter.saveCards([cardWithoutOptionals]);

    const retrieved = await adapter.getCard(cardWithoutOptionals.cardDefinitionId);

    expect(retrieved).not.toBe(null);
    expect(retrieved?.multiverseid).toBeUndefined();
    expect(retrieved?.cardTypes).toEqual(["Creature"]);
  });

  it("should return empty array when getting cards with empty array", async () => {
    const retrieved = await adapter.getCards([]);
    expect(retrieved).toEqual([]);
  });

  it("should return only found cards when some IDs don't exist", async () => {
    const testCard = fc.sample(cardDefinition, { numRuns: 1 })[0];

    await adapter.saveCards([testCard]);

    const retrieved = await adapter.getCards([testCard.cardDefinitionId, "non-existent-id-1", "non-existent-id-2"]);

    expect(retrieved.length).toBe(1);
    expect(retrieved[0]).toEqual(testCard);
  });

  it("should save and retrieve a two-faced card with all faces' types", async () => {
    await adapter.saveCards([nicolBolas]);

    const retrieved = await adapter.getCard(nicolBolas.cardDefinitionId);

    expect(retrieved).toEqual(nicolBolas);
    expect(retrieved?.twoFaced).toBe(true);
    expect(retrieved?.cardTypes).toEqual(["Legendary", "Creature", "Planeswalker"]);
  });

  it("should handle saving many cards in a transaction", async () => {
    const testCards = fc.sample(cardDefinition, { numRuns: 100 });

    await adapter.saveCards(testCards);

    const cardDefinitionIds = testCards.map((c) => c.cardDefinitionId);
    const retrieved = await adapter.getCards(cardDefinitionIds);

    expect(retrieved.length).toBe(testCards.length);
  });
});

