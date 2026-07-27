import { getCardImageUrl, constructCardImageUrl, CardDefinition } from "../src/types.js";

const baseCard: CardDefinition = {
  name: "Arcane Signet",
  scryfallId: "a5dc8c3f-c8a3-4bea-9874-4bf9b221408b",
  twoFaced: false,
  oracleCardName: "Arcane Signet",
  colorIdentity: [],
  set: "ecc",
  cardTypes: ["Artifact"],
};

describe("constructCardImageUrl (fallback / legacy construction)", () => {
  it("builds the Scryfall CDN path from the scryfallId", () => {
    expect(constructCardImageUrl(baseCard.scryfallId, "normal", "front")).toBe(
      "https://cards.scryfall.io/normal/front/a/5/a5dc8c3f-c8a3-4bea-9874-4bf9b221408b.jpg"
    );
  });

  it("uses the png extension for png format and the back path segment", () => {
    expect(constructCardImageUrl(baseCard.scryfallId, "png", "back")).toBe(
      "https://cards.scryfall.io/png/back/a/5/a5dc8c3f-c8a3-4bea-9874-4bf9b221408b.png"
    );
  });
});

describe("getCardImageUrl", () => {
  it("returns the stored Scryfall URL (with version tag) when present", () => {
    const card: CardDefinition = {
      ...baseCard,
      imageUris: {
        normal: "https://cards.scryfall.io/normal/front/a/5/a5dc8c3f-c8a3-4bea-9874-4bf9b221408b.jpg?1767730226",
        large: "https://cards.scryfall.io/large/front/a/5/a5dc8c3f-c8a3-4bea-9874-4bf9b221408b.jpg?1767730226",
      },
    };
    expect(getCardImageUrl(card, "normal", "front")).toBe(
      "https://cards.scryfall.io/normal/front/a/5/a5dc8c3f-c8a3-4bea-9874-4bf9b221408b.jpg?1767730226"
    );
  });

  it("falls back to constructing the URL when no stored URL exists for the format", () => {
    // Stored URLs exist for large but not png -> png falls back to construction.
    const card: CardDefinition = {
      ...baseCard,
      imageUris: { large: "https://example.com/large.jpg?1" },
    };
    expect(getCardImageUrl(card, "png", "front")).toBe(constructCardImageUrl(card.scryfallId, "png", "front"));
  });

  it("falls back entirely when the card has no stored imageUris (legacy data)", () => {
    expect(getCardImageUrl(baseCard, "normal", "front")).toBe(constructCardImageUrl(baseCard.scryfallId, "normal", "front"));
  });

  it("uses backImageUris for the back face of a two-faced card", () => {
    const dfc: CardDefinition = {
      ...baseCard,
      twoFaced: true,
      imageUris: { normal: "https://example.com/front-normal.jpg?9" },
      backImageUris: { normal: "https://example.com/back-normal.jpg?9" },
    };
    expect(getCardImageUrl(dfc, "normal", "back")).toBe("https://example.com/back-normal.jpg?9");
    expect(getCardImageUrl(dfc, "normal", "front")).toBe("https://example.com/front-normal.jpg?9");
  });

  it("falls back to constructed back URL when a two-faced card lacks stored back URLs", () => {
    const dfc: CardDefinition = { ...baseCard, twoFaced: true, imageUris: { normal: "https://example.com/front.jpg?9" } };
    expect(getCardImageUrl(dfc, "normal", "back")).toBe(constructCardImageUrl(dfc.scryfallId, "normal", "back"));
  });
});
