import { test, describe } from "node:test";
import assert from "node:assert";
import { GameState, GameStatus, GameCard, LibraryLocation, HandLocation, RevealedLocation, TableLocation } from "../src/GameState.js";
import { Card, Deck, DeckProvenance } from "../src/types.js";

describe("GameState", () => {
  const mockProvenance: DeckProvenance = {
    retrievedDate: new Date("2023-01-01"),
    sourceUrl: "https://example.com/deck/123",
    deckSource: "test"
  };

  const mockCard1: Card = {
    name: "Lightning Bolt",
    uid: "abc123",
    multiverseid: 12345
  };

  const mockCard2: Card = {
    name: "Ancestral Recall", 
    uid: "def456",
    multiverseid: 67890
  };

  const mockCard3: Card = {
    name: "Black Lotus",
    uid: "ghi789", 
    multiverseid: 11111
  };

  const mockCommander: Card = {
    name: "Atraxa, Praetors' Voice",
    uid: "cmd001",
    multiverseid: 22222
  };

  test("creates game state with incrementing game ID", () => {
    const gameCards: GameCard[] = [{
      card: mockCard1,
      location: { type: "Library", position: 0 }
    }];

    const state1 = new GameState(GameStatus.NotStarted, mockProvenance, [], gameCards);
    const state2 = new GameState(GameStatus.NotStarted, mockProvenance, [], gameCards);

    assert.strictEqual(state2.gameId, state1.gameId + 1);
  });

  test("stores game status correctly", () => {
    const gameCards: GameCard[] = [{
      card: mockCard1,
      location: { type: "Library", position: 0 }
    }];

    const state = new GameState(GameStatus.Active, mockProvenance, [], gameCards);
    assert.strictEqual(state.status, GameStatus.Active);
  });

  test("stores deck provenance correctly", () => {
    const gameCards: GameCard[] = [{
      card: mockCard1,
      location: { type: "Library", position: 0 }
    }];

    const state = new GameState(GameStatus.NotStarted, mockProvenance, [], gameCards);
    assert.deepStrictEqual(state.deckProvenance, mockProvenance);
  });

  test("allows zero commanders", () => {
    const gameCards: GameCard[] = [{
      card: mockCard1,
      location: { type: "Library", position: 0 }
    }];

    const state = new GameState(GameStatus.NotStarted, mockProvenance, [], gameCards);
    assert.strictEqual(state.commanders.length, 0);
  });

  test("allows one commander", () => {
    const gameCards: GameCard[] = [{
      card: mockCard1,
      location: { type: "Library", position: 0 }
    }];

    const state = new GameState(GameStatus.NotStarted, mockProvenance, [mockCommander], gameCards);
    assert.strictEqual(state.commanders.length, 1);
    assert.deepStrictEqual(state.commanders[0], mockCommander);
  });

  test("allows two commanders", () => {
    const commander2: Card = { name: "Partner Commander", uid: "cmd002", multiverseid: 33333 };
    const gameCards: GameCard[] = [{
      card: mockCard1,
      location: { type: "Library", position: 0 }
    }];

    const state = new GameState(GameStatus.NotStarted, mockProvenance, [mockCommander, commander2], gameCards);
    assert.strictEqual(state.commanders.length, 2);
    assert.deepStrictEqual(state.commanders[0], mockCommander);
    assert.deepStrictEqual(state.commanders[1], commander2);
  });

  test("throws error for more than two commanders", () => {
    const commander2: Card = { name: "Commander 2", uid: "cmd002", multiverseid: 33333 };
    const commander3: Card = { name: "Commander 3", uid: "cmd003", multiverseid: 44444 };
    const gameCards: GameCard[] = [{
      card: mockCard1,
      location: { type: "Library", position: 0 }
    }];

    assert.throws(
      () => new GameState(GameStatus.NotStarted, mockProvenance, [mockCommander, commander2, commander3], gameCards),
      { message: "Cannot have more than 2 commanders" }
    );
  });

  test("sorts cards by display name", () => {
    const gameCards: GameCard[] = [
      { card: mockCard1, location: { type: "Library", position: 0 } }, // Lightning Bolt
      { card: mockCard2, location: { type: "Library", position: 1 } }, // Ancestral Recall
      { card: mockCard3, location: { type: "Library", position: 2 } }  // Black Lotus
    ];

    const state = new GameState(GameStatus.NotStarted, mockProvenance, [], gameCards);
    const cards = state.getCards();
    
    // Should be sorted: Ancestral Recall, Black Lotus, Lightning Bolt
    assert.strictEqual(cards[0].card.name, "Ancestral Recall");
    assert.strictEqual(cards[1].card.name, "Black Lotus");
    assert.strictEqual(cards[2].card.name, "Lightning Bolt");
  });

  test("prevents duplicate positions in Library", () => {
    const gameCards: GameCard[] = [
      { card: mockCard1, location: { type: "Library", position: 0 } },
      { card: mockCard2, location: { type: "Library", position: 0 } } // Duplicate position
    ];

    assert.throws(
      () => new GameState(GameStatus.NotStarted, mockProvenance, [], gameCards),
      { message: "Duplicate position 0 in Library" }
    );
  });

  test("prevents duplicate positions in Hand", () => {
    const gameCards: GameCard[] = [
      { card: mockCard1, location: { type: "Hand", position: 0 } },
      { card: mockCard2, location: { type: "Hand", position: 0 } } // Duplicate position
    ];

    assert.throws(
      () => new GameState(GameStatus.NotStarted, mockProvenance, [], gameCards),
      { message: "Duplicate position 0 in Hand" }
    );
  });

  test("prevents duplicate positions in Revealed", () => {
    const gameCards: GameCard[] = [
      { card: mockCard1, location: { type: "Revealed", position: 1 } },
      { card: mockCard2, location: { type: "Revealed", position: 1 } } // Duplicate position
    ];

    assert.throws(
      () => new GameState(GameStatus.NotStarted, mockProvenance, [], gameCards),
      { message: "Duplicate position 1 in Revealed" }
    );
  });

  test("allows multiple cards on Table", () => {
    const gameCards: GameCard[] = [
      { card: mockCard1, location: { type: "Table" } },
      { card: mockCard2, location: { type: "Table" } },
      { card: mockCard3, location: { type: "Table" } }
    ];

    // Should not throw
    const state = new GameState(GameStatus.NotStarted, mockProvenance, [], gameCards);
    assert.strictEqual(state.getCards().length, 3);
  });

  test("allows same positions across different zones", () => {
    const gameCards: GameCard[] = [
      { card: mockCard1, location: { type: "Library", position: 0 } },
      { card: mockCard2, location: { type: "Hand", position: 0 } },
      { card: mockCard3, location: { type: "Revealed", position: 0 } }
    ];

    // Should not throw - same position is allowed in different zones
    const state = new GameState(GameStatus.NotStarted, mockProvenance, [], gameCards);
    assert.strictEqual(state.getCards().length, 3);
  });

  test("initialize creates game state from deck", () => {
    const deck: Deck = {
      id: 123,
      name: "Test Deck",
      totalCards: 3,
      commanders: [mockCommander],
      cards: [mockCard1, mockCard2, mockCard3],
      provenance: mockProvenance
    };

    const gameState = GameState.initialize(deck);

    assert.strictEqual(gameState.status, GameStatus.NotStarted);
    assert.deepStrictEqual(gameState.deckProvenance, mockProvenance);
    assert.deepStrictEqual(gameState.commanders, [mockCommander]);
    
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
      cards: [mockCard1, mockCard2], // Lightning Bolt, Ancestral Recall
      provenance: mockProvenance
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
    const gameCards: GameCard[] = [{
      card: mockCard1,
      location: { type: "Library", position: 0 }
    }];

    const state = new GameState(GameStatus.NotStarted, mockProvenance, [], gameCards);
    const cards = state.getCards();
    
    // Should be readonly - TypeScript will catch this at compile time
    assert.strictEqual(cards.length, 1);
    assert.deepStrictEqual(cards[0].card, mockCard1);
  });

  test("commanders array is immutable", () => {
    const originalCommanders = [mockCommander];
    const gameCards: GameCard[] = [{
      card: mockCard1,
      location: { type: "Library", position: 0 }
    }];

    const state = new GameState(GameStatus.NotStarted, mockProvenance, originalCommanders, gameCards);
    
    // Modifying original array shouldn't affect game state
    originalCommanders.push({name: "New Commander", uid: "new", multiverseid: 99999});
    
    assert.strictEqual(state.commanders.length, 1);
    assert.deepStrictEqual(state.commanders[0], mockCommander);
  });
});