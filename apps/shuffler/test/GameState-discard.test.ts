import { describe, test, expect } from "@jest/globals";
import { GameState } from "../src/GameState.js";
import { Deck, PERSISTED_DECK_VERSION } from "../src/types.js";
import { lightningBolt, ancestralRecall, blackLotus, testProvenance } from "./generators.js";
import { nameMoveCardEvent, MoveCardEvent } from "../src/GameEvents.js";


const testDeck: Deck = {
  version: PERSISTED_DECK_VERSION,
  id: 78,
  name: "Discard Test Deck",
  totalCards: 3,
  commanders: [],
  cards: [lightningBolt, ancestralRecall, blackLotus],
  provenance: testProvenance,
};

function gameWithHand(): GameState {
  const game = GameState.newGame(1, 1, 1, testDeck);
  for (const gc of game.getCards()) {
    game.moveByGameCardIndex(gc.gameCardIndex, "Hand");
  }
  return game;
}

describe("GameState.discardCard", () => {
  test("moves the card from hand to the table, like play", () => {
    const game = gameWithHand();
    const bolt = game.getCards().find((gc) => gc.card.name === "Lightning Bolt")!;

    game.discardCard(bolt.gameCardIndex);

    expect(bolt.location.type).toBe("Table");
    expect(game.listHand()).toHaveLength(2);
    expect(game.listTable()).toHaveLength(1);
  });

  test("records a move-card event with the discard verb", () => {
    const game = gameWithHand();
    const bolt = game.getCards().find((gc) => gc.card.name === "Lightning Bolt")!;

    game.discardCard(bolt.gameCardIndex);

    const events = game.getEventLog().getEvents();
    const lastEvent = events[events.length - 1] as MoveCardEvent & { gameEventIndex: number };
    expect(lastEvent.eventName).toBe("move card");
    expect(lastEvent.verb).toBe("discard");
    expect(nameMoveCardEvent(lastEvent)).toBe("Discard");
  });

  test("a played card still reads as Play in history", () => {
    const game = gameWithHand();
    const bolt = game.getCards().find((gc) => gc.card.name === "Lightning Bolt")!;

    game.playCard(bolt.gameCardIndex);

    const events = game.getEventLog().getEvents();
    const lastEvent = events[events.length - 1] as MoveCardEvent & { gameEventIndex: number };
    expect(lastEvent.verb).toBeUndefined();
    expect(nameMoveCardEvent(lastEvent)).toBe("Play");
  });

  test("a card played face down records a move-card event with the play-face-down verb", () => {
    const game = gameWithHand();
    const bolt = game.getCards().find((gc) => gc.card.name === "Lightning Bolt")!;

    game.playCard(bolt.gameCardIndex, undefined, true);

    expect(bolt.location.type).toBe("Table");

    const events = game.getEventLog().getEvents();
    const lastEvent = events[events.length - 1] as MoveCardEvent & { gameEventIndex: number };
    expect(lastEvent.eventName).toBe("move card");
    expect(lastEvent.verb).toBe("play-face-down");
    expect(nameMoveCardEvent(lastEvent)).toBe("Play Face Down");
  });

  test("discard is undoable like any move: the card returns to hand", () => {
    const game = gameWithHand();
    const bolt = game.getCards().find((gc) => gc.card.name === "Lightning Bolt")!;

    game.discardCard(bolt.gameCardIndex);
    const events = game.getEventLog().getEvents();
    game.undo(events[events.length - 1].gameEventIndex);

    expect(bolt.location.type).toBe("Hand");
  });

  test("refuses to discard a card that is not in hand", () => {
    const game = GameState.newGame(2, 1, 1, testDeck); // everything in library
    const bolt = game.getCards().find((gc) => gc.card.name === "Lightning Bolt")!;
    expect(() => game.discardCard(bolt.gameCardIndex)).toThrow(/not in hand/);
  });
});

describe("GameState.mill", () => {
  test("moves the top library card to the table with the discard verb", () => {
    const game = GameState.newGame(3, 1, 1, testDeck); // everything in library
    const topCard = game.listLibrary()[0];

    game.mill();

    expect(topCard.location.type).toBe("Table");
    expect(game.listTable()).toHaveLength(1);

    const events = game.getEventLog().getEvents();
    const lastEvent = events[events.length - 1] as MoveCardEvent & { gameEventIndex: number };
    expect(lastEvent.eventName).toBe("move card");
    expect(lastEvent.verb).toBe("discard");
  });

  test("mills from the top: a second mill takes the next card down", () => {
    const game = GameState.newGame(4, 1, 1, testDeck);
    const [first, second] = game.listLibrary();

    game.mill();
    game.mill();

    expect(first.location.type).toBe("Table");
    expect(second.location.type).toBe("Table");
    expect(game.listTable()).toHaveLength(2);
  });

  test("refuses to mill an empty library", () => {
    const game = GameState.newGame(5, 1, 1, testDeck);
    const startingCount = game.listLibrary().length;
    for (let i = 0; i < startingCount; i++) {
      game.mill();
    }
    expect(() => game.mill()).toThrow(/Library is empty/);
  });
});
