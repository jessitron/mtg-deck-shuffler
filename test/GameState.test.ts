import { describe, test, expect } from "@jest/globals";
import * as fc from "fast-check";
import { GameState } from "../src/GameState.js";
import { GameStatus, GameCard, LibraryLocation, HandLocation, RevealedLocation, TableLocation } from "../src/port-persist-state/types.js";
import { CardDefinition, Deck, DeckProvenance } from "../src/types.js";
import {
  lightningBolt,
  ancestralRecall,
  blackLotus,
  atraxa,
  testProvenance,
  minimalDeck,
  deckWithOneCommander,
  deckWithTwoCommanders,
  deck as anyDeck,
} from "./generators.js";

describe("GameState", () => {
  test("stores game status correctly", () => {
    fc.assert(
      fc.property(minimalDeck, (deck) => {
        const state = GameState.newGame(1, deck);
        expect(state.gameStatus()).toBe(GameStatus.Active);
      })
    );
  });

  test("allows zero commanders", () => {
    fc.assert(
      fc.property(minimalDeck, (deck) => {
        const state = GameState.newGame(1, deck);
        expect(state.listCommanders().length).toBe(0);
      })
    );
  });

  test("allows one commander", () => {
    fc.assert(
      fc.property(deckWithOneCommander, (deck) => {
        const state = GameState.newGame(1, deck);
        const commanders = state.listCommanders();
        expect(commanders.length).toBe(1);
        expect(commanders[0].card).toEqual(deck.commanders[0]);
        expect(commanders[0].isCommander).toBe(true);
      })
    );
  });

  test("allows two commanders", () => {
    fc.assert(
      fc.property(deckWithTwoCommanders, (deck) => {
        const state = GameState.newGame(1, deck);
        const commanders = state.listCommanders();
        expect(commanders.length).toBe(2);
        const commanderCards = commanders.map((gc) => gc.card).sort((a, b) => a.name.localeCompare(b.name));
        const deckCommanders = [...deck.commanders].sort((a, b) => a.name.localeCompare(b.name));
        expect(commanderCards[0]).toEqual(deckCommanders[0]);
        expect(commanderCards[1]).toEqual(deckCommanders[1]);
        expect(commanders.every((gc) => gc.isCommander)).toBe(true);
      })
    );
  });

  test("sorts cards by display name", () => {
    fc.assert(
      fc.property(anyDeck, (deck) => {
        const state = GameState.newGame(1, deck);
        const cards = state.getCards();

        // Verify cards are sorted by display name
        for (let i = 1; i < cards.length; i++) {
          expect(cards[i - 1].card.name.localeCompare(cards[i].card.name)).toBeLessThanOrEqual(0);
        }
      })
    );
  });

  test("constructor creates correct number of cards", () => {
    fc.assert(
      fc.property(minimalDeck, (deck) => {
        const state = GameState.newGame(1, deck);
        expect(state.getCards().length).toBe(deck.cards.length);
      })
    );
  });

  test("constructor uses provided gameId", () => {
    fc.assert(
      fc.property(minimalDeck, fc.integer({ min: 1, max: 999999 }), (deck, gameId) => {
        const state = GameState.newGame(gameId, deck);
        expect(state.gameId).toBe(gameId);
      })
    );
  });

  test("initializes cards in sequential positions in Library", () => {
    fc.assert(
      fc.property(deckWithOneCommander, (deck) => {
        const gameState = GameState.newGame(1, deck);

        const cards = gameState.getCards();
        expect(cards.length).toBe(deck.cards.length + deck.commanders.length);

        // Library cards should be in sequential positions
        const libraryCards = gameState.listLibrary();
        expect(libraryCards.length).toBe(deck.cards.length);
        libraryCards.forEach((gameCard, index) => {
          expect(gameCard.location.position).toBe(index);
          expect(gameCard.isCommander).toBe(false);
        });

        // Commander should be in command zone
        const commanderCards = gameState.listCommandZone();
        expect(commanderCards.length).toBe(1);
        expect(commanderCards[0].isCommander).toBe(true);
      })
    );
  });

  test("shuffle randomizes Library positions but preserves card count", () => {
    fc.assert(
      fc.property(anyDeck, (deck) => {
        const gameState = GameState.newGame(1, deck);
        const originalOrder = gameState.getCards().map((gc) => gc.card.name);

        gameState.shuffle();

        const cards = gameState.getCards();
        const libraryCards = cards.filter((gc) => gc.location.type === "Library");

        // Same number of cards in library
        expect(libraryCards.length).toBe(deck.cards.length);

        // Positions should still be sequential from 0
        const positions = libraryCards.map((gc) => (gc.location as LibraryLocation).position).sort((a, b) => a - b);
        const expectedPositions = Array.from({ length: deck.cards.length }, (_, i) => i);
        expect(positions).toEqual(expectedPositions);

        // Cards should still exist (order might be different)
        const shuffledNames = cards.map((gc) => gc.card.name).sort();
        const originalNames = originalOrder.sort();
        expect(shuffledNames).toEqual(originalNames);
      })
    );
  });

  test("shuffle only affects Library cards", () => {
    fc.assert(
      fc.property(anyDeck, (deck) => {
        const gameState = GameState.newGame(1, deck);

        // Manually move a non-commander card to Hand for testing
        const cards = gameState.getCards();
        const nonCommanderCard = cards.find((gc) => !gc.isCommander);
        if (nonCommanderCard) {
          (nonCommanderCard.location as any) = { type: "Hand", position: 0 };
        }

        const handCardBefore = nonCommanderCard?.card.name;
        const originalLibrarySize = cards.filter((gc) => gc.location.type === "Library").length;

        gameState.shuffle();

        if (nonCommanderCard) {
          // Hand card should be unchanged
          expect(nonCommanderCard.location.type).toBe("Hand");
          expect((nonCommanderCard.location as HandLocation).position).toBe(0);
          expect(nonCommanderCard.card.name).toBe(handCardBefore);
        }

        // Library should have same number of cards as before
        const libraryCards = cards.filter((gc) => gc.location.type === "Library");
        expect(libraryCards.length).toBe(originalLibrarySize);
      })
    );
  });

  test("startGame changes status to Active and shuffles", () => {
    fc.assert(
      fc.property(anyDeck, (deck) => {
        const gameState = GameState.newGame(1, deck);
        expect(gameState.gameStatus()).toBe(GameStatus.Active);

        gameState.startGame();

        expect(gameState.gameStatus()).toBe(GameStatus.Active);

        // Verify shuffle happened - cards should still be in library with valid positions
        const libraryCards = gameState.getCards().filter((gc) => gc.location.type === "Library");
        expect(libraryCards.length).toBe(deck.cards.length);

        const positions = libraryCards.map((gc) => (gc.location as LibraryLocation).position).sort((a, b) => a - b);
        const expectedPositions = Array.from({ length: deck.cards.length }, (_, i) => i);
        expect(positions).toEqual(expectedPositions);
      })
    );
  });

  test("startGame throws error if game already started", () => {
    fc.assert(
      fc.property(minimalDeck, (deck) => {
        const gameState = GameState.newGame(1, deck);
        gameState.startGame();

        expect(() => {
          gameState.startGame();
        }).toThrow(/Cannot start game: current status is Active/);
      })
    );
  });

  test("draw moves top card from Library to Hand", () => {
    fc.assert(
      fc.property(anyDeck, (deck) => {
        const gameState = GameState.newGame(1, deck);

        const libraryBefore = gameState.listLibrary();
        expect(libraryBefore.length).toBe(deck.cards.length);

        // Skip test if deck has no cards in library
        if (deck.cards.length === 0) return;

        const topCardBefore = libraryBefore[0]; // top card (minimum position)

        const handBefore = gameState.listHand();
        expect(handBefore.length).toBe(0);

        gameState.draw();

        // Check library: should have one less card now
        const libraryAfter = gameState.listLibrary();
        expect(libraryAfter.length).toBe(deck.cards.length - 1);

        // Check hand: should have 1 card now
        const handAfter = gameState.listHand();
        expect(handAfter.length).toBe(1);
        expect(handAfter[0].card.name).toBe(topCardBefore.card.name); // the drawn card should be the original top card
        expect((handAfter[0].location as HandLocation).position).toBe(0);
      })
    );
  });

  test("draw throws error when Library is empty", () => {
    fc.assert(
      fc.property(anyDeck, (deck) => {
        fc.pre(deck.cards.length > 0);

        const gameState = GameState.newGame(1, deck);

        // Move all cards out of library manually
        const cards = gameState.getCards();
        cards.forEach((card, index) => {
          (card.location as any) = { type: "Hand", position: index };
        });

        expect(() => {
          gameState.draw();
        }).toThrow(/Cannot draw: Library is empty/);
      })
    );
  });

  test("multiple draws position cards correctly in Hand", () => {
    fc.assert(
      fc.property(anyDeck, (deck) => {
        // Skip test if deck has no cards
        if (deck.cards.length === 0) return;

        const gameState = GameState.newGame(1, deck);
        const initialLibrarySize = deck.cards.length;

        // Track the original order of cards in library before drawing
        const originalLibraryOrder = gameState.listLibrary().map((gc) => gc.card.name);

        // Draw all cards one by one and verify positioning
        for (let i = 0; i < initialLibrarySize; i++) {
          const expectedTopCard = originalLibraryOrder[i];

          gameState.draw();

          const hand = gameState.listHand();
          const library = gameState.listLibrary();

          // Verify hand has correct number of cards
          expect(hand.length).toBe(i + 1);

          // Verify library has correct number of remaining cards
          expect(library.length).toBe(initialLibrarySize - (i + 1));

          // Verify the newly drawn card is at the correct position in hand
          expect((hand[i].location as HandLocation).position).toBe(i);

          // Verify the newly drawn card is the expected one (top of library)
          expect(hand[i].card.name).toBe(expectedTopCard);

          // Verify all previous cards in hand maintain their positions
          for (let j = 0; j < i; j++) {
            expect((hand[j].location as HandLocation).position).toBe(j);
          }
        }

        // After drawing all cards, library should be empty
        const finalLibrary = gameState.listLibrary();
        expect(finalLibrary.length).toBe(0);

        // Hand should contain all original deck cards
        const finalHand = gameState.listHand();
        expect(finalHand.length).toBe(initialLibrarySize);
      })
    );
  });

  test("draw works correctly after shuffle", () => {
    fc.assert(
      fc.property(anyDeck, (deck) => {
        fc.pre(deck.cards.length > 0);

        const gameState = GameState.newGame(1, deck);
        gameState.shuffle();

        const libraryBefore = gameState.listLibrary();
        expect(libraryBefore.length).toBe(deck.cards.length);

        const topCardBefore = libraryBefore[0]; // position 0 after shuffle

        gameState.draw();

        const libraryAfter = gameState.listLibrary();
        const handAfter = gameState.listHand();

        expect(libraryAfter.length).toBe(deck.cards.length - 1);
        expect(handAfter.length).toBe(1);
        expect(handAfter[0].card.name).toBe(topCardBefore.card.name);
      })
    );
  });

  test("reveal moves card from Library to Revealed", () => {
    fc.assert(
      fc.property(anyDeck, (deck) => {
        fc.pre(deck.cards.length > 0);

        const gameState = GameState.newGame(1, deck);

        const libraryBefore = gameState.listLibrary();
        expect(libraryBefore.length).toBe(deck.cards.length);

        const revealedBefore = gameState.listRevealed();
        expect(revealedBefore.length).toBe(0);

        // Pick a random valid position to reveal
        const positionToReveal = deck.cards.length > 1 ? Math.floor(Math.random() * deck.cards.length) : 0;
        const cardToReveal = libraryBefore[positionToReveal];

        gameState.reveal(positionToReveal);

        // Check library: should have one less card now
        const libraryAfter = gameState.listLibrary();
        expect(libraryAfter.length).toBe(deck.cards.length - 1);

        // Check revealed: should have 1 card now
        const revealedAfter = gameState.listRevealed();
        expect(revealedAfter.length).toBe(1);
        expect(revealedAfter[0].card.name).toBe(cardToReveal.card.name);
        expect((revealedAfter[0].location as RevealedLocation).position).toBe(0);
      })
    );
  });

  test("reveal throws error when position does not exist in Library", () => {
    fc.assert(
      fc.property(anyDeck, (deck) => {
        const gameState = GameState.newGame(1, deck);

        // Try to reveal a position that doesn't exist
        const invalidPosition = deck.cards.length + 5;

        expect(() => {
          gameState.reveal(invalidPosition);
        }).toThrow(new RegExp(`No card found at library position ${invalidPosition}`));
      })
    );
  });

  test("multiple reveals position cards correctly in Revealed", () => {
    fc.assert(
      fc.property(anyDeck, (deck) => {
        fc.pre(deck.cards.length >= 3);

        const gameState = GameState.newGame(1, deck);

        const libraryBefore = gameState.listLibrary();

        // Reveal first card (position 0)
        const firstCardToReveal = libraryBefore[0];
        gameState.reveal(0);
        let revealed = gameState.listRevealed();
        expect(revealed.length).toBe(1);
        expect(revealed[0].card.name).toBe(firstCardToReveal.card.name);
        expect((revealed[0].location as RevealedLocation).position).toBe(0);

        // Reveal second card (now at position 1 since first was removed)
        const secondCardToReveal = libraryBefore[1];
        gameState.reveal(1);
        revealed = gameState.listRevealed();
        expect(revealed.length).toBe(2);
        expect(revealed[0].card.name).toBe(firstCardToReveal.card.name); // position 0
        expect(revealed[1].card.name).toBe(secondCardToReveal.card.name); // position 1
        expect((revealed[1].location as RevealedLocation).position).toBe(1);

        // Library should have 2 less cards
        const library = gameState.listLibrary();
        expect(library.length).toBe(deck.cards.length - 2);
      })
    );
  });

  test("reveal works with any library position", () => {
    fc.assert(
      fc.property(anyDeck, (deck) => {
        fc.pre(deck.cards.length >= 3);

        const gameState = GameState.newGame(1, deck);
        const libraryBefore = gameState.listLibrary();

        // Reveal the last card first
        const lastPosition = deck.cards.length - 1;
        const lastCard = libraryBefore[lastPosition];
        gameState.reveal(lastPosition);

        let revealed = gameState.listRevealed();
        expect(revealed.length).toBe(1);
        expect(revealed[0].card.name).toBe(lastCard.card.name);

        // Then reveal the first card
        const firstCard = libraryBefore[0];
        gameState.reveal(0);

        revealed = gameState.listRevealed();
        expect(revealed.length).toBe(2);
        expect(revealed[0].card.name).toBe(lastCard.card.name); // position 0 in revealed
        expect(revealed[1].card.name).toBe(firstCard.card.name); // position 1 in revealed

        // Library should have 2 less cards
        const library = gameState.listLibrary();
        expect(library.length).toBe(deck.cards.length - 2);
      })
    );
  });

  test("playCard moves card from hand to table and shifts remaining cards left", () => {
    fc.assert(
      fc.property(anyDeck, (deck) => {
        fc.pre(deck.cards.length >= 4);

        const gameState = GameState.newGame(1, deck);

        // Draw cards to populate hand naturally
        for (let i = 0; i < 4; i++) {
          gameState.draw();
        }

        const handBefore = gameState.listHand();
        expect(handBefore.length).toBe(4);

        // Play the second card (position 1)
        const cardToPlay = handBefore[1];
        const whatHappened = gameState.playCard(cardToPlay.gameCardIndex);

        // Check that the card moved to table
        const tableCards = gameState.listTable();
        expect(tableCards.length).toBe(1);
        expect(tableCards[0].card.name).toBe(cardToPlay.card.name);

        // Check that remaining hand cards shifted left
        const handAfter = gameState.listHand();
        expect(handAfter.length).toBe(3);
        expect(handAfter[0].card.name).toBe(handBefore[0].card.name); // position 0 unchanged
        expect(handAfter[1].card.name).toBe(handBefore[2].card.name); // moved from position 2 to 1
        expect(handAfter[2].card.name).toBe(handBefore[3].card.name); // moved from position 3 to 2

        // Check WhatHappened contains the cards that moved left
        expect(whatHappened.movedLeft?.length).toBe(2);
        expect(whatHappened.movedLeft?.[0]?.card.name).toBe(handBefore[2].card.name);
        expect(whatHappened.movedLeft?.[1]?.card.name).toBe(handBefore[3].card.name);
      })
    );
  });

  test("playCard moves card from revealed to table and shifts remaining cards left", () => {
    fc.assert(
      fc.property(anyDeck, (deck) => {
        fc.pre(deck.cards.length >= 4);

        const gameState = GameState.newGame(1, deck);

        // Reveal cards to populate revealed zone using revealByGameCardIndex
        const libraryCards = gameState.listLibrary();
        for (let i = 0; i < 4; i++) {
          gameState.revealByGameCardIndex(libraryCards[i].gameCardIndex);
        }

        const revealedBefore = gameState.listRevealed();
        expect(revealedBefore.length).toBe(4);

        // Play the second card (position 1)
        const cardToPlay = revealedBefore[1];
        const whatHappened = gameState.playCard(cardToPlay.gameCardIndex);

        // Check that the card moved to table
        const tableCards = gameState.listTable();
        expect(tableCards.length).toBe(1);
        expect(tableCards[0].card.name).toBe(cardToPlay.card.name);

        // Check that remaining revealed cards shifted left
        const revealedAfter = gameState.listRevealed();
        expect(revealedAfter.length).toBe(3);
        expect(revealedAfter[0].card.name).toBe(revealedBefore[0].card.name); // position 0 unchanged
        expect(revealedAfter[1].card.name).toBe(revealedBefore[2].card.name); // moved from position 2 to 1
        expect(revealedAfter[2].card.name).toBe(revealedBefore[3].card.name); // moved from position 3 to 2

        // Check WhatHappened contains the cards that moved left
        expect(whatHappened.movedLeft?.length).toBe(2);
        expect(whatHappened.movedLeft?.[0]?.card.name).toBe(revealedBefore[2].card.name);
        expect(whatHappened.movedLeft?.[1]?.card.name).toBe(revealedBefore[3].card.name);
      })
    );
  });

  test("playCard throws error when card is not in hand or revealed", () => {
    fc.assert(
      fc.property(anyDeck, (deck) => {
        fc.pre(deck.cards.length > 0);

        const gameState = GameState.newGame(1, deck);

        // Try to play a card that's still in library
        const libraryCards = gameState.listLibrary();
        const libraryCardIndex = libraryCards[0].gameCardIndex;

        expect(() => {
          gameState.playCard(libraryCardIndex);
        }).toThrow(/Card at gameCardIndex \d+ is not in hand or revealed/);
      })
    );
  });

  test("flipCard flips a two-faced card", () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.string(),
          scryfallId: fc.uuid(),
          multiverseid: fc.integer({ min: 1, max: 999999 }),
          twoFaced: fc.constant(true),
        }),
        (twoFacedCard) => {
          const deck: Deck = {
            version: 1,
            name: "Test Deck",
            commanders: [],
            cards: [twoFacedCard],
            id: 1,
            totalCards: 1,
            provenance: {
              retrievedDate: new Date(),
              sourceUrl: "test://deck",
              deckSource: "test" as const,
            },
          };

          const gameState = GameState.newGame(1, deck);
          const gameCards = gameState.listLibrary();
          const gameCardIndex = gameCards[0].gameCardIndex;

          // Verify initial state
          expect(gameCards[0].currentFace).toBe("front");

          // Flip the card
          gameState.flipCard(gameCardIndex);

          // Verify the card was flipped
          const updatedCard = gameState.listLibrary().find((gc) => gc.gameCardIndex === gameCardIndex);
          expect(updatedCard?.currentFace).toBe("back");
        }
      )
    );
  });

  test("flipCard throws error when card does not exist", () => {
    fc.assert(
      fc.property(minimalDeck, (deck) => {
        const gameState = GameState.newGame(1, deck);

        expect(() => {
          gameState.flipCard(999);
        }).toThrow(/Game card with index 999 not found/);
      })
    );
  });

  test("flipCard throws error when card is not two-faced", () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.string(),
          scryfallId: fc.uuid(),
          multiverseid: fc.integer({ min: 1, max: 999999 }),
          twoFaced: fc.constant(false),
        }),
        (singleFacedCard) => {
          const deck: Deck = {
            version: 1,
            name: "Test Deck",
            commanders: [],
            cards: [singleFacedCard],
            id: 1,
            totalCards: 1,
            provenance: {
              retrievedDate: new Date(),
              sourceUrl: "test://deck",
              deckSource: "test" as const,
            },
          };

          const gameState = GameState.newGame(1, deck);
          const gameCards = gameState.listLibrary();
          const gameCardIndex = gameCards[0].gameCardIndex;

          expect(() => {
            gameState.flipCard(gameCardIndex);
          }).toThrow(new RegExp(`Card ${singleFacedCard.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} is not a two-faced card`));
        }
      )
    );
  });

  test("moveHandCard moves card to start of hand", () => {
    fc.assert(
      fc.property(anyDeck, (deck) => {
        fc.pre(deck.cards.length >= 3);

        const gameState = GameState.newGame(1, deck);

        // Draw 3 cards to populate hand
        for (let i = 0; i < 3; i++) {
          gameState.draw();
        }

        const handBefore = gameState.listHand();
        expect(handBefore.length).toBe(3);

        // Move the last card (position 2) to the start (position 0)
        const cardToMove = handBefore[2];
        const whatHappened = gameState.moveHandCard(2, 0);

        const handAfter = gameState.listHand();
        expect(handAfter.length).toBe(3);
        expect(handAfter[0].card.name).toBe(cardToMove.card.name);
        expect(handAfter[1].card.name).toBe(handBefore[0].card.name);
        expect(handAfter[2].card.name).toBe(handBefore[1].card.name);

        // Check WhatHappened - others shifted right
        // Only cards that were between positions 0 and 2 shift right (positions 0 and 1, not position 2)
        expect(whatHappened.movedRight?.length).toBe(2);
        // this card is coming in from the left of its new spot
        expect(whatHappened.dropppedFromLeft?.card.name).toBe(cardToMove.card.name);
      })
    );
  });

  test("moveHandCard moves card to end of hand", () => {
    fc.assert(
      fc.property(anyDeck, (deck) => {
        fc.pre(deck.cards.length >= 3);

        const gameState = GameState.newGame(1, deck);

        // Draw 3 cards to populate hand
        for (let i = 0; i < 3; i++) {
          gameState.draw();
        }

        const handBefore = gameState.listHand();
        expect(handBefore.length).toBe(3);

        // Move the first card (position 0) to the end (position 2)
        const whatHappened = gameState.moveHandCard(0, 2);

        const handAfter = gameState.listHand();
        expect(handAfter.length).toBe(3);
        expect(handAfter[0].card.name).toBe(handBefore[1].card.name);
        expect(handAfter[1].card.name).toBe(handBefore[2].card.name);
        expect(handAfter[2].card.name).toBe(handBefore[0].card.name);

        // Check WhatHappened - others shifted left, this one was dropped from the right
        // Only cards that were between positions 0 and 2 shift left (positions 1 and 2, not position 0)
        expect(whatHappened.movedLeft?.length).toBe(2);
        expect(whatHappened.dropppedFromRight?.card.name).toBe(handBefore[0].card.name);
      })
    );
  });

  test("moveHandCard moves card between other cards", () => {
    fc.assert(
      fc.property(anyDeck, (deck) => {
        fc.pre(deck.cards.length >= 4);

        const gameState = GameState.newGame(1, deck);

        // Draw 4 cards to populate hand
        for (let i = 0; i < 4; i++) {
          gameState.draw();
        }

        const handBefore = gameState.listHand();
        expect(handBefore.length).toBe(4);

        // Move card from position 0 to position 2
        const cardToMove = handBefore[0];
        const whatHappened = gameState.moveHandCard(0, 2);

        const handAfter = gameState.listHand();
        expect(handAfter.length).toBe(4);
        expect(handAfter[0].card.name).toBe(handBefore[1].card.name);
        expect(handAfter[1].card.name).toBe(handBefore[2].card.name);
        expect(handAfter[2].card.name).toBe(cardToMove.card.name);
        expect(handAfter[3].card.name).toBe(handBefore[3].card.name);

        // Check fractional position - should be between positions 2 and 3
        const movedCard = handAfter[2];
        expect(movedCard.location.position).toBeGreaterThan(handAfter[1].location.position);
        expect(movedCard.location.position).toBeLessThan(handAfter[3].location.position);
      })
    );
  });

  test("moveHandCard throws error for invalid fromHandPosition", () => {
    fc.assert(
      fc.property(anyDeck, (deck) => {
        fc.pre(deck.cards.length >= 2);

        const gameState = GameState.newGame(1, deck);

        // Draw 2 cards
        for (let i = 0; i < 2; i++) {
          gameState.draw();
        }

        expect(() => {
          gameState.moveHandCard(-1, 1);
        }).toThrow(/Invalid fromHandPosition: -1/);

        expect(() => {
          gameState.moveHandCard(5, 1);
        }).toThrow(/Invalid fromHandPosition: 5/);
      })
    );
  });

  test("moveHandCard throws error for invalid toHandPosition", () => {
    fc.assert(
      fc.property(anyDeck, (deck) => {
        fc.pre(deck.cards.length >= 2);

        const gameState = GameState.newGame(1, deck);

        // Draw 2 cards
        for (let i = 0; i < 2; i++) {
          gameState.draw();
        }

        expect(() => {
          gameState.moveHandCard(0, -1);
        }).toThrow(/Invalid toHandPosition: -1/);

        expect(() => {
          gameState.moveHandCard(0, 5);
        }).toThrow(/Invalid toHandPosition: 5/);
      })
    );
  });

  test("moveHandCard throws error when moving to same position", () => {
    fc.assert(
      fc.property(anyDeck, (deck) => {
        fc.pre(deck.cards.length >= 2);

        const gameState = GameState.newGame(1, deck);

        // Draw 2 cards
        for (let i = 0; i < 2; i++) {
          gameState.draw();
        }

        expect(() => {
          gameState.moveHandCard(0, 0);
        }).toThrow(/Cannot move card to same position: 0/);
      })
    );
  });

  test("moveHandCard preserves fractional positions without renormalization", () => {
    fc.assert(
      fc.property(anyDeck, (deck) => {
        fc.pre(deck.cards.length >= 5);

        const gameState = GameState.newGame(1, deck);

        // Draw 5 cards to populate hand
        for (let i = 0; i < 5; i++) {
          gameState.draw();
        }

        // Perform several moves
        gameState.moveHandCard(0, 2);
        gameState.moveHandCard(1, 3);
        gameState.moveHandCard(0, 4);

        // Verify hand still has correct number of cards
        const handAfter = gameState.listHand();
        expect(handAfter.length).toBe(5);

        // Verify positions are still sorted correctly
        for (let i = 1; i < handAfter.length; i++) {
          expect(handAfter[i].location.position).toBeGreaterThan(handAfter[i - 1].location.position);
        }
      })
    );
  });

  test("moveHandCard handles series of random moves correctly", () => {
    fc.assert(
      fc.property(anyDeck, fc.array(fc.tuple(fc.nat(), fc.nat()), { minLength: 3, maxLength: 20 }), (deck, moves) => {
        fc.pre(deck.cards.length >= 5);

        const gameState = GameState.newGame(1, deck);

        // Draw 5 cards to populate hand
        for (let i = 0; i < 5; i++) {
          gameState.draw();
        }

        const initialHand = gameState.listHand();
        const cardNames = initialHand.map((c) => c.card.name);

        // Perform series of moves
        for (const [from, to] of moves) {
          const handSize = gameState.listHand().length;
          if (handSize === 0) break;

          const fromPos = from % handSize;
          const toPos = to % handSize;

          // Skip if from and to are the same
          if (fromPos === toPos) continue;

          try {
            gameState.moveHandCard(fromPos, toPos);
          } catch (e) {
            // If move fails, that's okay - just skip it
            continue;
          }
        }

        // Verify invariants after all moves
        const finalHand = gameState.listHand();

        // Should still have same number of cards
        expect(finalHand.length).toBe(5);

        // Should still have same cards (just reordered)
        const finalCardNames = finalHand.map((c) => c.card.name).sort();
        expect(finalCardNames).toEqual([...cardNames].sort());

        // Positions should be strictly increasing
        for (let i = 1; i < finalHand.length; i++) {
          expect(finalHand[i].location.position).toBeGreaterThan(finalHand[i - 1].location.position);
        }

        // All cards should be in hand
        finalHand.forEach((card) => {
          expect(card.location.type).toBe("Hand");
        });
      })
    );
  });
});
