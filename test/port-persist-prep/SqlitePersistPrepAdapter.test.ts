import { SqlitePersistPrepAdapter } from "../../src/port-persist-prep/SqlitePersistPrepAdapter.js";
import { PersistedGamePrep } from "../../src/port-persist-prep/types.js";
import fs from "node:fs";
import path from "node:path";
import * as fc from "fast-check";
import { deckWithOneCommander } from "../generators.js";
import { SqliteCardRepositoryAdapter } from "../../src/port-card-repository/SqliteCardRepositoryAdapter.js";
import { CardRepositoryPort } from "../../src/port-card-repository/types.js";

describe("SqlitePersistPrepAdapter", () => {
  let adapter: SqlitePersistPrepAdapter;
  let cardRepository: CardRepositoryPort;
  let testPrep: PersistedGamePrep;
  let testDbPath: string;

  beforeEach(async () => {
    // Create a unique test database file
    testDbPath = path.join(process.cwd(), `test-prep-${Date.now()}-${Math.random()}.db`);
    cardRepository = new SqliteCardRepositoryAdapter(testDbPath);
    adapter = new SqlitePersistPrepAdapter(testDbPath, cardRepository);
    await adapter.waitForInitialization();

    // Use generator to create test deck, then wrap in PersistedGamePrep
    const testDeck = fc.sample(deckWithOneCommander, { numRuns: 1 })[0];

    // Save all cards to the repository so they can be hydrated later
    await cardRepository.saveCards([...testDeck.cards, ...testDeck.commanders]);

    testPrep = {
      version: 2,
      prepId: 1,
      deck: testDeck,
      createdAt: new Date("2024-01-15T10:00:00.000Z"),
      updatedAt: new Date("2024-01-15T10:00:00.000Z"),
    };
  });

  afterEach(async () => {
    // Clean up: close database and remove test file
    await adapter.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it("should generate new prep IDs incrementally", () => {
    const id1 = adapter.newPrepId();
    const id2 = adapter.newPrepId();
    const id3 = adapter.newPrepId();

    expect(id1).toBe(1);
    expect(id2).toBe(2);
    expect(id3).toBe(3);
  });

  it("should save and retrieve prep", async () => {
    const prepId = await adapter.savePrep(testPrep);

    expect(prepId).toBe(testPrep.prepId);

    const retrieved = await adapter.retrievePrep(prepId);

    expect(retrieved).not.toBe(null);
    expect(retrieved).toEqual(testPrep);
    expect(retrieved).not.toBe(testPrep); // Should be a copy
  });

  it("should return null for non-existent prep ID", async () => {
    const retrieved = await adapter.retrievePrep(999);
    expect(retrieved).toBe(null);
  });

  it("should store multiple preps independently", async () => {
    const testDeck2 = fc.sample(deckWithOneCommander, { numRuns: 1 })[0];

    // Save cards for second deck to repository
    await cardRepository.saveCards([...testDeck2.cards, ...testDeck2.commanders]);

    const prep2: PersistedGamePrep = {
      version: 2,
      prepId: 2,
      deck: testDeck2,
      createdAt: new Date("2024-01-16T10:00:00.000Z"),
      updatedAt: new Date("2024-01-16T10:00:00.000Z"),
    };

    await adapter.savePrep(testPrep);
    await adapter.savePrep(prep2);

    const retrieved1 = await adapter.retrievePrep(1);
    const retrieved2 = await adapter.retrievePrep(2);

    expect(retrieved1?.deck.name).toEqual(testPrep.deck.name);
    expect(retrieved2?.deck.name).toEqual(testDeck2.name);
  });

  it("should update existing prep when saving with same ID", async () => {
    await adapter.savePrep(testPrep);

    const updatedPrep: PersistedGamePrep = {
      ...testPrep,
      version: 2,
      updatedAt: new Date("2024-01-15T11:00:00.000Z"),
    };

    await adapter.savePrep(updatedPrep);

    const retrieved = await adapter.retrievePrep(testPrep.prepId);

    expect(retrieved?.version).toBe(2);
    expect(retrieved?.updatedAt).toEqual(new Date("2024-01-15T11:00:00.000Z"));
  });

  it("should handle date serialization correctly", async () => {
    const testCreatedDate = new Date("2024-06-15T10:30:00.000Z");
    const testUpdatedDate = new Date("2024-06-15T11:30:00.000Z");
    const testRetrievedDate = new Date("2024-06-14T09:00:00.000Z");

    const prepWithDates: PersistedGamePrep = {
      ...testPrep,
      createdAt: testCreatedDate,
      updatedAt: testUpdatedDate,
      deck: {
        ...testPrep.deck,
        provenance: {
          ...testPrep.deck.provenance,
          retrievedDate: testRetrievedDate,
        },
      },
    };

    await adapter.savePrep(prepWithDates);
    const retrieved = await adapter.retrievePrep(prepWithDates.prepId);

    expect(retrieved).not.toBe(null);
    expect(retrieved!.createdAt).toEqual(testCreatedDate);
    expect(retrieved!.updatedAt).toEqual(testUpdatedDate);
    expect(retrieved!.deck.provenance.retrievedDate).toEqual(testRetrievedDate);
  });

  it("should persist data across adapter instances", async () => {
    // Save with first adapter instance
    await adapter.savePrep(testPrep);
    await adapter.close();

    // Create new adapter instance with same database file (reuse same cardRepository)
    const adapter2 = new SqlitePersistPrepAdapter(testDbPath, cardRepository);
    await adapter2.waitForInitialization();

    try {
      const retrieved = await adapter2.retrievePrep(testPrep.prepId);
      expect(retrieved).toEqual(testPrep);
    } finally {
      await adapter2.close();
    }
  });
});
