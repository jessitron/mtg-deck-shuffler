import { enrichDeckWithImages } from "../src/port-card-images/enrichDeckWithImages.js";
import { FakeCardImagesGateway } from "../src/port-card-images/FakeCardImagesGateway.js";
import { Deck, CardDefinition, PERSISTED_DECK_VERSION } from "../src/types.js";
import { lightningBolt, nicolBolas, testProvenance } from "./generators.js";

function deckOf(commanders: CardDefinition[], cards: CardDefinition[]): Deck {
  return {
    version: PERSISTED_DECK_VERSION,
    id: 1,
    name: "Test",
    totalCards: commanders.length + cards.length,
    commanders,
    cards,
    provenance: testProvenance,
  };
}

describe("enrichDeckWithImages", () => {
  it("attaches front image URLs to single-faced cards", async () => {
    const deck = deckOf([], [{ ...lightningBolt }]);
    await enrichDeckWithImages(deck, new FakeCardImagesGateway());

    expect(deck.cards[0].imageUris?.normal).toBe(`https://fake.scryfall/normal/${lightningBolt.scryfallId}.jpg?fake`);
    expect(deck.cards[0].backImageUris).toBeUndefined();
  });

  it("attaches back image URLs only to two-faced cards", async () => {
    const seeded = new Map([
      [nicolBolas.scryfallId, { front: { normal: "front.jpg?1" }, back: { normal: "back.jpg?1" } }],
    ]);
    const deck = deckOf([], [{ ...nicolBolas }]);
    await enrichDeckWithImages(deck, new FakeCardImagesGateway(seeded));

    expect(deck.cards[0].imageUris?.normal).toBe("front.jpg?1");
    expect(deck.cards[0].backImageUris?.normal).toBe("back.jpg?1");
  });

  it("does not attach back URLs to a single-faced card even if the gateway returns them", async () => {
    const single = { ...lightningBolt, twoFaced: false };
    const seeded = new Map([
      [single.scryfallId, { front: { normal: "front.jpg?1" }, back: { normal: "back.jpg?1" } }],
    ]);
    const deck = deckOf([], [single]);
    await enrichDeckWithImages(deck, new FakeCardImagesGateway(seeded));

    expect(deck.cards[0].imageUris?.normal).toBe("front.jpg?1");
    expect(deck.cards[0].backImageUris).toBeUndefined();
  });

  it("leaves cards Scryfall doesn't recognize without stored URLs", async () => {
    const deck = deckOf([], [{ ...lightningBolt }]);
    // Seeded map that does NOT include the card, and does not synthesize.
    await enrichDeckWithImages(deck, new FakeCardImagesGateway(new Map()));

    expect(deck.cards[0].imageUris).toBeUndefined();
  });

  it("fetches each unique scryfallId once across commanders and cards", async () => {
    const gateway = new FakeCardImagesGateway();
    const dup = { ...lightningBolt };
    const deck = deckOf([{ ...nicolBolas }], [dup, dup, { ...lightningBolt }]);
    await enrichDeckWithImages(deck, gateway);

    // Two unique ids requested (nicolBolas + lightningBolt), despite duplicates.
    expect(new Set(gateway.requestedIds).size).toBe(2);
  });
});
