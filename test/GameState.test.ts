import { test, describe } from "node:test";
import assert from "node:assert";
import { GameState, GameStatus, GameCard, LibraryLocation, HandLocation, RevealedLocation, TableLocation } from "../src/GameState.js";
import { Card, Deck, DeckProvenance } from "../src/types.js";

describe("GameState", () => {
  const fakeProvenance: DeckProvenance = {
    retrievedDate: new Date("2023-01-01"),
    sourceUrl: "https://example.com/deck/123",
    deckSource: "test",
  };

  const fakeCard1: Card = {
    name: "Lightning Bolt",
    uid: "abc123",
    multiverseid: 12345,
  };

  const fakeCard2: Card = {
    name: "Ancestral Recall",
    uid: "def456",
    multiverseid: 67890,
  };

  const fakeCard3: Card = {
    name: "Black Lotus",
    uid: "ghi789",
    multiverseid: 11111,
  };

  const fakeCommander: Card = {
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
    const commander2: Card = { name: "Partner Commander", uid: "cmd002", multiverseid: 33333 };
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

  describe("conversion methods", () => {
    const fakeDeck: Deck = {
      id: 123,
      name: "Test Conversion Deck",
      totalCards: 2,
      commanders: [fakeCommander],
      cards: [fakeCard1, fakeCard2],
      provenance: fakeProvenance,
    };

    test("toPersistedGameState converts GameState correctly", () => {
      const gameState = new GameState(42, fakeDeck);
      const persisted = gameState.toPersistedGameState();

      assert.strictEqual(persisted.gameId, 42);
      assert.strictEqual(persisted.status, GameStatus.NotStarted);
      assert.deepStrictEqual(persisted.deckProvenance, fakeProvenance);
      assert.deepStrictEqual(persisted.commanders, [fakeCommander]);
      assert.strictEqual(persisted.deckName, "Test Conversion Deck");
      assert.strictEqual(persisted.deckId, 123);
      assert.strictEqual(persisted.totalCards, 2);
      assert.strictEqual(persisted.gameCards.length, 2);
      assert(!("stateId" in persisted));

      const cards = gameState.getCards();
      assert.strictEqual(persisted.gameCards.length, cards.length);
      persisted.gameCards.forEach((persistedCard, index) => {
        assert.deepStrictEqual(persistedCard.card, cards[index].card);
        assert.deepStrictEqual(persistedCard.location, cards[index].location);
      });
    });

    test("toPersistedGameState creates independent copy", () => {
      const gameState = new GameState(1, fakeDeck);
      const persisted = gameState.toPersistedGameState();

      assert(persisted.commanders !== gameState.commanders);
      assert.deepStrictEqual(persisted.commanders, gameState.commanders);
      
      persisted.commanders.push(fakeCard1);
      assert.notDeepStrictEqual(persisted.commanders, gameState.commanders);
    });

    test("fromPersistedGameState restores GameState correctly", () => {
      const originalGameState = new GameState(99, fakeDeck);
      const persisted = originalGameState.toPersistedGameState();
      const persistedWithStateId = { ...persisted, stateId: "test-state-123" };
      
      const restoredGameState = GameState.fromPersistedGameState(persistedWithStateId);

      assert.strictEqual(restoredGameState.gameId, 99);
      assert.strictEqual(restoredGameState.status, GameStatus.NotStarted);
      assert.deepStrictEqual(restoredGameState.deckProvenance, fakeProvenance);
      assert.deepStrictEqual(restoredGameState.commanders, [fakeCommander]);
      assert.strictEqual(restoredGameState.deckName, "Test Conversion Deck");
      assert.strictEqual(restoredGameState.deckId, 123);
      assert.strictEqual(restoredGameState.totalCards, 2);

      const originalCards = originalGameState.getCards();
      const restoredCards = restoredGameState.getCards();
      assert.strictEqual(restoredCards.length, originalCards.length);
      
      restoredCards.forEach((restoredCard, index) => {
        assert.deepStrictEqual(restoredCard.card, originalCards[index].card);
        assert.deepStrictEqual(restoredCard.location, originalCards[index].location);
      });
    });

    test("fromPersistedGameState handles different card locations", () => {
      const persistedState = {
        gameId: 1,
        stateId: "test-state",
        status: GameStatus.Active,
        deckProvenance: fakeProvenance,
        commanders: [],
        deckName: "Location Test Deck",
        deckId: 456,
        totalCards: 4,
        gameCards: [
          { card: fakeCard2, location: { type: "Library", position: 0 } as LibraryLocation },
          { card: fakeCommander, location: { type: "Hand", position: 0 } as HandLocation },
          { card: fakeCard3, location: { type: "Revealed", position: 0 } as RevealedLocation },
          { card: fakeCard1, location: { type: "Table" } as TableLocation },
        ]
      };

      const gameState = GameState.fromPersistedGameState(persistedState);
      const cards = gameState.getCards();

      assert.strictEqual(cards.length, 4);
      
      const ancestralRecallCard = cards.find(c => c.card.name === "Ancestral Recall");
      const atraxaCard = cards.find(c => c.card.name === "Atraxa, Praetors' Voice");
      const blackLotusCard = cards.find(c => c.card.name === "Black Lotus");
      const lightningBoltCard = cards.find(c => c.card.name === "Lightning Bolt");
      
      assert(ancestralRecallCard && ancestralRecallCard.location.type === "Library");
      assert.strictEqual((ancestralRecallCard.location as LibraryLocation).position, 0);
      assert(atraxaCard && atraxaCard.location.type === "Hand");
      assert.strictEqual((atraxaCard.location as HandLocation).position, 0);
      assert(blackLotusCard && blackLotusCard.location.type === "Revealed");
      assert.strictEqual((blackLotusCard.location as RevealedLocation).position, 0);
      assert(lightningBoltCard && lightningBoltCard.location.type === "Table");
    });

    test("fromPersistedGameState preserves status correctly", () => {
      const persistedState = {
        gameId: 1,
        stateId: "test-state",
        status: GameStatus.Ended,
        deckProvenance: fakeProvenance,
        commanders: [fakeCommander],
        deckName: "Status Test Deck",
        deckId: 789,
        totalCards: 1,
        gameCards: [{ card: fakeCard1, location: { type: "Table" } as TableLocation }]
      };

      const gameState = GameState.fromPersistedGameState(persistedState);
      assert.strictEqual(gameState.status, GameStatus.Ended);
    });

    test("round trip conversion preserves all data", () => {
      const originalGameState = new GameState(777, fakeDeck);
      const persisted = originalGameState.toPersistedGameState();
      const persistedWithStateId = { ...persisted, stateId: "round-trip-test" };
      const roundTripGameState = GameState.fromPersistedGameState(persistedWithStateId);

      assert.strictEqual(roundTripGameState.gameId, originalGameState.gameId);
      assert.strictEqual(roundTripGameState.status, originalGameState.status);
      assert.deepStrictEqual(roundTripGameState.deckProvenance, originalGameState.deckProvenance);
      assert.deepStrictEqual(roundTripGameState.commanders, originalGameState.commanders);
      assert.strictEqual(roundTripGameState.deckName, originalGameState.deckName);
      assert.strictEqual(roundTripGameState.deckId, originalGameState.deckId);
      assert.strictEqual(roundTripGameState.totalCards, originalGameState.totalCards);

      const originalCards = originalGameState.getCards();
      const roundTripCards = roundTripGameState.getCards();
      assert.strictEqual(roundTripCards.length, originalCards.length);
      
      roundTripCards.forEach((roundTripCard, index) => {
        assert.deepStrictEqual(roundTripCard, originalCards[index]);
      });
    });

    test("fromPersistedGameState validates invariants", () => {
      const invalidPersistedState = {
        gameId: 1,
        stateId: "invalid-state",
        status: GameStatus.Active,
        deckProvenance: fakeProvenance,
        commanders: [],
        deckName: "Invalid Deck",
        deckId: 999,
        totalCards: 2,
        gameCards: [
          { card: fakeCard1, location: { type: "Hand", position: 0 } as HandLocation },
          { card: fakeCard2, location: { type: "Hand", position: 0 } as HandLocation },
        ]
      };

      assert.throws(() => {
        GameState.fromPersistedGameState(invalidPersistedState);
      }, /Duplicate position 0 in Hand/);
    });
  });
});
