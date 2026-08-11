import { describe, test, expect } from "@jest/globals";
import { GameState } from "../src/GameState.js";
import { PERSISTED_DECK_VERSION } from "../src/types.js";
import { formatTableModalHtmlFragment } from "../src/view/play-game/game-modals.js";
import { lightningBolt, ancestralRecall, blackLotus, testProvenance } from "./generators.js";

describe("game-modals: Cards on Table ordering", () => {
  test("renders table cards alphabetically regardless of play order", () => {
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
    game.draw();
    game.draw();

    const hand = game.getCards().filter((gc) => gc.location.type === "Hand");
    const byName = (name: string) => hand.find((gc) => gc.card.name === name)!;

    game.playCard(byName("Lightning Bolt").gameCardIndex);
    game.playCard(byName("Black Lotus").gameCardIndex);
    game.playCard(byName("Ancestral Recall").gameCardIndex);

    const modal = formatTableModalHtmlFragment(game);
    const namesInOrder = [...modal.matchAll(/card-name-link[^>]*>([^<]+)</g)].map((m) => m[1]);

    expect(namesInOrder).toEqual(["Ancestral Recall", "Black Lotus", "Lightning Bolt"]);
    expect(modal).toContain("3 cards on table");
  });
});
