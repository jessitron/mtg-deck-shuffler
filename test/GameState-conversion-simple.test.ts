import { test, expect } from "@jest/globals";
import * as fc from "fast-check";
import { GameState } from "../src/GameState.js";
import { GameStatus, PERSISTED_GAME_STATE_VERSION } from "../src/port-persist-state/types.js";
import { deckWithOneCommander } from "./generators.js";
import { InMemoryCardRepositoryAdapter } from "../src/port-card-repository/InMemoryCardRepositoryAdapter.js";

test("should convert GameState to PersistedGameState and back", async () => {
  await fc.assert(fc.asyncProperty(deckWithOneCommander, fc.integer({ min: 1, max: 999999 }), async (testDeck, gameId) => {
    // Create card repository and save all cards
    const cardRepository = new InMemoryCardRepositoryAdapter();
    await cardRepository.saveCards([...testDeck.cards, ...testDeck.commanders]);

    const originalGameState = GameState.newGame(gameId, 1, 2, testDeck);

    // Convert to persisted format
    const persistedGameState = originalGameState.toPersistedGameState();

    // Verify persisted format has expected structure
    expect(persistedGameState.version).toBe(PERSISTED_GAME_STATE_VERSION);
    expect(persistedGameState.gameId).toBe(gameId);
    expect(persistedGameState.status).toBe(GameStatus.Active);
    expect(persistedGameState.deckName).toBe(testDeck.name);
    expect(persistedGameState.deckId).toBe(testDeck.id);
    expect(persistedGameState.totalCards).toBe(testDeck.cards.length + testDeck.commanders.length);
    const commanderCards = persistedGameState.gameCards.filter(gc => gc.isCommander);
    expect(commanderCards.length).toBe(1);
    // PersistedGameCard only has scryfallId, not full card
    expect(commanderCards[0].scryfallId).toBe(testDeck.commanders[0].scryfallId);
    expect(persistedGameState.gameCards.length).toBe(testDeck.cards.length + testDeck.commanders.length);

    // Convert back to GameState
    const restoredGameState = await GameState.fromPersistedGameState(persistedGameState, cardRepository);

    // Verify restored state matches original
    expect(restoredGameState.gameId).toBe(originalGameState.gameId);
    expect(restoredGameState.gameStatus()).toBe(originalGameState.gameStatus());
    expect(restoredGameState.deckName).toBe(originalGameState.deckName);
    expect(restoredGameState.deckId).toBe(originalGameState.deckId);
    expect(restoredGameState.totalCards).toBe(originalGameState.totalCards);
    expect(restoredGameState.listCommanders().map(gc => gc.card)).toEqual(originalGameState.listCommanders().map(gc => gc.card));
    expect(restoredGameState.getCards()).toEqual(originalGameState.getCards());
    expect(restoredGameState.deckProvenance).toEqual(originalGameState.deckProvenance);
  }));
});
