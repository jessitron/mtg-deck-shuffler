import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { GameState } from "../src/GameState.js";
import { formatGamePageHtml } from "../src/view/review-deck-view.js";
import { formatGameHtml } from "../src/view/active-game-view.js";
import { CardDefinition, Deck, DeckProvenance } from "../src/types.js";

describe("Server routing bug", () => {
  const fakeProvenance: DeckProvenance = {
    retrievedDate: new Date("2023-01-01"),
    sourceUrl: "https://example.com/deck/123",
    deckSource: "test",
  };

  const fakeCard: CardDefinition = {
    name: "Lightning Bolt",
    scryfallId: "abc123",
    multiverseid: 12345,
  };

  const fakeDeck: Deck = {
    id: 123,
    name: "Test Deck",
    totalCards: 1,
    commanders: [],
    cards: [fakeCard],
    provenance: fakeProvenance,
  };

  test("formatGamePageHtml always shows deck review", () => {
    // Create a game and start it (status becomes "Active")
    const game = new GameState(1, fakeDeck);
    game.startGame();
    
    // Verify the game is Active
    assert.strictEqual(game.status, "Active");
    
    // formatGamePageHtml should show deck review regardless of status
    const reviewHtml = formatGamePageHtml(game);
    
    // It should contain the "Shuffle Up" button (only shown in deck review)
    assert(reviewHtml.includes("Shuffle Up"), "formatGamePageHtml should show deck review with Shuffle Up button even for active games");
    
    // It should NOT contain the hand section (only shown in active game)
    assert(!reviewHtml.includes('id="hand-section"'), "formatGamePageHtml should NOT show active game hand section");
  });

  test("formatGameHtml correctly shows active game view for active games", () => {
    // Create a game and start it (status becomes "Active")
    const game = new GameState(1, fakeDeck);
    game.startGame();
    
    // Verify the game is Active
    assert.strictEqual(game.status, "Active");
    
    // formatGameHtml should show active game view for Active games
    const activeHtml = formatGameHtml(game);
    
    // It should contain the hand section (only shown in active game)
    assert(activeHtml.includes('id="hand-section"'), "formatGameHtml should show active game with hand section");
    
    // It should NOT contain the "Shuffle Up" button (only shown in deck review)
    assert(!activeHtml.includes("Shuffle Up"), "formatGameHtml should NOT show Shuffle Up button for active games");
  });

  test("formatGameHtml correctly shows deck review for non-started games", () => {
    // Create a game but don't start it (status remains "NotStarted")
    const game = new GameState(1, fakeDeck);
    
    // Verify the game is NotStarted
    assert.strictEqual(game.status, "NotStarted");
    
    // formatGameHtml should show deck review for NotStarted games
    const reviewHtml = formatGameHtml(game);
    
    // It should contain the "Shuffle Up" button (only shown in deck review)
    assert(reviewHtml.includes("Shuffle Up"), "formatGameHtml should show deck review with Shuffle Up button for not-started games");
    
    // It should NOT contain the hand section (only shown in active game)
    assert(!reviewHtml.includes('id="hand-section"'), "formatGameHtml should NOT show active game hand section for not-started games");
  });
});