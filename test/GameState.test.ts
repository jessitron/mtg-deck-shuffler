import { describe, test, expect } from "@jest/globals";
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
    expect(state.gameStatus()).toBe(GameStatus.NotStarted);
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
    expect(state.deckProvenance).toEqual(fakeProvenance);
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
    expect(state.commanders.length).toBe(0);
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
    expect(state.commanders.length).toBe(1);
    expect(state.commanders[0]).toEqual(fakeCommander);
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
    expect(state.commanders.length).toBe(2);
    expect(state.commanders[0]).toEqual(fakeCommander);
    expect(state.commanders[1]).toEqual(commander2);
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
    expect(cards[0].card.name).toBe("Ancestral Recall");
    expect(cards[1].card.name).toBe("Black Lotus");
    expect(cards[2].card.name).toBe("Lightning Bolt");
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
    expect(state.getCards().length).toBe(3);
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

    expect(state1.gameId).toBe(42);
    expect(state2.gameId).toBe(100);
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
    expect(cards.length).toBe(3);

    // All cards should be in library with sequential positions
    cards.forEach((gameCard, index) => {
      expect(gameCard.location.type).toBe("Library");
      const libLocation = gameCard.location as LibraryLocation;
      expect(libLocation.position === index).toBe(true);
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
    expect(libraryCards.length).toBe(3);

    // Positions should still be sequential from 0
    const positions = libraryCards.map((gc) => (gc.location as LibraryLocation).position).sort();
    expect(positions).toEqual([0, 1, 2]);

    // Cards should still exist (order might be different)
    const shuffledNames = cards.map((gc) => gc.card.name).sort();
    const originalNames = originalOrder.sort();
    expect(shuffledNames).toEqual(originalNames);
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
    expect(cards[0].location.type).toBe("Hand");
    expect((cards[0].location as HandLocation).position).toBe(0);
    expect(cards[0].card.name).toBe(handCardBefore);

    // Only 2 cards should be in library now
    const libraryCards = cards.filter((gc) => gc.location.type === "Library");
    expect(libraryCards.length).toBe(2);
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
    expect(gameState.gameStatus()).toBe(GameStatus.NotStarted);

    gameState.startGame();

    expect(gameState.gameStatus()).toBe(GameStatus.Active);

    // Verify shuffle happened - cards should still be in library with valid positions
    const libraryCards = gameState.getCards().filter((gc) => gc.location.type === "Library");
    expect(libraryCards.length).toBe(2);

    const positions = libraryCards.map((gc) => (gc.location as LibraryLocation).position).sort();
    expect(positions).toEqual([0, 1]);
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

    expect(() => {
      gameState.startGame();
    }).toThrow(/Cannot start game: current status is Active/);
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
    expect(libraryBefore.length).toBe(3);
    expect(libraryBefore[0].card.name).toBe("Ancestral Recall"); // position 0 (top)

    const handBefore = gameState.listHand();
    expect(handBefore.length).toBe(0);

    gameState.draw();

    // Check library: should have 2 cards now
    const libraryAfter = gameState.listLibrary();
    expect(libraryAfter.length).toBe(2);
    expect(libraryAfter[0].card.name).toBe("Black Lotus"); // position 0 (new top)
    expect(libraryAfter[1].card.name).toBe("Lightning Bolt"); // position 1

    // Check hand: should have 1 card now
    const handAfter = gameState.listHand();
    expect(handAfter.length).toBe(1);
    expect(handAfter[0].card.name).toBe("Ancestral Recall"); // the drawn card
    expect((handAfter[0].location as HandLocation).position).toBe(0);
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

    expect(() => {
      gameState.draw();
    }).toThrow(/Cannot draw: Library is empty/);
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
    expect(hand.length).toBe(1);
    expect(hand[0].card.name).toBe("Ancestral Recall");
    expect((hand[0].location as HandLocation).position).toBe(0);

    // Draw second card
    gameState.draw();
    hand = gameState.listHand();
    expect(hand.length).toBe(2);
    expect(hand[0].card.name).toBe("Ancestral Recall"); // position 0
    expect(hand[1].card.name).toBe("Black Lotus"); // position 1
    expect((hand[1].location as HandLocation).position).toBe(1);

    // Draw third card
    gameState.draw();
    hand = gameState.listHand();
    expect(hand.length).toBe(3);
    expect(hand[2].card.name).toBe("Lightning Bolt"); // position 2
    expect((hand[2].location as HandLocation).position).toBe(2);

    // Library should be empty
    const library = gameState.listLibrary();
    expect(library.length).toBe(0);
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
    expect(libraryBefore.length).toBe(3);

    const topCardBefore = libraryBefore[0]; // position 0 after shuffle

    gameState.draw();

    const libraryAfter = gameState.listLibrary();
    const handAfter = gameState.listHand();

    expect(libraryAfter.length).toBe(2);
    expect(handAfter.length).toBe(1);
    expect(handAfter[0].card.name).toBe(topCardBefore.card.name);
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
    expect(libraryBefore.length).toBe(3);
    expect(libraryBefore[1].card.name).toBe("Black Lotus"); // position 1

    const revealedBefore = gameState.listRevealed();
    expect(revealedBefore.length).toBe(0);

    gameState.reveal(1); // reveal Black Lotus

    // Check library: should have 2 cards now
    const libraryAfter = gameState.listLibrary();
    expect(libraryAfter.length).toBe(2);
    expect(libraryAfter[0].card.name).toBe("Ancestral Recall"); // position 0
    expect(libraryAfter[1].card.name).toBe("Lightning Bolt"); // position 2

    // Check revealed: should have 1 card now
    const revealedAfter = gameState.listRevealed();
    expect(revealedAfter.length).toBe(1);
    expect(revealedAfter[0].card.name).toBe("Black Lotus");
    expect((revealedAfter[0].location as RevealedLocation).position).toBe(0);
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

    expect(() => {
      gameState.reveal(5); // position 5 doesn't exist
    }).toThrow(/No card found at library position 5/);
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
    expect(revealed.length).toBe(1);
    expect(revealed[0].card.name).toBe("Ancestral Recall");
    expect((revealed[0].location as RevealedLocation).position).toBe(0);

    // Reveal second card (position 1: Black Lotus)
    gameState.reveal(1);
    revealed = gameState.listRevealed();
    expect(revealed.length).toBe(2);
    expect(revealed[0].card.name).toBe("Ancestral Recall"); // position 0
    expect(revealed[1].card.name).toBe("Black Lotus"); // position 1
    expect((revealed[1].location as RevealedLocation).position).toBe(1);

    // Library should have 1 card remaining
    const library = gameState.listLibrary();
    expect(library.length).toBe(1);
    expect(library[0].card.name).toBe("Lightning Bolt");
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
    expect(revealed.length).toBe(1);
    expect(revealed[0].card.name).toBe("Lightning Bolt");

    // Then reveal the first card
    gameState.reveal(0); // Ancestral Recall at position 0

    revealed = gameState.listRevealed();
    expect(revealed.length).toBe(2);
    expect(revealed[0].card.name).toBe("Lightning Bolt"); // position 0 in revealed
    expect(revealed[1].card.name).toBe("Ancestral Recall"); // position 1 in revealed

    // Library should have 1 card remaining
    const library = gameState.listLibrary();
    expect(library.length).toBe(1);
    expect(library[0].card.name).toBe("Black Lotus"); // position 1 originally
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
    expect(handBefore.length).toBe(4);
    expect(handBefore[0].card.name).toBe("Ancestral Recall");
    expect(handBefore[1].card.name).toBe("Black Lotus");
    expect(handBefore[2].card.name).toBe("Counterspell");
    expect(handBefore[3].card.name).toBe("Lightning Bolt");

    // Play the second card (Black Lotus at position 1)
    const blackLotusGameCardIndex = handBefore[1].gameCardIndex;
    const whatHappened = gameState.playCard(blackLotusGameCardIndex);

    // Check that the card moved to table
    const tableCards = gameState.listTable();
    expect(tableCards.length).toBe(1);
    expect(tableCards[0].card.name).toBe("Black Lotus");

    // Check that remaining hand cards shifted left
    const handAfter = gameState.listHand();
    expect(handAfter.length).toBe(3);
    expect(handAfter[0].card.name).toBe("Ancestral Recall"); // position 0 unchanged
    expect(handAfter[1].card.name).toBe("Counterspell"); // moved from position 2 to 1
    expect(handAfter[2].card.name).toBe("Lightning Bolt"); // moved from position 3 to 2

    // Check WhatHappened contains the cards that moved left
    expect(whatHappened.movedLeft?.length).toBe(2);
    expect(whatHappened.movedLeft?.[0]?.card.name).toBe("Counterspell");
    expect(whatHappened.movedLeft?.[1]?.card.name).toBe("Lightning Bolt");
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
    expect(revealedBefore.length).toBe(4);
    // Cards are revealed in order they were revealed
    expect(revealedBefore[0].card.name).toBe("Ancestral Recall");
    expect(revealedBefore[1].card.name).toBe("Black Lotus");
    expect(revealedBefore[2].card.name).toBe("Counterspell");
    expect(revealedBefore[3].card.name).toBe("Lightning Bolt");

    // Play the second card (Black Lotus at position 1)
    const blackLotusGameCardIndex = revealedBefore[1].gameCardIndex;
    const whatHappened = gameState.playCard(blackLotusGameCardIndex);

    // Check that the card moved to table
    const tableCards = gameState.listTable();
    expect(tableCards.length).toBe(1);
    expect(tableCards[0].card.name).toBe("Black Lotus");

    // Check that remaining revealed cards shifted left
    const revealedAfter = gameState.listRevealed();
    expect(revealedAfter.length).toBe(3);
    expect(revealedAfter[0].card.name).toBe("Ancestral Recall"); // position 0 unchanged
    expect(revealedAfter[1].card.name).toBe("Counterspell"); // moved from position 2 to 1
    expect(revealedAfter[2].card.name).toBe("Lightning Bolt"); // moved from position 3 to 2

    // Check WhatHappened contains the cards that moved left
    expect(whatHappened.movedLeft?.length).toBe(2);
    expect(whatHappened.movedLeft?.[0]?.card.name).toBe("Counterspell");
    expect(whatHappened.movedLeft?.[1]?.card.name).toBe("Lightning Bolt");
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

    expect(() => {
      gameState.playCard(libraryCardIndex);
    }).toThrow(/Card at gameCardIndex \d+ is not in hand or revealed/);
  });
});
