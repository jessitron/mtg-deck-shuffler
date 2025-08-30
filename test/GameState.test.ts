import { test, describe } from "node:test";
import assert from "node:assert";
import { GameState } from "../src/GameState.js";
import { GameStatus, GameCard, LibraryLocation, HandLocation, RevealedLocation, TableLocation } from "../src/port-persist-state/types.js";
import { CardDefinition, Deck, DeckProvenance } from "../src/types.js";

describe("GameState", () => {
  const fakeProvenance: DeckProvenance = {
    retrievedDate: new Date("2023-01-01"),
    sourceUrl: "https://example.com/deck/123",
    deckSource: "test",
  };

  const fakeCard1: CardDefinition = {
    name: "Lightning Bolt",
    uid: "abc123",
    multiverseid: 12345,
  };

  const fakeCard2: CardDefinition = {
    name: "Ancestral Recall",
    uid: "def456",
    multiverseid: 67890,
  };

  const fakeCard3: CardDefinition = {
    name: "Black Lotus",
    uid: "ghi789",
    multiverseid: 11111,
  };

  const fakeCommander: CardDefinition = {
    name: "Atraxa, Praetors' Voice",
    uid: "cmd001",
    multiverseid: 22222,
  };

  test("stores game status correctly", () => {
    const fakeDeck: Deck = {
      id: 1,
      name: "Test Deck",
      totalCards: 1,
      commanders: [],
      cards: [fakeCard1],
      provenance: fakeProvenance,
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
      provenance: fakeProvenance,
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
      provenance: fakeProvenance,
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
      provenance: fakeProvenance,
    };

    const state = new GameState(1, fakeDeck);
    assert.strictEqual(state.commanders.length, 1);
    assert.deepStrictEqual(state.commanders[0], fakeCommander);
  });

  test("allows two commanders", () => {
    const commander2: CardDefinition = { name: "Partner Commander", uid: "cmd002", multiverseid: 33333 };
    const fakeDeck: Deck = {
      id: 1,
      name: "Test Deck",
      totalCards: 1,
      commanders: [fakeCommander, commander2],
      cards: [fakeCard1],
      provenance: fakeProvenance,
    };

    const state = new GameState(1, fakeDeck);
    assert.strictEqual(state.commanders.length, 2);
    assert.deepStrictEqual(state.commanders[0], fakeCommander);
    assert.deepStrictEqual(state.commanders[1], commander2);
  });

  test("sorts cards by display name", () => {
    const fakeDeck: Deck = {
      id: 1,
      name: "Test Deck",
      totalCards: 3,
      commanders: [],
      cards: [fakeCard1, fakeCard2, fakeCard3], // Lightning Bolt, Ancestral Recall, Black Lotus
      provenance: fakeProvenance,
    };

    const state = new GameState(1, fakeDeck);
    const cards = state.getCards();

    // Should be sorted: Ancestral Recall, Black Lotus, Lightning Bolt
    assert.strictEqual(cards[0].card.name, "Ancestral Recall");
    assert.strictEqual(cards[1].card.name, "Black Lotus");
    assert.strictEqual(cards[2].card.name, "Lightning Bolt");
  });

  test("constructor creates correct number of cards", () => {
    const fakeDeck: Deck = {
      id: 1,
      name: "Test Deck",
      totalCards: 3,
      commanders: [],
      cards: [fakeCard1, fakeCard2, fakeCard3],
      provenance: fakeProvenance,
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
      provenance: fakeProvenance,
    };

    const state1 = new GameState(42, fakeDeck);
    const state2 = new GameState(100, fakeDeck);

    assert.strictEqual(state1.gameId, 42);
    assert.strictEqual(state2.gameId, 100);
  });

  test("initializes cards in sequential positions in Library", () => {
    const deck: Deck = {
      id: 123,
      name: "Test Deck",
      totalCards: 3,
      commanders: [fakeCommander],
      cards: [fakeCard1, fakeCard2, fakeCard3], // Lightning Bolt, Ancestral Recall, Black Lotus
      provenance: fakeProvenance,
    };

    const gameState = new GameState(1, deck);

    const cards = gameState.getCards();
    assert.strictEqual(cards.length, 3);

    // All cards should be in library with sequential positions
    cards.forEach((gameCard, index) => {
      assert.strictEqual(gameCard.location.type, "Library");
      const libLocation = gameCard.location as LibraryLocation;
      assert(
        libLocation.position === index,
        "Card " + gameCard.card.name + " at index " + index + " should have position " + index + " but has " + libLocation.position
      );
    });
  });

  test("shuffle randomizes Library positions but preserves card count", () => {
    const deck: Deck = {
      id: 1,
      name: "Test Deck",
      totalCards: 3,
      commanders: [],
      cards: [fakeCard1, fakeCard2, fakeCard3],
      provenance: fakeProvenance,
    };

    const gameState = new GameState(1, deck);
    const originalOrder = gameState.getCards().map(gc => gc.card.name);
    
    gameState.shuffle();
    
    const cards = gameState.getCards();
    const libraryCards = cards.filter(gc => gc.location.type === "Library");
    
    // Same number of cards in library
    assert.strictEqual(libraryCards.length, 3);
    
    // Positions should still be sequential from 0
    const positions = libraryCards.map(gc => (gc.location as LibraryLocation).position).sort();
    assert.deepStrictEqual(positions, [0, 1, 2]);
    
    // Cards should still exist (order might be different)
    const shuffledNames = cards.map(gc => gc.card.name).sort();
    const originalNames = originalOrder.sort();
    assert.deepStrictEqual(shuffledNames, originalNames);
  });

  test("shuffle only affects Library cards", () => {
    const deck: Deck = {
      id: 1,
      name: "Test Deck", 
      totalCards: 3,
      commanders: [],
      cards: [fakeCard1, fakeCard2, fakeCard3],
      provenance: fakeProvenance,
    };

    const gameState = new GameState(1, deck);
    
    // Manually move a card to Hand for testing
    const cards = gameState.getCards();
    (cards[0].location as any) = { type: "Hand", position: 0 };
    
    const handCardBefore = cards[0].card.name;
    
    gameState.shuffle();
    
    // Hand card should be unchanged
    assert.strictEqual(cards[0].location.type, "Hand");
    assert.strictEqual((cards[0].location as HandLocation).position, 0);
    assert.strictEqual(cards[0].card.name, handCardBefore);
    
    // Only 2 cards should be in library now
    const libraryCards = cards.filter(gc => gc.location.type === "Library");
    assert.strictEqual(libraryCards.length, 2);
  });

  test("startGame changes status to Active and shuffles", () => {
    const deck: Deck = {
      id: 1,
      name: "Test Deck",
      totalCards: 2,
      commanders: [],
      cards: [fakeCard1, fakeCard2],
      provenance: fakeProvenance,
    };

    const gameState = new GameState(1, deck);
    assert.strictEqual(gameState.status, GameStatus.NotStarted);
    
    gameState.startGame();
    
    assert.strictEqual(gameState.status, GameStatus.Active);
    
    // Verify shuffle happened - cards should still be in library with valid positions
    const libraryCards = gameState.getCards().filter(gc => gc.location.type === "Library");
    assert.strictEqual(libraryCards.length, 2);
    
    const positions = libraryCards.map(gc => (gc.location as LibraryLocation).position).sort();
    assert.deepStrictEqual(positions, [0, 1]);
  });

  test("startGame throws error if game already started", () => {
    const deck: Deck = {
      id: 1,
      name: "Test Deck",
      totalCards: 1,
      commanders: [],
      cards: [fakeCard1],
      provenance: fakeProvenance,
    };

    const gameState = new GameState(1, deck);
    gameState.startGame();
    
    assert.throws(() => {
      gameState.startGame();
    }, /Cannot start game: current status is Active/);
  });
});
