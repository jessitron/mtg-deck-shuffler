import { test, describe } from "node:test";
import assert from "node:assert";
import { InMemoryAdapter } from "../../src/port-persist-state/InMemoryAdapter.js";
import { PersistedGameState, StateId } from "../../src/port-persist-state/types.js";
import { GameStatus } from "../../src/GameState.js";
import { Card, DeckProvenance } from "../../src/types.js";

describe("InMemoryAdapter", () => {
  const fakeProvenance: DeckProvenance = {
    retrievedDate: new Date("2023-01-01"),
    sourceUrl: "https://example.com/deck/123",
    deckSource: "test",
  };

  const fakeCard: Card = {
    name: "Lightning Bolt",
    uid: "abc123",
    multiverseid: 12345,
  };

  const fakeCommander: Card = {
    name: "Atraxa, Praetors' Voice",
    uid: "cmd001",
    multiverseid: 22222,
  };

  const createTestPersistedGameState = (gameId: number, stateId?: StateId): PersistedGameState => ({
    gameId,
    stateId: stateId || "test-state-id",
    status: GameStatus.NotStarted,
    deckProvenance: fakeProvenance,
    commanders: [fakeCommander],
    deckName: "Test Deck",
    deckId: 123,
    totalCards: 1,
    gameCards: [{
      card: fakeCard,
      location: { type: "Library", position: 0 }
    }]
  });

  test("save generates a unique stateId and stores the state", async () => {
    const adapter = new InMemoryAdapter();
    const gameState = createTestPersistedGameState(1);
    
    const stateId = await adapter.save(gameState);
    
    assert(typeof stateId === "string");
    assert(stateId.length > 0);
    assert(stateId !== "test-state-id");
  });

  test("save and retrieve work together", async () => {
    const adapter = new InMemoryAdapter();
    const gameState = createTestPersistedGameState(1);
    
    const stateId = await adapter.save(gameState);
    const retrieved = await adapter.retrieve(1, stateId);
    
    assert(retrieved !== null);
    assert.strictEqual(retrieved.gameId, 1);
    assert.strictEqual(retrieved.stateId, stateId);
    assert.strictEqual(retrieved.status, GameStatus.NotStarted);
    assert.deepStrictEqual(retrieved.commanders, [fakeCommander]);
    assert.strictEqual(retrieved.deckName, "Test Deck");
    assert.strictEqual(retrieved.deckId, 123);
    assert.strictEqual(retrieved.totalCards, 1);
    assert.strictEqual(retrieved.gameCards.length, 1);
    assert.deepStrictEqual(retrieved.gameCards[0].card, fakeCard);
    assert.deepStrictEqual(retrieved.gameCards[0].location, { type: "Library", position: 0 });
  });

  test("retrieve returns null for non-existent gameId/stateId combination", async () => {
    const adapter = new InMemoryAdapter();
    
    const retrieved = await adapter.retrieve(999, "non-existent-state-id");
    
    assert.strictEqual(retrieved, null);
  });

  test("retrieve returns null for correct gameId but wrong stateId", async () => {
    const adapter = new InMemoryAdapter();
    const gameState = createTestPersistedGameState(1);
    
    await adapter.save(gameState);
    const retrieved = await adapter.retrieve(1, "wrong-state-id");
    
    assert.strictEqual(retrieved, null);
  });

  test("retrieve returns null for wrong gameId but existing stateId", async () => {
    const adapter = new InMemoryAdapter();
    const gameState = createTestPersistedGameState(1);
    
    const stateId = await adapter.save(gameState);
    const retrieved = await adapter.retrieve(2, stateId);
    
    assert.strictEqual(retrieved, null);
  });

  test("can store multiple states for the same game", async () => {
    const adapter = new InMemoryAdapter();
    const gameState1 = createTestPersistedGameState(1);
    const gameState2 = createTestPersistedGameState(1);
    gameState2.status = GameStatus.Active;
    
    const stateId1 = await adapter.save(gameState1);
    const stateId2 = await adapter.save(gameState2);
    
    assert(stateId1 !== stateId2);
    
    const retrieved1 = await adapter.retrieve(1, stateId1);
    const retrieved2 = await adapter.retrieve(1, stateId2);
    
    assert(retrieved1 !== null);
    assert(retrieved2 !== null);
    assert.strictEqual(retrieved1.status, GameStatus.NotStarted);
    assert.strictEqual(retrieved2.status, GameStatus.Active);
  });

  test("can store states for different games", async () => {
    const adapter = new InMemoryAdapter();
    const gameState1 = createTestPersistedGameState(1);
    const gameState2 = createTestPersistedGameState(2);
    
    const stateId1 = await adapter.save(gameState1);
    const stateId2 = await adapter.save(gameState2);
    
    const retrieved1 = await adapter.retrieve(1, stateId1);
    const retrieved2 = await adapter.retrieve(2, stateId2);
    
    assert(retrieved1 !== null);
    assert(retrieved2 !== null);
    assert.strictEqual(retrieved1.gameId, 1);
    assert.strictEqual(retrieved2.gameId, 2);
  });

  test("newGameId returns incrementing integers", async () => {
    const adapter = new InMemoryAdapter();
    
    const id1 = await adapter.newGameId();
    const id2 = await adapter.newGameId();
    const id3 = await adapter.newGameId();
    
    assert.strictEqual(id1, 1);
    assert.strictEqual(id2, 2);
    assert.strictEqual(id3, 3);
  });

  test("newGameId works independently from save/retrieve operations", async () => {
    const adapter = new InMemoryAdapter();
    const gameState = createTestPersistedGameState(100);
    
    const newId1 = await adapter.newGameId();
    await adapter.save(gameState);
    const newId2 = await adapter.newGameId();
    await adapter.retrieve(100, "some-state-id");
    const newId3 = await adapter.newGameId();
    
    assert.strictEqual(newId1, 1);
    assert.strictEqual(newId2, 2);
    assert.strictEqual(newId3, 3);
  });

  test("save preserves all PersistedGameState properties", async () => {
    const adapter = new InMemoryAdapter();
    const originalState = createTestPersistedGameState(42);
    originalState.status = GameStatus.Ended;
    originalState.deckName = "Complex Deck Name";
    originalState.totalCards = 100;
    originalState.gameCards = [
      { card: fakeCard, location: { type: "Hand", position: 0 } },
      { card: fakeCommander, location: { type: "Table" } },
    ];
    
    const stateId = await adapter.save(originalState);
    const retrieved = await adapter.retrieve(42, stateId);
    
    assert(retrieved !== null);
    assert.strictEqual(retrieved.gameId, originalState.gameId);
    assert.strictEqual(retrieved.stateId, stateId);
    assert.strictEqual(retrieved.status, originalState.status);
    assert.deepStrictEqual(retrieved.deckProvenance, originalState.deckProvenance);
    assert.deepStrictEqual(retrieved.commanders, originalState.commanders);
    assert.strictEqual(retrieved.deckName, originalState.deckName);
    assert.strictEqual(retrieved.deckId, originalState.deckId);
    assert.strictEqual(retrieved.totalCards, originalState.totalCards);
    assert.deepStrictEqual(retrieved.gameCards, originalState.gameCards);
  });
});