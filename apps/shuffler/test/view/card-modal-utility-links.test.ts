import { describe, test, expect } from "@jest/globals";
import { formatCardModalUtilityLinks } from "../../src/view/play-game/game-modals.js";
import { CardDefinition } from "../../src/types.js";

const stagnance: CardDefinition = {
  name: "Don't Stop in Stagnance",
  cardDefinitionId: "0b6a4c1e-5d1f-5a3e-9c1d-2f4e6a8b0c1d",
  cardSource: "archidekt-custom",
  twoFaced: true,
  oracleCardName: "Don't Stop in Stagnance",
  colorIdentity: [],
  set: "YAS",
  cardTypes: ["Enchantment"],
};

describe("card modal utility links", () => {
  test("Copy names the card by id and face, not by image URL or card name", () => {
    const html = formatCardModalUtilityLinks(stagnance, "back");
    expect(html).toContain(`copyCardImageToClipboard(event, '${stagnance.cardDefinitionId}', 'back')`);
    expect(html).not.toContain("Don't");
  });

  test("a custom card has no Gatherer link", () => {
    expect(formatCardModalUtilityLinks(stagnance, "front")).not.toContain("gatherer");
  });

  test("a Scryfall card links to Gatherer by multiverseid", () => {
    const bolt: CardDefinition = { ...stagnance, cardSource: undefined, multiverseid: 111 };
    expect(formatCardModalUtilityLinks(bolt, "front")).toContain("gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=111");
  });
});
