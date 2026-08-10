import { describe, test, expect } from "@jest/globals";
import * as fc from "fast-check";
import { GameState } from "../../src/GameState.js";
import { minimalDeck } from "../generators.js";
import { formatGamePageHtmlPage } from "../../src/view/play-game/active-game-page.js";

describe("formatGamePageHtmlPage playmat rendering", () => {
  test("with a picked playmat: renders it as the playmat's background-image", () => {
    const deck = fc.sample(minimalDeck, 1)[0];
    const game = GameState.newGame(1, 1, 1, deck, undefined, undefined, undefined, "/images/aeoe-3-exalted-sunborn.png");
    game.startGame();

    const html = formatGamePageHtmlPage(game);
    expect(html).toContain(`background-image: url('/images/aeoe-3-exalted-sunborn.png')`);
  });

  test("without a picked playmat: no inline background-image (falls through to the CSS default)", () => {
    const deck = fc.sample(minimalDeck, 1)[0];
    const game = GameState.newGame(1, 1, 1, deck);
    game.startGame();

    const html = formatGamePageHtmlPage(game);
    expect(html).not.toContain("background-image");
  });
});
