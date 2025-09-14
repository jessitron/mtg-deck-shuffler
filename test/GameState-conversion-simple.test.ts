import { test, expect } from "@jest/globals";
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
  const originalGameState = GameState.newGame(gameId, testDeck);

  // Convert to persisted format
  const persistedGameState = originalGameState.toPersistedGameState();

  // Verify persisted format has expected structure
  expect(persistedGameState.version).toBe(PERSISTED_GAME_STATE_VERSION);
  expect(persistedGameState.gameId).toBe(gameId);
  expect(persistedGameState.status).toBe(GameStatus.NotStarted);
  expect(persistedGameState.deckName).toBe("Test Deck");
  expect(persistedGameState.deckId).toBe(123);
  expect(persistedGameState.totalCards).toBe(3);
  expect(persistedGameState.commanders.length).toBe(1);
  expect(persistedGameState.commanders[0].name).toBe("Test Commander");
  expect(persistedGameState.gameCards.length).toBe(3);

  // Convert back to GameState
  const restoredGameState = GameState.fromPersistedGameState(persistedGameState);

  // Verify restored state matches original
  expect(restoredGameState.gameId).toBe(originalGameState.gameId);
  expect(restoredGameState.gameStatus()).toBe(originalGameState.gameStatus());
  expect(restoredGameState.deckName).toBe(originalGameState.deckName);
  expect(restoredGameState.deckId).toBe(originalGameState.deckId);
  expect(restoredGameState.totalCards).toBe(originalGameState.totalCards);
  expect(restoredGameState.commanders).toEqual(originalGameState.commanders);
  expect(restoredGameState.getCards()).toEqual(originalGameState.getCards());
  expect(restoredGameState.deckProvenance).toEqual(originalGameState.deckProvenance);
});
