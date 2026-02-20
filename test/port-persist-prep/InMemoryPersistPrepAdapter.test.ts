import { InMemoryPersistPrepAdapter } from "../../src/port-persist-prep/InMemoryPersistPrepAdapter.js";
import { PersistedGamePrep } from "../../src/port-persist-prep/types.js";
import * as fc from "fast-check";
import { deckWithOneCommander } from "../generators.js";
import { InMemoryCardRepositoryAdapter } from "../../src/port-card-repository/InMemoryCardRepositoryAdapter.js";
import { CardRepositoryPort } from "../../src/port-card-repository/types.js";

describe("InMemoryPersistPrepAdapter", () => {
  let adapter: InMemoryPersistPrepAdapter;
  let cardRepository: CardRepositoryPort;
  let testPrep: PersistedGamePrep;

  beforeEach(async () => {
    cardRepository = new InMemoryCardRepositoryAdapter();
    adapter = new InMemoryPersistPrepAdapter(cardRepository);

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
});
