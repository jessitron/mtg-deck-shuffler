import { describe, test, expect } from "@jest/globals";
import { GameState } from "../../src/GameState.js";
import { minimalDeck } from "../generators.js";
import { formatLibrarySectionHtmlFragment } from "../../src/view/play-game/library-components.js";
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
