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
});

