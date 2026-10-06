import { describe, it, expect } from "vitest";
import { cardSourceOf, cardSpanAttributes } from "../src/shared/cardSource";

describe("cardSourceOf", () => {
  it("defaults to scryfall when absent", () => {
    expect(cardSourceOf({})).toBe("scryfall");
  });

  it("keeps an Archidekt custom source", () => {
    expect(cardSourceOf({ cardSource: "archidekt-custom" })).toBe("archidekt-custom");
  });
});

describe("cardSpanAttributes", () => {
  it("names the definition and its source, defaulting to scryfall", () => {
    expect(cardSpanAttributes({ cardDefinitionId: "abc" })).toEqual({
      "card.definition_id": "abc",
      "card.source": "scryfall",
    });
  });

  it("carries a custom card's source", () => {
    expect(cardSpanAttributes({ cardDefinitionId: "abc", cardSource: "archidekt-custom" })).toEqual({
      "card.definition_id": "abc",
      "card.source": "archidekt-custom",
    });
  });
});
