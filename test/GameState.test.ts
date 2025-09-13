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
    scryfallId: "abc123",
    multiverseid: 12345,
  };

  const fakeCard2: CardDefinition = {
    name: "Ancestral Recall",
    scryfallId: "def456",
    multiverseid: 67890,
  };

  const fakeCard3: CardDefinition = {
    name: "Black Lotus",
    scryfallId: "ghi789",
    multiverseid: 11111,
  };

  const fakeCommander: CardDefinition = {
    name: "Atraxa, Praetors' Voice",
    scryfallId: "cmd001",
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

    const state = GameState.newGame(1, fakeDeck);
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

    const state = GameState.newGame(1, fakeDeck);
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

    const state = GameState.newGame(1, fakeDeck);
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

    const state = GameState.newGame(1, fakeDeck);
    assert.strictEqual(state.commanders.length, 1);
    assert.deepStrictEqual(state.commanders[0], fakeCommander);
  });

  test("allows two commanders", () => {
    const commander2: CardDefinition = { name: "Partner Commander", scryfallId: "cmd002", multiverseid: 33333 };
    const fakeDeck: Deck = {
      id: 1,
      name: "Test Deck",
      totalCards: 1,
      commanders: [fakeCommander, commander2],
      cards: [fakeCard1],
      provenance: fakeProvenance,
    };

    const state = GameState.newGame(1, fakeDeck);
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

    const state = GameState.newGame(1, fakeDeck);
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

    const state = GameState.newGame(1, fakeDeck);
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

    const state1 = GameState.newGame(42, fakeDeck);
    const state2 = GameState.newGame(100, fakeDeck);

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

    const gameState = GameState.newGame(1, deck);

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

    const gameState = GameState.newGame(1, deck);
    const originalOrder = gameState.getCards().map((gc) => gc.card.name);

    gameState.shuffle();

    const cards = gameState.getCards();
    const libraryCards = cards.filter((gc) => gc.location.type === "Library");

    // Same number of cards in library
    assert.strictEqual(libraryCards.length, 3);

    // Positions should still be sequential from 0
    const positions = libraryCards.map((gc) => (gc.location as LibraryLocation).position).sort();
    assert.deepStrictEqual(positions, [0, 1, 2]);

    // Cards should still exist (order might be different)
    const shuffledNames = cards.map((gc) => gc.card.name).sort();
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

    const gameState = GameState.newGame(1, deck);

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
    const libraryCards = cards.filter((gc) => gc.location.type === "Library");
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

    const gameState = GameState.newGame(1, deck);
    assert.strictEqual(gameState.status, GameStatus.NotStarted);

    gameState.startGame();

    assert.strictEqual(gameState.status, GameStatus.Active);

    // Verify shuffle happened - cards should still be in library with valid positions
    const libraryCards = gameState.getCards().filter((gc) => gc.location.type === "Library");
    assert.strictEqual(libraryCards.length, 2);

    const positions = libraryCards.map((gc) => (gc.location as LibraryLocation).position).sort();
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

    const gameState = GameState.newGame(1, deck);
    gameState.startGame();

    assert.throws(() => {
      gameState.startGame();
    }, /Cannot start game: current status is Active/);
  });

  test("draw moves top card from Library to Hand", () => {
    const deck: Deck = {
      id: 1,
      name: "Test Deck",
      totalCards: 3,
      commanders: [],
      cards: [fakeCard1, fakeCard2, fakeCard3], // Lightning Bolt, Ancestral Recall, Black Lotus
      provenance: fakeProvenance,
    };

    const gameState = GameState.newGame(1, deck);

    // Cards are sorted: Ancestral Recall, Black Lotus, Lightning Bolt
    // After construction, they are in Library positions 0, 1, 2 respectively
    const libraryBefore = gameState.listLibrary();
    assert.strictEqual(libraryBefore.length, 3);
    assert.strictEqual(libraryBefore[0].card.name, "Ancestral Recall"); // position 0 (top)

    const handBefore = gameState.listHand();
    assert.strictEqual(handBefore.length, 0);

    gameState.draw();

    // Check library: should have 2 cards now
    const libraryAfter = gameState.listLibrary();
    assert.strictEqual(libraryAfter.length, 2);
    assert.strictEqual(libraryAfter[0].card.name, "Black Lotus"); // position 0 (new top)
    assert.strictEqual(libraryAfter[1].card.name, "Lightning Bolt"); // position 1

    // Check hand: should have 1 card now
    const handAfter = gameState.listHand();
    assert.strictEqual(handAfter.length, 1);
    assert.strictEqual(handAfter[0].card.name, "Ancestral Recall"); // the drawn card
    assert.strictEqual((handAfter[0].location as HandLocation).position, 0);
  });

  test("draw throws error when Library is empty", () => {
    const deck: Deck = {
      id: 1,
      name: "Test Deck",
      totalCards: 1,
      commanders: [],
      cards: [fakeCard1],
      provenance: fakeProvenance,
    };

    const gameState = GameState.newGame(1, deck);

    // Move the only card out of library manually
    const cards = gameState.getCards();
    (cards[0].location as any) = { type: "Hand", position: 0 };

    assert.throws(() => {
      gameState.draw();
    }, /Cannot draw: Library is empty/);
  });

  test("multiple draws position cards correctly in Hand", () => {
    const deck: Deck = {
      id: 1,
      name: "Test Deck",
      totalCards: 3,
      commanders: [],
      cards: [fakeCard1, fakeCard2, fakeCard3], // Lightning Bolt, Ancestral Recall, Black Lotus
      provenance: fakeProvenance,
    };

    const gameState = GameState.newGame(1, deck);

    // Draw first card
    gameState.draw();
    let hand = gameState.listHand();
    assert.strictEqual(hand.length, 1);
    assert.strictEqual(hand[0].card.name, "Ancestral Recall");
    assert.strictEqual((hand[0].location as HandLocation).position, 0);

    // Draw second card
    gameState.draw();
    hand = gameState.listHand();
    assert.strictEqual(hand.length, 2);
    assert.strictEqual(hand[0].card.name, "Ancestral Recall"); // position 0
    assert.strictEqual(hand[1].card.name, "Black Lotus"); // position 1
    assert.strictEqual((hand[1].location as HandLocation).position, 1);

    // Draw third card
    gameState.draw();
    hand = gameState.listHand();
    assert.strictEqual(hand.length, 3);
    assert.strictEqual(hand[2].card.name, "Lightning Bolt"); // position 2
    assert.strictEqual((hand[2].location as HandLocation).position, 2);

    // Library should be empty
    const library = gameState.listLibrary();
    assert.strictEqual(library.length, 0);
  });

  test("draw works correctly after shuffle", () => {
    const deck: Deck = {
      id: 1,
      name: "Test Deck",
      totalCards: 3,
      commanders: [],
      cards: [fakeCard1, fakeCard2, fakeCard3],
      provenance: fakeProvenance,
    };

    const gameState = GameState.newGame(1, deck);
    gameState.shuffle();

    const libraryBefore = gameState.listLibrary();
    assert.strictEqual(libraryBefore.length, 3);

    const topCardBefore = libraryBefore[0]; // position 0 after shuffle

    gameState.draw();

    const libraryAfter = gameState.listLibrary();
    const handAfter = gameState.listHand();

    assert.strictEqual(libraryAfter.length, 2);
    assert.strictEqual(handAfter.length, 1);
    assert.strictEqual(handAfter[0].card.name, topCardBefore.card.name);
  });

  test("reveal moves card from Library to Revealed", () => {
    const deck: Deck = {
      id: 1,
      name: "Test Deck",
      totalCards: 3,
      commanders: [],
      cards: [fakeCard1, fakeCard2, fakeCard3], // Lightning Bolt, Ancestral Recall, Black Lotus
      provenance: fakeProvenance,
    };

    const gameState = GameState.newGame(1, deck);

    // Cards are sorted: Ancestral Recall (pos 0), Black Lotus (pos 1), Lightning Bolt (pos 2)
    const libraryBefore = gameState.listLibrary();
    assert.strictEqual(libraryBefore.length, 3);
    assert.strictEqual(libraryBefore[1].card.name, "Black Lotus"); // position 1

    const revealedBefore = gameState.listRevealed();
    assert.strictEqual(revealedBefore.length, 0);

    gameState.reveal(1); // reveal Black Lotus

    // Check library: should have 2 cards now
    const libraryAfter = gameState.listLibrary();
    assert.strictEqual(libraryAfter.length, 2);
    assert.strictEqual(libraryAfter[0].card.name, "Ancestral Recall"); // position 0
    assert.strictEqual(libraryAfter[1].card.name, "Lightning Bolt"); // position 2

    // Check revealed: should have 1 card now
    const revealedAfter = gameState.listRevealed();
    assert.strictEqual(revealedAfter.length, 1);
    assert.strictEqual(revealedAfter[0].card.name, "Black Lotus");
    assert.strictEqual((revealedAfter[0].location as RevealedLocation).position, 0);
  });

  test("reveal throws error when position does not exist in Library", () => {
    const deck: Deck = {
      id: 1,
      name: "Test Deck",
      totalCards: 2,
      commanders: [],
      cards: [fakeCard1, fakeCard2],
      provenance: fakeProvenance,
    };

    const gameState = GameState.newGame(1, deck);

    assert.throws(() => {
      gameState.reveal(5); // position 5 doesn't exist
    }, /No card found at library position 5/);
  });

  test("multiple reveals position cards correctly in Revealed", () => {
    const deck: Deck = {
      id: 1,
      name: "Test Deck",
      totalCards: 3,
      commanders: [],
      cards: [fakeCard1, fakeCard2, fakeCard3], // Lightning Bolt, Ancestral Recall, Black Lotus
      provenance: fakeProvenance,
    };

    const gameState = GameState.newGame(1, deck);

    // Reveal first card (position 0: Ancestral Recall)
    gameState.reveal(0);
    let revealed = gameState.listRevealed();
    assert.strictEqual(revealed.length, 1);
    assert.strictEqual(revealed[0].card.name, "Ancestral Recall");
    assert.strictEqual((revealed[0].location as RevealedLocation).position, 0);

    // Reveal second card (position 1: Black Lotus)
    gameState.reveal(1);
    revealed = gameState.listRevealed();
    assert.strictEqual(revealed.length, 2);
    assert.strictEqual(revealed[0].card.name, "Ancestral Recall"); // position 0
    assert.strictEqual(revealed[1].card.name, "Black Lotus"); // position 1
    assert.strictEqual((revealed[1].location as RevealedLocation).position, 1);

    // Library should have 1 card remaining
    const library = gameState.listLibrary();
    assert.strictEqual(library.length, 1);
    assert.strictEqual(library[0].card.name, "Lightning Bolt");
  });

  test("reveal works with any library position", () => {
    const deck: Deck = {
      id: 1,
      name: "Test Deck",
      totalCards: 3,
      commanders: [],
      cards: [fakeCard1, fakeCard2, fakeCard3],
      provenance: fakeProvenance,
    };

    const gameState = GameState.newGame(1, deck);

    // Reveal the last card first
    gameState.reveal(2); // Lightning Bolt at position 2

    let revealed = gameState.listRevealed();
    assert.strictEqual(revealed.length, 1);
    assert.strictEqual(revealed[0].card.name, "Lightning Bolt");

    // Then reveal the first card
    gameState.reveal(0); // Ancestral Recall at position 0

    revealed = gameState.listRevealed();
    assert.strictEqual(revealed.length, 2);
    assert.strictEqual(revealed[0].card.name, "Lightning Bolt"); // position 0 in revealed
    assert.strictEqual(revealed[1].card.name, "Ancestral Recall"); // position 1 in revealed

    // Library should have 1 card remaining
    const library = gameState.listLibrary();
    assert.strictEqual(library.length, 1);
    assert.strictEqual(library[0].card.name, "Black Lotus"); // position 1 originally
  });

  test("playCard moves card from hand to table and shifts remaining cards left", () => {
    const deck: Deck = {
      id: 1,
      name: "Test Deck",
      totalCards: 4,
      commanders: [],
      cards: [fakeCard1, fakeCard2, fakeCard3, { name: "Counterspell", scryfallId: "xyz999", multiverseid: 33333 }],
      provenance: fakeProvenance,
    };

    const gameState = GameState.newGame(1, deck);

    // Draw cards to populate hand naturally
    gameState.draw(); // Ancestral Recall to position 0
    gameState.draw(); // Black Lotus to position 1
    gameState.draw(); // Counterspell to position 2
    gameState.draw(); // Lightning Bolt to position 3

    const handBefore = gameState.listHand();
    assert.strictEqual(handBefore.length, 4);
    assert.strictEqual(handBefore[0].card.name, "Ancestral Recall");
    assert.strictEqual(handBefore[1].card.name, "Black Lotus");
    assert.strictEqual(handBefore[2].card.name, "Counterspell");
    assert.strictEqual(handBefore[3].card.name, "Lightning Bolt");

    // Play the second card (Black Lotus at position 1)
    const blackLotusGameCardIndex = handBefore[1].gameCardIndex;
    const whatHappened = gameState.playCard(blackLotusGameCardIndex);

    // Check that the card moved to table
    const tableCards = gameState.listTable();
    assert.strictEqual(tableCards.length, 1);
    assert.strictEqual(tableCards[0].card.name, "Black Lotus");

    // Check that remaining hand cards shifted left
    const handAfter = gameState.listHand();
    assert.strictEqual(handAfter.length, 3);
    assert.strictEqual(handAfter[0].card.name, "Ancestral Recall"); // position 0 unchanged
    assert.strictEqual(handAfter[1].card.name, "Counterspell"); // moved from position 2 to 1
    assert.strictEqual(handAfter[2].card.name, "Lightning Bolt"); // moved from position 3 to 2

    // Check WhatHappened contains the cards that moved left
    assert.strictEqual(whatHappened.movedLeft?.length, 2);
    assert.strictEqual(whatHappened.movedLeft?.[0]?.card.name, "Counterspell");
    assert.strictEqual(whatHappened.movedLeft?.[1]?.card.name, "Lightning Bolt");
  });

  test("playCard moves card from revealed to table and shifts remaining cards left", () => {
    const deck: Deck = {
      id: 1,
      name: "Test Deck",
      totalCards: 4,
      commanders: [],
      cards: [fakeCard1, fakeCard2, fakeCard3, { name: "Counterspell", scryfallId: "xyz999", multiverseid: 33333 }],
      provenance: fakeProvenance,
    };

    const gameState = GameState.newGame(1, deck);

    // Reveal cards to populate revealed zone using revealByGameCardIndex
    const libraryCards = gameState.listLibrary();
    gameState.revealByGameCardIndex(libraryCards[0].gameCardIndex); // Ancestral Recall to revealed position 0
    gameState.revealByGameCardIndex(libraryCards[1].gameCardIndex); // Black Lotus to revealed position 1
    gameState.revealByGameCardIndex(libraryCards[2].gameCardIndex); // Counterspell to revealed position 2
    gameState.revealByGameCardIndex(libraryCards[3].gameCardIndex); // Lightning Bolt to revealed position 3

    const revealedBefore = gameState.listRevealed();
    assert.strictEqual(revealedBefore.length, 4);
    // Cards are revealed in order they were revealed
    assert.strictEqual(revealedBefore[0].card.name, "Ancestral Recall");
    assert.strictEqual(revealedBefore[1].card.name, "Black Lotus");
    assert.strictEqual(revealedBefore[2].card.name, "Counterspell");
    assert.strictEqual(revealedBefore[3].card.name, "Lightning Bolt");

    // Play the second card (Black Lotus at position 1)
    const blackLotusGameCardIndex = revealedBefore[1].gameCardIndex;
    const whatHappened = gameState.playCard(blackLotusGameCardIndex);

    // Check that the card moved to table
    const tableCards = gameState.listTable();
    assert.strictEqual(tableCards.length, 1);
    assert.strictEqual(tableCards[0].card.name, "Black Lotus");

    // Check that remaining revealed cards shifted left
    const revealedAfter = gameState.listRevealed();
    assert.strictEqual(revealedAfter.length, 3);
    assert.strictEqual(revealedAfter[0].card.name, "Ancestral Recall"); // position 0 unchanged
    assert.strictEqual(revealedAfter[1].card.name, "Counterspell"); // moved from position 2 to 1
    assert.strictEqual(revealedAfter[2].card.name, "Lightning Bolt"); // moved from position 3 to 2

    // Check WhatHappened contains the cards that moved left
    assert.strictEqual(whatHappened.movedLeft?.length, 2);
    assert.strictEqual(whatHappened.movedLeft?.[0]?.card.name, "Counterspell");
    assert.strictEqual(whatHappened.movedLeft?.[1]?.card.name, "Lightning Bolt");
  });

  test("playCard throws error when card is not in hand or revealed", () => {
    const deck: Deck = {
      id: 1,
      name: "Test Deck",
      totalCards: 2,
      commanders: [],
      cards: [fakeCard1, fakeCard2],
      provenance: fakeProvenance,
    };

    const gameState = GameState.newGame(1, deck);

    // Try to play a card that's still in library
    const libraryCards = gameState.listLibrary();
    const libraryCardIndex = libraryCards[0].gameCardIndex;

    assert.throws(() => {
      gameState.playCard(libraryCardIndex);
    }, /Card at gameCardIndex \d+ is not in hand or revealed/);
  });
});
