import { SqliteCardRepositoryAdapter } from "../../src/port-card-repository/SqliteCardRepositoryAdapter.js";
import { CardDefinition } from "../../src/types.js";
import fs from "node:fs";
import path from "node:path";
import * as fc from "fast-check";
import { cardDefinition } from "../generators.js";

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

    const retrieved = await adapter.getCard(testCard.scryfallId);

    expect(retrieved).not.toBe(null);
    expect(retrieved).toEqual(testCard);
  });

  it("should return null for non-existent card", async () => {
    const retrieved = await adapter.getCard("non-existent-scryfall-id");
    expect(retrieved).toBe(null);
  });

  it("should save and retrieve multiple cards", async () => {
    const testCards = fc.sample(cardDefinition, { numRuns: 5 });

    await adapter.saveCards(testCards);

    const scryfallIds = testCards.map((c) => c.scryfallId);
    const retrieved = await adapter.getCards(scryfallIds);

    expect(retrieved.length).toBe(testCards.length);
    
    // Sort both arrays by scryfallId for comparison
    const sortedRetrieved = retrieved.sort((a, b) => a.scryfallId.localeCompare(b.scryfallId));
    const sortedTestCards = testCards.sort((a, b) => a.scryfallId.localeCompare(b.scryfallId));
    
    expect(sortedRetrieved).toEqual(sortedTestCards);
  });

  it("should upsert cards (update existing cards)", async () => {
    const testCard: CardDefinition = {
      name: "Lightning Bolt",
      scryfallId: "test-scryfall-id",
      multiverseid: 12345,
      twoFaced: false,
      oracleCardName: "Lightning Bolt",
      colorIdentity: ["R"],
      set: "LEA",
      types: ["Instant"],
      manaCost: "{R}",
      cmc: 1,
      oracleText: "Lightning Bolt deals 3 damage to any target.",
    };

    // Save the card
    await adapter.saveCards([testCard]);

    // Update the card with different data
    const updatedCard: CardDefinition = {
      ...testCard,
      name: "Lightning Bolt (Updated)",
      oracleText: "Updated text",
    };

    await adapter.saveCards([updatedCard]);

    // Retrieve and verify it was updated
    const retrieved = await adapter.getCard(testCard.scryfallId);

    expect(retrieved).not.toBe(null);
    expect(retrieved?.name).toBe("Lightning Bolt (Updated)");
    expect(retrieved?.oracleText).toBe("Updated text");
  });

  it("should handle cards with optional fields", async () => {
    const cardWithoutOptionals: CardDefinition = {
      name: "Test Card",
      scryfallId: "test-id-no-optionals",
      multiverseid: 99999,
      twoFaced: false,
      oracleCardName: "Test Card",
      colorIdentity: [],
      set: "TST",
      types: ["Creature"],
      cmc: 0,
      // manaCost and oracleText are undefined
    };

    await adapter.saveCards([cardWithoutOptionals]);

    const retrieved = await adapter.getCard(cardWithoutOptionals.scryfallId);

    expect(retrieved).not.toBe(null);
    expect(retrieved?.manaCost).toBeUndefined();
    expect(retrieved?.oracleText).toBeUndefined();
  });

  it("should return empty array when getting cards with empty array", async () => {
    const retrieved = await adapter.getCards([]);
    expect(retrieved).toEqual([]);
  });

  it("should return only found cards when some IDs don't exist", async () => {
    const testCard = fc.sample(cardDefinition, { numRuns: 1 })[0];

    await adapter.saveCards([testCard]);

    const retrieved = await adapter.getCards([testCard.scryfallId, "non-existent-id-1", "non-existent-id-2"]);

    expect(retrieved.length).toBe(1);
    expect(retrieved[0]).toEqual(testCard);
  });

  it("should handle saving many cards in a transaction", async () => {
    const testCards = fc.sample(cardDefinition, { numRuns: 100 });

    await adapter.saveCards(testCards);

    const scryfallIds = testCards.map((c) => c.scryfallId);
    const retrieved = await adapter.getCards(scryfallIds);

    expect(retrieved.length).toBe(testCards.length);
  });
});

