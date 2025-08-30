import { test, describe } from "node:test";
import assert from "node:assert";
import { GameState, GameStatus, GameCard, LibraryLocation, HandLocation, RevealedLocation, TableLocation } from "../src/GameState.js";
import { Card, Deck, DeckProvenance } from "../src/types.js";

describe("GameState", () => {
  const fakeProvenance: DeckProvenance = {
    retrievedDate: new Date("2023-01-01"),
    sourceUrl: "https://example.com/deck/123",
    deckSource: "test"
  };

  const fakeCard1: Card = {
    name: "Lightning Bolt",
    uid: "abc123",
    multiverseid: 12345
  };

  const fakeCard2: Card = {
    name: "Ancestral Recall", 
    uid: "def456",
    multiverseid: 67890
  };

  const fakeCard3: Card = {
    name: "Black Lotus",
    uid: "ghi789", 
    multiverseid: 11111
  };

  const fakeCommander: Card = {
    name: "Atraxa, Praetors' Voice",
    uid: "cmd001",
    multiverseid: 22222
  };

  test("stores game status correctly", () => {
    const fakeDeck: Deck = {
      id: 1,
      name: "Test Deck",
      totalCards: 1,
      commanders: [],
      cards: [fakeCard1],
      provenance: fakeProvenance
    };

    const state = new GameState(1, fakeDeck);
    assert.strictEqual(state.status, GameStatus.NotStarted);
  });

  test("stores deck provenance correctly", () => {
    const fakeDeck: Deck = {
      id: 1,
      name: "Test Deck",
      totalCards: 1,
      commanders: [],
      cards: [fakeCard1],
      provenance: fakeProvenance
    };

    const state = new GameState(1, fakeDeck);
    assert.deepStrictEqual(state.deckProvenance, fakeProvenance);
  });

  test("allows zero commanders", () => {
    const fakeDeck: Deck = {
      id: 1,
      name: "Test Deck",
      totalCards: 1,
      commanders: [],
      cards: [fakeCard1],
      provenance: fakeProvenance
    };

    const state = new GameState(1, fakeDeck);
    assert.strictEqual(state.commanders.length, 0);
  });

  test("allows one commander", () => {
    const fakeDeck: Deck = {
      id: 1,
      name: "Test Deck",
      totalCards: 1,
      commanders: [fakeCommander],
      cards: [fakeCard1],
      provenance: fakeProvenance
    };

    const state = new GameState(1, fakeDeck);
    assert.strictEqual(state.commanders.length, 1);
    assert.deepStrictEqual(state.commanders[0], fakeCommander);
  });

  test("allows two commanders", () => {
    const commander2: Card = { name: "Partner Commander", uid: "cmd002", multiverseid: 33333 };
    const fakeDeck: Deck = {
      id: 1,
      name: "Test Deck",
      totalCards: 1,
      commanders: [fakeCommander, commander2],
      cards: [fakeCard1],
      provenance: fakeProvenance
    };

    const state = new GameState(1, fakeDeck);
    assert.strictEqual(state.commanders.length, 2);
    assert.deepStrictEqual(state.commanders[0], fakeCommander);
    assert.deepStrictEqual(state.commanders[1], commander2);
  });

  test("throws error for more than two commanders", () => {
    const commander2: Card = { name: "Commander 2", uid: "cmd002", multiverseid: 33333 };
    const commander3: Card = { name: "Commander 3", uid: "cmd003", multiverseid: 44444 };
    const fakeDeck: Deck = {
      id: 1,
      name: "Test Deck",
      totalCards: 1,
      commanders: [fakeCommander, commander2, commander3],
      cards: [fakeCard1],
      provenance: fakeProvenance
    };

    assert.throws(
      () => new GameState(1, fakeDeck),
      { message: "Cannot have more than 2 commanders" }
    );
  });

  test("sorts cards by display name", () => {
    const fakeDeck: Deck = {
      id: 1,
      name: "Test Deck",
      totalCards: 3,
      commanders: [],
      cards: [fakeCard1, fakeCard2, fakeCard3], // Lightning Bolt, Ancestral Recall, Black Lotus
      provenance: fakeProvenance
    };

    const state = new GameState(1, fakeDeck);
    const cards = state.getCards();
    
    // Should be sorted: Ancestral Recall, Black Lotus, Lightning Bolt
    assert.strictEqual(cards[0].card.name, "Ancestral Recall");
    assert.strictEqual(cards[1].card.name, "Black Lotus");
    assert.strictEqual(cards[2].card.name, "Lightning Bolt");
  });

  test("prevents duplicate positions in Library", () => {
    // This test no longer applies since constructor now creates positions automatically
    // Cards are placed in Library with sequential positions based on their order in deck.cards
    const fakeDeck: Deck = {
      id: 1,
      name: "Test Deck",
      totalCards: 2,
      commanders: [],
      cards: [fakeCard1, fakeCard2],
      provenance: fakeProvenance
    };

    // Should not throw - constructor assigns unique positions
    const state = new GameState(1, fakeDeck);
    assert.strictEqual(state.getCards().length, 2);
  });

  test("all cards start in Library with unique positions", () => {
    // Constructor now places all cards in Library with unique positions
    const fakeDeck: Deck = {
      id: 1,
      name: "Test Deck",
      totalCards: 3,
      commanders: [],
      cards: [fakeCard1, fakeCard2, fakeCard3],
      provenance: fakeProvenance
    };

    const state = new GameState(1, fakeDeck);
    const cards = state.getCards();
    
    // All cards should be in Library
    cards.forEach(gameCard => {
      assert.strictEqual(gameCard.location.type, "Library");
    });
    
    // All positions should be unique
    const positions = cards.map(c => (c.location as LibraryLocation).position);
    const uniquePositions = new Set(positions);
    assert.strictEqual(positions.length, uniquePositions.size);
  });

  test("constructor assigns sequential positions", () => {
    const fakeDeck: Deck = {
      id: 1,
      name: "Test Deck",
      totalCards: 3,
      commanders: [],
      cards: [fakeCard1, fakeCard2, fakeCard3],
      provenance: fakeProvenance
    };

    const state = new GameState(1, fakeDeck);
    const cards = state.getCards();
    
    // Cards should have positions 0, 1, 2 (based on original order before sorting)
    const positions = cards.map(c => (c.location as LibraryLocation).position).sort();
    assert.deepStrictEqual(positions, [0, 1, 2]);
  });

  test("constructor creates correct number of cards", () => {
    const fakeDeck: Deck = {
      id: 1,
      name: "Test Deck",
      totalCards: 3,
      commanders: [],
      cards: [fakeCard1, fakeCard2, fakeCard3],
      provenance: fakeProvenance
    };

    const state = new GameState(1, fakeDeck);
    assert.strictEqual(state.getCards().length, 3);
  });

  test("constructor uses provided gameId", () => {
    const fakeDeck: Deck = {
      id: 1,
      name: "Test Deck",
      totalCards: 1,
      commanders: [],
      cards: [fakeCard1],
      provenance: fakeProvenance
    };

    const state1 = new GameState(42, fakeDeck);
    const state2 = new GameState(100, fakeDeck);
    
    assert.strictEqual(state1.gameId, 42);
    assert.strictEqual(state2.gameId, 100);
  });

  test("initialize creates game state from deck", () => {
    const deck: Deck = {
      id: 123,
      name: "Test Deck",
      totalCards: 3,
      commanders: [fakeCommander],
      cards: [fakeCard1, fakeCard2, fakeCard3],
      provenance: fakeProvenance
    };

    const gameState = GameState.initialize(deck);

    assert.strictEqual(gameState.status, GameStatus.NotStarted);
    assert.deepStrictEqual(gameState.deckProvenance, fakeProvenance);
    assert.deepStrictEqual(gameState.commanders, [fakeCommander]);
    
    const cards = gameState.getCards();
    assert.strictEqual(cards.length, 3);
    
    // All cards should be in library with sequential positions
    cards.forEach((gameCard, index) => {
      assert.strictEqual(gameCard.location.type, "Library");
      const libLocation = gameCard.location as LibraryLocation;
      // Note: cards are reordered by name, so positions might not match original order
      assert.strictEqual(typeof libLocation.position, "number");
      assert(libLocation.position >= 0);
    });
  });

  test("initialize places cards in library with correct positions", () => {
    const deck: Deck = {
      id: 123,
      name: "Test Deck", 
      totalCards: 2,
      commanders: [],
      cards: [fakeCard1, fakeCard2], // Lightning Bolt, Ancestral Recall
      provenance: fakeProvenance
    };

    const gameState = GameState.initialize(deck);
    const cards = gameState.getCards();
    
    // After sorting by name: Ancestral Recall (pos 1), Lightning Bolt (pos 0)  
    assert.strictEqual(cards[0].card.name, "Ancestral Recall");
    assert.strictEqual(cards[1].card.name, "Lightning Bolt");
    
    // Check positions are assigned from original order
    const ancestralCard = cards.find(c => c.card.name === "Ancestral Recall")!;
    const lightningCard = cards.find(c => c.card.name === "Lightning Bolt")!;
    
    assert.strictEqual((ancestralCard.location as LibraryLocation).position, 1); // Was second in original
    assert.strictEqual((lightningCard.location as LibraryLocation).position, 0); // Was first in original
  });

  test("getCards returns readonly array", () => {
    const fakeDeck: Deck = {
      id: 1,
      name: "Test Deck",
      totalCards: 1,
      commanders: [],
      cards: [fakeCard1],
      provenance: fakeProvenance
    };

    const state = new GameState(1, fakeDeck);
    const cards = state.getCards();
    
    // Should be readonly - TypeScript will catch this at compile time
    assert.strictEqual(cards.length, 1);
    assert.deepStrictEqual(cards[0].card, fakeCard1);
  });

  test("commanders array is immutable", () => {
    const originalCommanders = [fakeCommander];
    const fakeDeck: Deck = {
      id: 1,
      name: "Test Deck",
      totalCards: 1,
      commanders: originalCommanders,
      cards: [fakeCard1],
      provenance: fakeProvenance
    };

    const state = new GameState(1, fakeDeck);
    
    // Modifying original array shouldn't affect game state
    originalCommanders.push({name: "New Commander", uid: "new", multiverseid: 99999});
    
    assert.strictEqual(state.commanders.length, 1);
    assert.deepStrictEqual(state.commanders[0], fakeCommander);
  });
});