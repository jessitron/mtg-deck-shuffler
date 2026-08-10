import { describe, test, expect } from "@jest/globals";
import { GameState } from "../../src/GameState.js";
import { minimalDeck } from "../generators.js";
import { formatLibrarySectionHtmlFragment } from "../../src/view/play-game/library-components.js";
import { formatLibraryStack, CARD_BACK } from "../../src/view/common/shared-components.js";
import * as fc from "fast-check";

describe("formatLibrarySectionHtmlFragment", () => {
  test("should handle empty library without crashing", () => {
    fc.assert(
      fc.property(minimalDeck, (deck) => {
        const game = GameState.newGame(1, 1, 1, deck, 42);
        game.startGame();

        // Draw all cards from library until it's empty
        while (game.listLibrary().length > 0) {
          game.draw();
        }

        // This should not crash even though library is empty
        expect(() => {
          formatLibrarySectionHtmlFragment(game, {});
        }).not.toThrow();
      })
    );
  });
});

describe("formatLibraryStack sleeve rendering", () => {
  test("unsleeved: renders the standard card-back image, unchanged", () => {
    const html = formatLibraryStack({}, 10);
    expect(html).toContain(CARD_BACK);
    expect(html).not.toContain("sleeved");
  });

  test("sleeved: renders flat-hex rectangles instead of the card-back image", () => {
    const html = formatLibraryStack({}, 10, "#bd0a0a");
    expect(html).not.toContain(CARD_BACK);
    expect(html).toContain("background-color: #bd0a0a");
    // three stacked backs, all sleeved
    expect(html.match(/sleeved/g)?.length).toBe(3);
    expect(html.match(/data-testid="card-back"/g)?.length).toBe(3);
  });
});
