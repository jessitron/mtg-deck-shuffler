import { describe, test, expect } from "@jest/globals";
import { GameState } from "../src/GameState.js";
import { Deck, PERSISTED_DECK_VERSION } from "../src/types.js";
import { lightningBolt, ancestralRecall, blackLotus, testProvenance } from "./generators.js";
import { nameMoveCardEvent, MoveCardEvent } from "../src/GameEvents.js";

/**
 * Discard (JES-127, B4): identical to Play except the verb — the card leaves
 * the hand for the TableLocation (the graveyard is table geography, not
 * Shuffler state), and history says "Discard" rather than "Play".
 */

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
    game.putInHandByGameCardIndex(gc.gameCardIndex);
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
