import { test, describe } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import { ArchidektDeck, Deck, ArchidektCard, convertArchidektToDeck, convertArchidektToCard } from "../src/deck.js";

describe("convertArchidektToCard", () => {
  test("converts card with oracle name", () => {
    const archidektCard: ArchidektCard = {
      card: {
        uid: "test-uid",
        multiverseid: 123456,
        oracleCard: {
          name: "Oracle Name",
        },
      },
      quantity: 1,
      categories: ["Test"],
    };

    const result = convertArchidektToCard(archidektCard);

    assert.deepStrictEqual(result, { name: "Oracle Name", uid: "test-uid", multiverseid: 123456 });
  });

  test("converts card with display name when available", () => {
    const archidektCard: ArchidektCard = {
      card: {
        displayName: "Display Name",
        uid: "test-uid-2",
        multiverseid: 789012,
        oracleCard: {
          name: "Oracle Name",
        },
      },
      quantity: 1,
      categories: ["Test"],
    };

    const result = convertArchidektToCard(archidektCard);

    assert.deepStrictEqual(result, { name: "Display Name", uid: "test-uid-2", multiverseid: 789012 });
  });
});

describe("convertArchidektToDeck", () => {
  test("converts basic deck without commander", () => {
    const archidektDeck: ArchidektDeck = {
      id: 123,
      name: "Test Deck",
      categories: [
        {
          id: 1,
          name: "Instant",
          isPremier: false,
          includedInDeck: true,
          includedInPrice: true,
        },
        {
          id: 2,
          name: "Land",
          isPremier: false,
          includedInDeck: true,
          includedInPrice: true,
        },
      ],
      cards: [
        {
          card: {
            uid: "lightning-bolt-uid",
            multiverseid: 111111,
            oracleCard: { name: "Lightning Bolt" },
          },
          quantity: 4,
          categories: ["Instant"],
        },
        {
          card: {
            uid: "mountain-uid",
            multiverseid: 222222,
            oracleCard: { name: "Mountain" },
          },
          quantity: 20,
          categories: ["Land"],
        },
      ],
    };

    const result: Deck = convertArchidektToDeck(archidektDeck);

    assert.strictEqual(result.id, 123);
    assert.strictEqual(result.name, "Test Deck");
    assert.strictEqual(result.totalCards, 24);
    assert.strictEqual(result.includedCards, 24);
    assert.strictEqual(result.excludedCards, 0);
    assert.strictEqual(result.commander, undefined);
  });

  test("converts deck with commander", () => {
    const archidektDeck: ArchidektDeck = {
      id: 456,
      name: "Commander Deck",
      categories: [
        {
          id: 1,
          name: "Commander",
          isPremier: true,
          includedInDeck: true,
          includedInPrice: true,
        },
        {
          id: 2,
          name: "Land",
          isPremier: false,
          includedInDeck: true,
          includedInPrice: true,
        },
        {
          id: 3,
          name: "Instant",
          isPremier: false,
          includedInDeck: true,
          includedInPrice: true,
        },
      ],
      cards: [
        {
          card: {
            uid: "urza-uid",
            multiverseid: 333333,
            oracleCard: { name: "Urza, Lord High Artificer" },
          },
          quantity: 1,
          categories: ["Commander"],
        },
        {
          card: {
            uid: "island-uid",
            multiverseid: 444444,
            oracleCard: { name: "Island" },
          },
          quantity: 30,
          categories: ["Land"],
        },
        {
          card: {
            uid: "counterspell-uid",
            multiverseid: 555555,
            oracleCard: { name: "Counterspell" },
          },
          quantity: 1,
          categories: ["Instant"],
        },
      ],
    };

    const result = convertArchidektToDeck(archidektDeck);

    assert.strictEqual(result.id, 456);
    assert.strictEqual(result.name, "Commander Deck");
    assert.strictEqual(result.totalCards, 32);
    assert.strictEqual(result.includedCards, 32);
    assert.strictEqual(result.excludedCards, 0);
    assert.deepStrictEqual(result.commander, { name: "Urza, Lord High Artificer", uid: "urza-uid", multiverseid: 333333 });
  });

  test("handles empty deck", () => {
    const archidektDeck: ArchidektDeck = {
      id: 789,
      name: "Empty Deck",
      categories: [],
      cards: [],
    };

    const result = convertArchidektToDeck(archidektDeck);

    assert.strictEqual(result.id, 789);
    assert.strictEqual(result.name, "Empty Deck");
    assert.strictEqual(result.totalCards, 0);
    assert.strictEqual(result.includedCards, 0);
    assert.strictEqual(result.excludedCards, 0);
    assert.strictEqual(result.commander, undefined);
  });

  test("separates included cards from excluded cards", () => {
    const archidektDeck: ArchidektDeck = {
      id: 999,
      name: "Deck with Excluded Cards",
      categories: [
        {
          id: 1,
          name: "Instant",
          isPremier: false,
          includedInDeck: true,
          includedInPrice: true,
        },
        {
          id: 2,
          name: "Land",
          isPremier: false,
          includedInDeck: true,
          includedInPrice: true,
        },
        {
          id: 3,
          name: "Maybeboard",
          isPremier: false,
          includedInDeck: false,
          includedInPrice: false,
        },
        {
          id: 4,
          name: "Sideboard",
          isPremier: false,
          includedInDeck: true,
          includedInPrice: true,
        },
      ],
      cards: [
        {
          card: {
            uid: "lightning-bolt-uid-2",
            multiverseid: 666666,
            oracleCard: { name: "Lightning Bolt" },
          },
          quantity: 4,
          categories: ["Instant"],
        },
        {
          card: {
            uid: "mountain-uid-2",
            multiverseid: 777777,
            oracleCard: { name: "Mountain" },
          },
          quantity: 20,
          categories: ["Land"],
        },
        {
          card: {
            uid: "maybe-card-uid",
            multiverseid: 888888,
            oracleCard: { name: "Maybe Card" },
          },
          quantity: 2,
          categories: ["Maybeboard", "Creature"],
        },
        {
          card: {
            uid: "sideboard-card-uid",
            multiverseid: 999999,
            oracleCard: { name: "Sideboard Card" },
          },
          quantity: 1,
          categories: ["Sideboard", "Instant"],
        },
      ],
    };

    const result = convertArchidektToDeck(archidektDeck);

    assert.strictEqual(result.id, 999);
    assert.strictEqual(result.name, "Deck with Excluded Cards");
    assert.strictEqual(result.totalCards, 27);
    assert.strictEqual(result.includedCards, 24);
    assert.strictEqual(result.excludedCards, 3);
    assert.strictEqual(result.commander, undefined);
  });

  test("converts real Ygra deck data correctly", () => {
    const ygraData = JSON.parse(fs.readFileSync("./test/deck-ygra.json", "utf8"));

    const result = convertArchidektToDeck(ygraData);

    assert.strictEqual(result.id, 14669648);
    assert.strictEqual(result.name, "Ygra EATS IT ALL");
    assert.deepStrictEqual(result.commander, { name: "Ygra, Eater of All", uid: "b9ac7673-eae8-4c4b-889e-5025213a6151", multiverseid: 669155 });
    assert.strictEqual(result.totalCards, 5);
    assert.strictEqual(result.includedCards, 4);
    assert.strictEqual(result.excludedCards, 1);
  });
});
