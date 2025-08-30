import { test } from "node:test";
import { strict as assert } from "node:assert";
import { InMemoryAdapter } from "./InMemoryAdapter.js";
import { SqliteAdapter } from "./SqliteAdapter.js";
import { GameState, GameStatus } from "../GameState.js";
import { gameStateToPersistedGameState } from "./gameStateHelpers.js";
import { Deck } from "../types.js";

const testDeck: Deck = {
  id: 1,
  name: "Test Deck",
  totalCards: 3,
  commanders: [
    { name: "Commander", uid: "cmd-123", multiverseid: 123 }
  ],
  cards: [
    { name: "Card A", uid: "card-a", multiverseid: 456 },
    { name: "Card B", uid: "card-b", multiverseid: 789 },
    { name: "Card C", uid: "card-c", multiverseid: 101 }
  ],
  provenance: {
    retrievedDate: new Date(),
    sourceUrl: "test://deck",
    deckSource: "test"
  }
};

test("InMemoryAdapter saves and retrieves game state", async () => {
  const adapter = new InMemoryAdapter();
  const gameState = new GameState(1, testDeck);
  const persistedState = gameStateToPersistedGameState(gameState);
  
  // Test newGameId
  const gameId = adapter.newGameId();
  assert(gameId.startsWith("game-"));
  
  // Test save
  persistedState.gameId = gameId;
  const stateId = await adapter.save(persistedState);
  assert(stateId.startsWith("state-"));
  
  // Test retrieve
  const retrieved = await adapter.retrieve(gameId, stateId);
  assert.equal(retrieved.gameId, gameId);
  assert.equal(retrieved.deckName, "Test Deck");
  assert.equal(retrieved.gameCards.length, 3);
});

test("InMemoryAdapter throws error for non-existent state", async () => {
  const adapter = new InMemoryAdapter();
  
  await assert.rejects(
    async () => await adapter.retrieve("non-existent", "state-1"),
    /No state found for game/
  );
});

test("SqliteAdapter saves and retrieves game state", async () => {
  const adapter = new SqliteAdapter(":memory:");
  const gameState = new GameState(1, testDeck);
  const persistedState = gameStateToPersistedGameState(gameState);
  
  try {
    // Test newGameId
    const gameId = adapter.newGameId();
    assert(gameId.startsWith("game-"));
    
    // Test save
    persistedState.gameId = gameId;
    const stateId = await adapter.save(persistedState);
    assert(stateId.startsWith("state-"));
    
    // Test retrieve
    const retrieved = await adapter.retrieve(gameId, stateId);
    assert.equal(retrieved.gameId, gameId);
    assert.equal(retrieved.deckName, "Test Deck");
    assert.equal(retrieved.gameCards.length, 3);
  } finally {
    adapter.close();
  }
});

test("SqliteAdapter throws error for non-existent state", async () => {
  const adapter = new SqliteAdapter(":memory:");
  
  try {
    await assert.rejects(
      async () => await adapter.retrieve("non-existent", "state-1"),
      /No state found for game/
    );
  } finally {
    adapter.close();
  }
});

test("gameStateToPersistedGameState converts correctly", () => {
  const gameState = new GameState(42, testDeck);
  const persistedState = gameStateToPersistedGameState(gameState);
  
  assert.equal(persistedState.gameId, "42");
  assert.equal(persistedState.status, GameStatus.NotStarted);
  assert.equal(persistedState.deckName, "Test Deck");
  assert.equal(persistedState.commanders.length, 1);
  assert.equal(persistedState.gameCards.length, 3);
  
  // Check that cards are sorted and have Library locations
  assert.equal(persistedState.gameCards[0].card.name, "Card A");
  assert.equal(persistedState.gameCards[0].location.type, "Library");
  assert.equal(persistedState.gameCards[0].location.position, 0);
});