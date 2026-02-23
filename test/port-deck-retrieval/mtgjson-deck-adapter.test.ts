import { MtgjsonDeckAdapter } from "../../src/port-deck-retrieval/mtgjsonAdapter/MtgjsonDeckAdapter.js";
import { MtgjsonDeck } from "../../src/port-deck-retrieval/mtgjsonAdapter/mtgjsonTypes.js";

describe("MtgjsonDeckAdapter", () => {
  let adapter: MtgjsonDeckAdapter;

  beforeEach(() => {
    adapter = new MtgjsonDeckAdapter();
  });

  it("converts basic deck with single card type", () => {
    const mtgjsonDeck: MtgjsonDeck = {
      meta: {
        date: "2023-01-01",
        version: "5.0.0",
      },
      data: {
        name: "Test Deck",
        code: "TST",
        type: "Commander Deck",
        releaseDate: "2023-01-01",
        commander: [],
        mainBoard: [
          {
            name: "Forest",
            uuid: "forest-uuid",
            count: 20,
            layout: "normal",
            colorIdentity: ["G"],
            setCode: "TST",
            types: ["Land"],
            identifiers: {
              scryfallId: "forest-scryfall-id",
              multiverseId: "111111",
            },
          },
        ],
      },
    };

    const result = adapter.convertMtgjsonToDeck(mtgjsonDeck, "test-file.json");

    expect(result.name).toBe("Test Deck");
    expect(result.cards.length).toBe(20);
    expect(result.cards[0].types).toEqual(["Land"]);
  });

  it("converts deck with multiple card types", () => {
    const mtgjsonDeck: MtgjsonDeck = {
      meta: {
        date: "2023-01-01",
        version: "5.0.0",
      },
      data: {
        name: "Artifact Creatures",
        code: "TST",
        type: "Commander Deck",
        releaseDate: "2023-01-01",
        commander: [],
        mainBoard: [
          {
            name: "Solemn Simulacrum",
            uuid: "solemn-uuid",
            count: 1,
            layout: "normal",
            colorIdentity: [],
            setCode: "TST",
            types: ["Artifact", "Creature"],
            identifiers: {
              scryfallId: "solemn-scryfall-id",
              multiverseId: "222222",
            },
          },
          {
            name: "Thassa, God of the Sea",
            uuid: "thassa-uuid",
            count: 1,
            layout: "normal",
            colorIdentity: ["U"],
            setCode: "TST",
            types: ["Legendary", "Enchantment", "Creature"],
            identifiers: {
              scryfallId: "thassa-scryfall-id",
              multiverseId: "333333",
            },
          },
        ],
      },
    };

    const result = adapter.convertMtgjsonToDeck(mtgjsonDeck, "test-file.json");

    expect(result.name).toBe("Artifact Creatures");
    expect(result.cards.length).toBe(2);
    expect(result.cards[0].types).toEqual(["Artifact", "Creature"]);
    expect(result.cards[1].types).toEqual(["Legendary", "Enchantment", "Creature"]);
  });

  it("converts commander with types", () => {
    const mtgjsonDeck: MtgjsonDeck = {
      meta: {
        date: "2023-01-01",
        version: "5.0.0",
      },
      data: {
        name: "Commander Deck",
        code: "TST",
        type: "Commander Deck",
        releaseDate: "2023-01-01",
        commander: [
          {
            name: "Atraxa, Praetors' Voice",
            uuid: "atraxa-uuid",
            count: 1,
            layout: "normal",
            colorIdentity: ["W", "U", "B", "G"],
            setCode: "TST",
            types: ["Legendary", "Creature"],
            identifiers: {
              scryfallId: "atraxa-scryfall-id",
              multiverseId: "444444",
            },
          },
        ],
        mainBoard: [
          {
            name: "Sol Ring",
            uuid: "sol-ring-uuid",
            count: 1,
            layout: "normal",
            colorIdentity: [],
            setCode: "TST",
            types: ["Artifact"],
            identifiers: {
              scryfallId: "sol-ring-scryfall-id",
              multiverseId: "555555",
            },
          },
        ],
      },
    };

    const result = adapter.convertMtgjsonToDeck(mtgjsonDeck, "test-file.json");

    expect(result.commanders.length).toBe(1);
    expect(result.commanders[0].types).toEqual(["Legendary", "Creature"]);
    expect(result.cards.length).toBe(1);
    expect(result.cards[0].types).toEqual(["Artifact"]);
  });

  it("extracts back-face data for two-faced cards via otherFaceIds", () => {
    const mtgjsonDeck: MtgjsonDeck = {
      meta: {
        date: "2023-01-01",
        version: "5.0.0",
      },
      data: {
        name: "Two-Faced Deck",
        code: "M19",
        type: "Commander Deck",
        releaseDate: "2018-07-13",
        commander: [],
        mainBoard: [
          {
            name: "Nicol Bolas, the Ravager",
            uuid: "nicol-front-uuid",
            count: 1,
            layout: "transform",
            side: "a",
            otherFaceIds: ["nicol-back-uuid"],
            colorIdentity: ["U", "B", "R"],
            setCode: "M19",
            types: ["Legendary", "Creature"],
            manaCost: "{1}{U}{B}{R}",
            manaValue: 4,
            text: "Flying\nWhen Nicol Bolas, the Ravager enters the battlefield, each opponent discards a card.",
            identifiers: {
              scryfallId: "nicol-scryfall-id",
              multiverseId: "447354",
            },
          },
          {
            name: "Nicol Bolas, the Arisen",
            uuid: "nicol-back-uuid",
            count: 1,
            layout: "transform",
            side: "b",
            otherFaceIds: ["nicol-front-uuid"],
            colorIdentity: ["U", "B", "R"],
            setCode: "M19",
            types: ["Legendary", "Planeswalker"],
            manaValue: 4,
            text: "+2: Draw two cards.",
            identifiers: {
              scryfallId: "nicol-scryfall-id",
            },
          },
          {
            name: "Sol Ring",
            uuid: "sol-ring-uuid",
            count: 1,
            layout: "normal",
            colorIdentity: [],
            setCode: "M19",
            types: ["Artifact"],
            identifiers: {
              scryfallId: "sol-ring-scryfall-id",
            },
          },
        ],
      },
    };

    const result = adapter.convertMtgjsonToDeck(mtgjsonDeck, "test-file.json");

    // Side "b" card should be skipped from main list
    expect(result.cards.length).toBe(2); // Nicol Bolas front + Sol Ring

    const nicolBolas = result.cards.find(c => c.name === "Nicol Bolas, the Ravager");
    expect(nicolBolas).toBeDefined();
    expect(nicolBolas!.twoFaced).toBe(true);
    expect(nicolBolas!.types).toEqual(["Legendary", "Creature"]);
    expect(nicolBolas!.backFace).toEqual({
      name: "Nicol Bolas, the Arisen",
      types: ["Legendary", "Planeswalker"],
      manaCost: undefined,
      cmc: 4,
      oracleText: "+2: Draw two cards.",
    });

    const solRing = result.cards.find(c => c.name === "Sol Ring");
    expect(solRing).toBeDefined();
    expect(solRing!.twoFaced).toBe(false);
    expect(solRing!.backFace).toBeUndefined();
  });

  it("handles two-faced card when back face is not in deck data", () => {
    const mtgjsonDeck: MtgjsonDeck = {
      meta: {
        date: "2023-01-01",
        version: "5.0.0",
      },
      data: {
        name: "Missing Back Face",
        code: "TST",
        type: "Commander Deck",
        releaseDate: "2023-01-01",
        commander: [],
        mainBoard: [
          {
            name: "Transform Card",
            uuid: "front-uuid",
            count: 1,
            layout: "transform",
            side: "a",
            otherFaceIds: ["missing-back-uuid"],
            colorIdentity: [],
            setCode: "TST",
            types: ["Creature"],
            identifiers: {
              scryfallId: "front-scryfall-id",
            },
          },
        ],
      },
    };

    const result = adapter.convertMtgjsonToDeck(mtgjsonDeck, "test-file.json");

    expect(result.cards.length).toBe(1);
    expect(result.cards[0].twoFaced).toBe(true);
    expect(result.cards[0].backFace).toBeUndefined();
  });
});

