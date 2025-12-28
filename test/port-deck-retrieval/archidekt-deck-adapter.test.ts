import fs from "node:fs";
import { Deck } from "../../src/types.js";
import { ArchidektGateway, FilesystemArchidektGateway, ArchidektDeckToDeckAdapter, ArchidektGatewayInterface } from "../../src/port-deck-retrieval/implementations.js";
import { ArchidektDeck } from "../../src/port-deck-retrieval/archidektAdapter/archidektTypes.js";
import { ArchidektDeckRetrievalRequest } from "../../src/port-deck-retrieval/types.js";

describe("ArchidektDeckToDeckAdapter", () => {
  let adapter: ArchidektDeckToDeckAdapter;
  let mockGateway: ArchidektGatewayInterface;

  beforeEach(() => {
    mockGateway = {
      fetchDeck: async (deckId: string): Promise<ArchidektDeck> => {
        throw new Error("Mock not configured for this test");
      },
    } as ArchidektGatewayInterface;
    adapter = new ArchidektDeckToDeckAdapter(mockGateway);
  });

  it("converts basic deck without commander", async () => {
    const archidektDeck: ArchidektDeck = {
      id: 123,
      name: "Test Deck",
      createdAt: "2023-01-01T00:00:00.000000Z",
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
            oracleCard: { name: "Lightning Bolt", faces: [], colorIdentity: [] },
            edition: { editionname: "Test Set", editioncode: "TST" },
          },
          quantity: 4,
          categories: ["Instant"],
        },
        {
          card: {
            uid: "mountain-uid",
            multiverseid: 222222,
            oracleCard: { name: "Mountain", faces: [], colorIdentity: [] },
            edition: { editionname: "Test Set", editioncode: "TST" },
          },
          quantity: 20,
          categories: ["Land"],
        },
      ],
    };

    // Mock the gateway to return our test data
    mockGateway.fetchDeck = async (_deckId: string) => archidektDeck;

    const request: ArchidektDeckRetrievalRequest = { deckSource: "archidekt", archidektDeckId: "123" };
    const result: Deck = await adapter.retrieveDeck(request);

    expect(result.id).toBe(123);
    expect(result.name).toBe("Test Deck");
    expect(result.totalCards).toBe(24);
    expect(result.commanders).toEqual([]);
    expect(result.provenance.sourceUrl).toBe("https://archidekt.com/decks/123");
    expect(result.provenance.deckSource).toBe("archidekt");
    expect(result.provenance.retrievedDate instanceof Date).toBe(true);
  });

  it("converts deck with commander", async () => {
    const archidektDeck: ArchidektDeck = {
      id: 456,
      name: "Commander Deck",
      createdAt: "2023-01-01T00:00:00.000000Z",
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
            oracleCard: { name: "Urza, Lord High Artificer", faces: [], colorIdentity: [] },
            edition: { editionname: "Test Set", editioncode: "TST" },
          },
          quantity: 1,
          categories: ["Commander"],
        },
        {
          card: {
            uid: "island-uid",
            multiverseid: 444444,
            oracleCard: { name: "Island", faces: [], colorIdentity: [] },
            edition: { editionname: "Test Set", editioncode: "TST" },
          },
          quantity: 30,
          categories: ["Land"],
        },
        {
          card: {
            uid: "counterspell-uid",
            multiverseid: 555555,
            oracleCard: { name: "Counterspell", faces: [], colorIdentity: [] },
            edition: { editionname: "Test Set", editioncode: "TST" },
          },
          quantity: 1,
          categories: ["Instant"],
        },
      ],
    };

    // Mock the gateway to return our test data
    mockGateway.fetchDeck = async (_deckId: string) => archidektDeck;

    const request: ArchidektDeckRetrievalRequest = { deckSource: "archidekt", archidektDeckId: "456" };
    const result = await adapter.retrieveDeck(request);

    expect(result.id).toBe(456);
    expect(result.name).toBe("Commander Deck");
    expect(result.totalCards).toBe(32); // 31 non-commander cards + 1 commander
    expect(result.commanders).toEqual([{ name: "Urza, Lord High Artificer", scryfallId: "urza-uid", multiverseid: 333333, twoFaced: false, colorIdentity: [], set: "Test Set" }]);
  });

  it("handles empty deck", async () => {
    const archidektDeck: ArchidektDeck = {
      id: 789,
      name: "Empty Deck",
      createdAt: "2023-01-01T00:00:00.000000Z",
      categories: [],
      cards: [],
    };

    // Mock the gateway to return our test data
    mockGateway.fetchDeck = async (_deckId: string) => archidektDeck;

    const request: ArchidektDeckRetrievalRequest = { deckSource: "archidekt", archidektDeckId: "789" };
    const result = await adapter.retrieveDeck(request);

    expect(result.id).toBe(789);
    expect(result.name).toBe("Empty Deck");
    expect(result.totalCards).toBe(0);
    expect(result.commanders).toEqual([]);
  });

  it("separates included cards from excluded cards", async () => {
    const archidektDeck: ArchidektDeck = {
      id: 999,
      name: "Deck with Excluded Cards",
      createdAt: "2023-01-01T00:00:00.000000Z",
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
            oracleCard: { name: "Lightning Bolt", faces: [], colorIdentity: [] },
            edition: { editionname: "Test Set", editioncode: "TST" },
          },
          quantity: 4,
          categories: ["Instant"],
        },
        {
          card: {
            uid: "mountain-uid-2",
            multiverseid: 777777,
            oracleCard: { name: "Mountain", faces: [], colorIdentity: [] },
            edition: { editionname: "Test Set", editioncode: "TST" },
          },
          quantity: 20,
          categories: ["Land"],
        },
        {
          card: {
            uid: "maybe-card-uid",
            multiverseid: 888888,
            oracleCard: { name: "Maybe Card", faces: [], colorIdentity: [] },
            edition: { editionname: "Test Set", editioncode: "TST" },
          },
          quantity: 2,
          categories: ["Maybeboard", "Creature"],
        },
        {
          card: {
            uid: "sideboard-card-uid",
            multiverseid: 999999,
            oracleCard: { name: "Sideboard Card", faces: [], colorIdentity: [] },
            edition: { editionname: "Test Set", editioncode: "TST" },
          },
          quantity: 1,
          categories: ["Sideboard", "Instant"],
        },
      ],
    };

    // Mock the gateway to return our test data
    mockGateway.fetchDeck = async (_deckId: string) => archidektDeck;

    const request: ArchidektDeckRetrievalRequest = { deckSource: "archidekt", archidektDeckId: "999" };
    const result = await adapter.retrieveDeck(request);

    expect(result.id).toBe(999);
    expect(result.name).toBe("Deck with Excluded Cards");
    expect(result.totalCards).toBe(24);
    expect(result.commanders).toEqual([]);
  });

  it("converts real Ygra deck data correctly", async () => {
    const ygraData = JSON.parse(fs.readFileSync("./test/deck-ygra.json", "utf8"));

    // Mock the gateway to return our test data
    mockGateway.fetchDeck = async (_deckId: string) => ygraData;

    const request: ArchidektDeckRetrievalRequest = { deckSource: "archidekt", archidektDeckId: "14669648" };
    const result = await adapter.retrieveDeck(request);

    expect(result.id).toBe(14669648);
    expect(result.name).toBe("Ygra EATS IT ALL");
    expect(result.commanders[0]).toMatchObject({ name: "Ygra, Eater of All", scryfallId: "b9ac7673-eae8-4c4b-889e-5025213a6151", multiverseid: 669155, twoFaced: false });
    expect(result.commanders[0].colorIdentity).toBeDefined();
    expect(result.commanders[0].set).toBeDefined();
    expect(result.totalCards).toBe(4); // 3 non-commander cards + 1 commander
  });

  it("converts cards with oracle name correctly", async () => {
    const archidektDeck: ArchidektDeck = {
      id: 123,
      name: "Oracle Name Test",
      createdAt: "2023-01-01T00:00:00.000000Z",
      categories: [
        {
          id: 1,
          name: "Instant",
          isPremier: false,
          includedInDeck: true,
          includedInPrice: true,
        },
      ],
      cards: [
        {
          card: {
            uid: "test-uid",
            multiverseid: 123456,
            oracleCard: {
              name: "Oracle Name",
              faces: [],
              colorIdentity: [],
            },
            edition: { editionname: "Test Set", editioncode: "TST" },
          },
          quantity: 1,
          categories: ["Instant"],
        },
      ],
    };

    mockGateway.fetchDeck = async (_deckId: string) => archidektDeck;

    const request: ArchidektDeckRetrievalRequest = { deckSource: "archidekt", archidektDeckId: "123" };
    const result = await adapter.retrieveDeck(request);

    expect(result.cards.length).toBe(1);
    expect(result.cards[0]).toEqual({ name: "Oracle Name", scryfallId: "test-uid", multiverseid: 123456, twoFaced: false, colorIdentity: [], set: "Test Set" });
  });

  it("converts cards with display name correctly", async () => {
    const archidektDeck: ArchidektDeck = {
      id: 456,
      name: "Display Name Test",
      createdAt: "2023-01-01T00:00:00.000000Z",
      categories: [
        {
          id: 1,
          name: "Creature",
          isPremier: false,
          includedInDeck: true,
          includedInPrice: true,
        },
      ],
      cards: [
        {
          card: {
            displayName: "Display Name",
            uid: "test-uid-2",
            multiverseid: 789012,
            oracleCard: {
              name: "Oracle Name",
              faces: [],
              colorIdentity: [],
            },
            edition: { editionname: "Test Set", editioncode: "TST" },
          },
          quantity: 1,
          categories: ["Creature"],
        },
      ],
    };

    mockGateway.fetchDeck = async (_deckId: string) => archidektDeck;

    const request: ArchidektDeckRetrievalRequest = { deckSource: "archidekt", archidektDeckId: "456" };
    const result = await adapter.retrieveDeck(request);

    expect(result.cards.length).toBe(1);
    expect(result.cards[0]).toEqual({ name: "Display Name", scryfallId: "test-uid-2", multiverseid: 789012, twoFaced: false, oracleCardName: "Oracle Name", colorIdentity: [], set: "Test Set" });
  });

  it("converts deck with multiple commanders", async () => {
    const archidektDeck: ArchidektDeck = {
      id: 13083247,
      name: "Dual Commander Deck",
      createdAt: "2023-01-01T00:00:00.000000Z",
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
      ],
      cards: [
        {
          card: {
            uid: "jaheira-uid",
            multiverseid: 111111,
            oracleCard: { name: "Jaheira, Friend of the Forest", faces: [], colorIdentity: [] },
            edition: { editionname: "Test Set", editioncode: "TST" },
          },
          quantity: 1,
          categories: ["Commander"],
        },
        {
          card: {
            uid: "agent-uid",
            multiverseid: 222222,
            oracleCard: { name: "Agent of the Iron Throne", faces: [], colorIdentity: [] },
            edition: { editionname: "Test Set", editioncode: "TST" },
          },
          quantity: 1,
          categories: ["Commander"],
        },
        {
          card: {
            uid: "forest-uid",
            multiverseid: 333333,
            oracleCard: { name: "Forest", faces: [], colorIdentity: [] },
            edition: { editionname: "Test Set", editioncode: "TST" },
          },
          quantity: 20,
          categories: ["Land"],
        },
      ],
    };

    // Mock the gateway to return our test data
    mockGateway.fetchDeck = async (_deckId: string) => archidektDeck;

    const request: ArchidektDeckRetrievalRequest = { deckSource: "archidekt", archidektDeckId: "13083247" };
    const result = await adapter.retrieveDeck(request);

    expect(result.id).toBe(13083247);
    expect(result.name).toBe("Dual Commander Deck");
    expect(result.totalCards).toBe(22); // 20 non-commander cards + 2 commanders
    expect(result.commanders.length).toBe(2);
    expect(result.commanders[0]).toEqual({ name: "Jaheira, Friend of the Forest", scryfallId: "jaheira-uid", multiverseid: 111111, twoFaced: false, colorIdentity: [], set: "Test Set" });
    expect(result.commanders[1]).toEqual({ name: "Agent of the Iron Throne", scryfallId: "agent-uid", multiverseid: 222222, twoFaced: false, colorIdentity: [], set: "Test Set" });
  });

  it("handles deck with null categories", async () => {
    const archidektDeck: ArchidektDeck = {
      id: 555,
      name: "Deck with Null Categories",
      createdAt: "2023-01-01T00:00:00.000000Z",
      categories: null,
      cards: [
        {
          card: {
            uid: "lightning-bolt-uid",
            multiverseid: 111111,
            oracleCard: { name: "Lightning Bolt", faces: [], colorIdentity: [] },
            edition: { editionname: "Test Set", editioncode: "TST" },
          },
          quantity: 4,
          categories: ["Instant"],
        },
        {
          card: {
            uid: "mountain-uid",
            multiverseid: 222222,
            oracleCard: { name: "Mountain", faces: [], colorIdentity: [] },
            edition: { editionname: "Test Set", editioncode: "TST" },
          },
          quantity: 20,
          categories: ["Land"],
        },
      ],
    };

    // Mock the gateway to return our test data
    mockGateway.fetchDeck = async (_deckId: string) => archidektDeck;

    const request: ArchidektDeckRetrievalRequest = { deckSource: "archidekt", archidektDeckId: "555" };
    const result = await adapter.retrieveDeck(request);

    expect(result.id).toBe(555);
    expect(result.name).toBe("Deck with Null Categories");
    expect(result.totalCards).toBe(24); // All cards included when categories is null
    expect(result.commanders).toEqual([]);
    expect(result.provenance.sourceUrl).toBe("https://archidekt.com/decks/555");
  });

  it("converts real Ygra deck data using FilesystemArchidektGateway", async () => {
    const filesystemGateway = new FilesystemArchidektGateway("./test/decks");
    const adapter = new ArchidektDeckToDeckAdapter(filesystemGateway);

    const request: ArchidektDeckRetrievalRequest = { deckSource: "archidekt", archidektDeckId: "14669648" };
    const result = await adapter.retrieveDeck(request);

    expect(result.id).toBe(14669648);
    expect(result.name).toBe("Ygra EATS IT ALL");
    expect(result.commanders[0]).toMatchObject({ name: "Ygra, Eater of All", scryfallId: "b9ac7673-eae8-4c4b-889e-5025213a6151", multiverseid: 669155, twoFaced: false });
    expect(result.commanders[0].colorIdentity).toBeDefined();
    expect(result.commanders[0].set).toBeDefined();
    expect(result.totalCards).toBe(4); // 3 non-commander cards + 1 commander
    expect(result.provenance.sourceUrl).toBe("https://archidekt.com/decks/14669648");
    expect(result.provenance.deckSource).toBe("archidekt");
  });
});
