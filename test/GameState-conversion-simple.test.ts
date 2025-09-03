import { test } from "node:test";
import { strict as assert } from "node:assert";
import { GameState } from "../src/GameState.js";
import { GameStatus, PERSISTED_GAME_STATE_VERSION } from "../src/port-persist-state/types.js";
import { Deck } from "../src/types.js";

test("should convert GameState to PersistedGameState and back", () => {
  const testDeck: Deck = {
    id: 123,
    name: "Test Deck",
    totalCards: 3,
    commanders: [
      {
        name: "Test Commander",
        scryfallId: "commander-uid",
        multiverseid: 12345,
      },
    ],
    cards: [
      { name: "Card A", scryfallId: "card-a-uid", multiverseid: 11111 },
      { name: "Card B", scryfallId: "card-b-uid", multiverseid: 22222 },
      { name: "Card C", scryfallId: "card-c-uid", multiverseid: 33333 },
    ],
    provenance: {
      retrievedDate: new Date(2023, 0, 1),
      sourceUrl: "https://test.com/deck/123",
      deckSource: "test",
    },
  };

  const gameId = 42;
  const originalGameState = new GameState(gameId, testDeck);

  // Convert to persisted format
  const persistedGameState = originalGameState.toPersistedGameState();

  // Verify persisted format has expected structure
  assert.equal(persistedGameState.version, PERSISTED_GAME_STATE_VERSION);
  assert.equal(persistedGameState.gameId, gameId);
  assert.equal(persistedGameState.status, GameStatus.NotStarted);
  assert.equal(persistedGameState.deckName, "Test Deck");
  assert.equal(persistedGameState.deckId, 123);
  assert.equal(persistedGameState.totalCards, 3);
  assert.equal(persistedGameState.commanders.length, 1);
  assert.equal(persistedGameState.commanders[0].name, "Test Commander");
  assert.equal(persistedGameState.gameCards.length, 3);

  // Convert back to GameState
  const restoredGameState = GameState.fromPersistedGameState(persistedGameState);

  // Verify restored state matches original
  assert.equal(restoredGameState.gameId, originalGameState.gameId);
  assert.equal(restoredGameState.status, originalGameState.status);
  assert.equal(restoredGameState.deckName, originalGameState.deckName);
  assert.equal(restoredGameState.deckId, originalGameState.deckId);
  assert.equal(restoredGameState.totalCards, originalGameState.totalCards);
  assert.deepEqual(restoredGameState.commanders, originalGameState.commanders);
  assert.deepEqual(restoredGameState.getCards(), originalGameState.getCards());
  assert.deepEqual(restoredGameState.deckProvenance, originalGameState.deckProvenance);
});