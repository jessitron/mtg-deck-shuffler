import { InMemoryPersistPrepAdapter } from "../../src/port-persist-prep/InMemoryPersistPrepAdapter.js";
import { PersistedGamePrep } from "../../src/port-persist-prep/types.js";
import * as fc from "fast-check";
import { deckWithOneCommander } from "../generators.js";

describe("InMemoryPersistPrepAdapter", () => {
  let adapter: InMemoryPersistPrepAdapter;
  let testPrep: PersistedGamePrep;

  beforeEach(() => {
    adapter = new InMemoryPersistPrepAdapter();

    // Use generator to create test deck, then wrap in PersistedGamePrep
    const testDeck = fc.sample(deckWithOneCommander, { numRuns: 1 })[0];
    testPrep = {
      version: 1,
      prepId: 1,
      deck: testDeck,
      createdAt: new Date("2024-01-15T10:00:00.000Z"),
      updatedAt: new Date("2024-01-15T10:00:00.000Z"),
    };
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
    const prep2: PersistedGamePrep = {
      version: 1,
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

  it("should retrieve latest prep by deck ID", async () => {
    const deckId = testPrep.deck.id;

    // Create three preps for the same deck at different times
    const prep1: PersistedGamePrep = {
      ...testPrep,
      prepId: 1,
      createdAt: new Date("2024-01-01T10:00:00.000Z"),
      updatedAt: new Date("2024-01-01T10:00:00.000Z"),
    };

    const prep2: PersistedGamePrep = {
      ...testPrep,
      prepId: 2,
      createdAt: new Date("2024-01-02T10:00:00.000Z"),
      updatedAt: new Date("2024-01-02T10:00:00.000Z"),
    };

    const prep3: PersistedGamePrep = {
      ...testPrep,
      prepId: 3,
      createdAt: new Date("2024-01-03T10:00:00.000Z"),
      updatedAt: new Date("2024-01-03T10:00:00.000Z"),
    };

    // Save in non-chronological order to test sorting
    await adapter.savePrep(prep2);
    await adapter.savePrep(prep1);
    await adapter.savePrep(prep3);

    const latest = await adapter.retrieveLatestPrepByDeck(deckId);

    expect(latest).not.toBe(null);
    expect(latest?.prepId).toBe(3); // Should return the most recently created
    expect(latest?.createdAt).toEqual(new Date("2024-01-03T10:00:00.000Z"));
  });

  it("should return null when no prep exists for deck ID", async () => {
    const latest = await adapter.retrieveLatestPrepByDeck(999999);
    expect(latest).toBe(null);
  });

  it("should handle multiple decks independently", async () => {
    const deck2 = fc.sample(deckWithOneCommander, { numRuns: 1 })[0];
    const prep2: PersistedGamePrep = {
      version: 1,
      prepId: 2,
      deck: { ...deck2, id: testPrep.deck.id + 1 }, // Different deck ID
      createdAt: new Date("2024-01-15T12:00:00.000Z"),
      updatedAt: new Date("2024-01-15T12:00:00.000Z"),
    };

    await adapter.savePrep(testPrep);
    await adapter.savePrep(prep2);

    const latestDeck1 = await adapter.retrieveLatestPrepByDeck(testPrep.deck.id);
    const latestDeck2 = await adapter.retrieveLatestPrepByDeck(prep2.deck.id);

    expect(latestDeck1?.prepId).toBe(testPrep.prepId);
    expect(latestDeck2?.prepId).toBe(prep2.prepId);
  });
});
