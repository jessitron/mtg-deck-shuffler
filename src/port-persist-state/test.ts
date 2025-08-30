import { test } from "node:test";
import { strict as assert } from "node:assert";
import { GameState, GameStatus } from "../GameState.js";
import { Deck, DeckProvenance } from "../types.js";
import { InMemoryAdapter, SqliteAdapter } from "./index.js";
import fs from "fs";

const createTestDeck = (): Deck => ({
  id: 123,
  name: "Test Deck",
  totalCards: 2,
  commanders: [
    { name: "Commander 1", uid: "cmd1", multiverseid: 1001 }
  ],
  cards: [
    { name: "Card A", uid: "cardA", multiverseid: 2001 },
    { name: "Card B", uid: "cardB", multiverseid: 2002 }
  ],
  provenance: {
    retrievedDate: new Date("2023-01-01"),
    sourceUrl: "test://deck/123",
    deckSource: "test"
  } as DeckProvenance
});

test("InMemoryAdapter - save and retrieve game state", async () => {
  const adapter = new InMemoryAdapter();
  const deck = createTestDeck();
  const gameId = adapter.newGameId();
  const gameState = new GameState(gameId, deck);
  
  const persistedState = gameState.toPersistedState();
  const savedGameId = await adapter.save(persistedState);
  
  assert.equal(savedGameId, gameId);
  
  const retrieved = await adapter.retrieve(gameId);
  assert.notEqual(retrieved, null);
  assert.equal(retrieved!.gameId, gameId);
  assert.equal(retrieved!.deckName, "Test Deck");
  assert.equal(retrieved!.status, GameStatus.NotStarted);
  assert.equal(retrieved!.commanders.length, 1);
  assert.equal(retrieved!.gameCards.length, 2);
});

test("InMemoryAdapter - retrieve non-existent game", async () => {
  const adapter = new InMemoryAdapter();
  const retrieved = await adapter.retrieve(999);
  assert.equal(retrieved, null);
});

test("GameState conversion functions", () => {
  const deck = createTestDeck();
  const gameId = 42;
  const gameState = new GameState(gameId, deck);
  
  const persistedState = gameState.toPersistedState();
  assert.equal(persistedState.gameId, gameId);
  assert.equal(persistedState.deckName, "Test Deck");
  
  const recreatedState = GameState.fromPersistedState(persistedState);
  assert.equal(recreatedState.gameId, gameId);
  assert.equal(recreatedState.deckName, "Test Deck");
  assert.equal(recreatedState.getCards().length, 2);
});

test("SqliteAdapter - save and retrieve game state", async () => {
  const testDbPath = "./test-data.db";
  
  // Clean up any existing test database
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
  
  const adapter = new SqliteAdapter(testDbPath);
  const deck = createTestDeck();
  const gameId = adapter.newGameId();
  const gameState = new GameState(gameId, deck);
  
  const persistedState = gameState.toPersistedState();
  const savedGameId = await adapter.save(persistedState);
  
  assert.equal(savedGameId, gameId);
  
  const retrieved = await adapter.retrieve(gameId);
  assert.notEqual(retrieved, null);
  assert.equal(retrieved!.gameId, gameId);
  assert.equal(retrieved!.deckName, "Test Deck");
  assert.equal(retrieved!.status, GameStatus.NotStarted);
  assert.equal(retrieved!.commanders.length, 1);
  assert.equal(retrieved!.gameCards.length, 2);
  
  adapter.close();
  
  // Clean up test database
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
});

test("SqliteAdapter - retrieve non-existent game", async () => {
  const testDbPath = "./test-data2.db";
  
  // Clean up any existing test database
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
  
  const adapter = new SqliteAdapter(testDbPath);
  const retrieved = await adapter.retrieve(999);
  assert.equal(retrieved, null);
  
  adapter.close();
  
  // Clean up test database
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
});