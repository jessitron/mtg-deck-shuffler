import { describe, test, expect } from "@jest/globals";
import { GameState } from "../src/GameState.js";
import { PERSISTED_DECK_VERSION } from "../src/types.js";
import { formatGameMenuHtmlFragment } from "../src/view/play-game/game-menu.js";
import { lightningBolt, ancestralRecall, blackLotus, testProvenance } from "./generators.js";

describe("game-menu: undo button for tabletop-initiated card return", () => {
  function newGameWithCardOnTable() {
    const deck = {
      version: PERSISTED_DECK_VERSION,
      id: 1,
      name: "Test Deck",
      totalCards: 3,
      commanders: [],
      cards: [lightningBolt, ancestralRecall, blackLotus],
      provenance: testProvenance,
    };

    const game = GameState.newGame(1, 1, 1, deck);
    game.draw();
    const gameCardIndex = game.getCards().find((gc) => gc.location.type === "Hand")!.gameCardIndex;
    return { game, gameCardIndex };
  }

  test("shows a disabled Undo button when the most recent event is a card returned from the table", () => {
    const { game, gameCardIndex } = newGameWithCardOnTable();

    game.moveByGameCardIndex(gameCardIndex, "Revealed", undefined, "returned", 1);

    const menu = formatGameMenuHtmlFragment(game);

    expect(menu).toContain('id="undo-button"');
    expect(menu).toContain("disabled");
    expect(menu).toContain("Can't undo tabletop-initiated card return yet, sorry");
  });

  test("still shows a working Undo button for an ordinary undoable event", () => {
    const { game } = newGameWithCardOnTable();

    const menu = formatGameMenuHtmlFragment(game);

    expect(menu).toContain('id="undo-button"');
    expect(menu).not.toContain("disabled");
  });
});
