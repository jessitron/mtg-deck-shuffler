import { describe, test, expect } from "@jest/globals";
import { formatDeckTitleHtmlFragment, formatCommandZoneHtmlFragment } from "../../src/view/common/shared-components.js";
import { GameState } from "../../src/GameState.js";
import { deckWithOneCommander } from "../generators.js";
import * as fc from "fast-check";


describe("formatDeckTitleHtmlFragment sleeve tint", () => {
  test("no sleeve: no inline style", () => {
    const html = formatDeckTitleHtmlFragment("My Deck");
    expect(html).not.toContain("style=");
  });

  test("light sleeve: background tint, no forced text color", () => {
    const html = formatDeckTitleHtmlFragment("My Deck", "#f0e68c");
    expect(html).toContain("background-color: #f0e68c");
    expect(html).not.toContain("color: white");
  });

  test("dark sleeve: background tint plus white text for legibility", () => {
    const html = formatDeckTitleHtmlFragment("My Deck", "#530aae");
    expect(html).toContain("background-color: #530aae");
    expect(html).toContain("color: white");
  });
});

describe("formatCommandZoneHtmlFragment sleeve tint", () => {
  test("sleeved game: command-zone surround gets the tint", () => {
    const deck = fc.sample(deckWithOneCommander, 1)[0];
    const game = GameState.newGame(1, 1, 1, deck, undefined, undefined, "#bd0a0a");
    game.startGame();
    const html = formatCommandZoneHtmlFragment(game);
    expect(html).toContain("background-color: #bd0a0a");
  });

  test("unsleeved game: no inline style on the surround itself", () => {
    const deck = fc.sample(deckWithOneCommander, 1)[0];
    const game = GameState.newGame(1, 1, 1, deck);
    game.startGame();
    const html = formatCommandZoneHtmlFragment(game);
    const surroundTag = html.match(/<div class="cool-command-zone-surround[^>]*>/)?.[0];
    expect(surroundTag).not.toContain("style=");
  });
});
