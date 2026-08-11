import { describe, test, expect } from "@jest/globals";
import { formatDeckTitleHtmlFragment, formatCommandZoneHtmlFragment } from "../../src/view/common/shared-components.js";
import { GameState } from "../../src/GameState.js";
import { deckWithOneCommander } from "../generators.js";
import { colorsForPlaymat, DEFAULT_PLAYMAT_PATH } from "../../src/table-look.js";
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
  test("sleeved game: command-zone surround is tinted with the playmat's resolved secondary color", () => {
    const deck = fc.sample(deckWithOneCommander, 1)[0];
    const game = GameState.newGame(1, 1, 1, deck, undefined, undefined, "#bd0a0a");
    game.startGame();
    const html = formatCommandZoneHtmlFragment(game);
    const { secondaryColor } = colorsForPlaymat(DEFAULT_PLAYMAT_PATH, "#bd0a0a");
    expect(html).toContain(`background-color: ${secondaryColor}`);
  });

  test("unsleeved game: surround still gets a color, resolved from the playmat's curated pair", () => {
    const deck = fc.sample(deckWithOneCommander, 1)[0];
    const game = GameState.newGame(1, 1, 1, deck);
    game.startGame();
    const html = formatCommandZoneHtmlFragment(game);
    const { secondaryColor } = colorsForPlaymat(DEFAULT_PLAYMAT_PATH, undefined);
    expect(html).toContain(`background-color: ${secondaryColor}`);
  });
});
