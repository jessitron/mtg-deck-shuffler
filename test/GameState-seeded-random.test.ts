import { GameState } from "../src/GameState.js";
import { Deck, CardDefinition, DeckProvenance, PERSISTED_DECK_VERSION } from "../src/types.js";

describe("GameState seeded random shuffling", () => {
  let testDeck: Deck;

  beforeEach(() => {
    const cards: CardDefinition[] = [
      { name: "Card A", scryfallId: "a1", multiverseid: 1, twoFaced: false, oracleCardName: "Card A", colorIdentity: [], set: "TST", types: ["Creature"], cmc: 1 },
      { name: "Card B", scryfallId: "b1", multiverseid: 2, twoFaced: false, oracleCardName: "Card B", colorIdentity: [], set: "TST", types: ["Creature"], cmc: 2 },
      { name: "Card C", scryfallId: "c1", multiverseid: 3, twoFaced: false, oracleCardName: "Card C", colorIdentity: [], set: "TST", types: ["Creature"], cmc: 3 },
      { name: "Card D", scryfallId: "d1", multiverseid: 4, twoFaced: false, oracleCardName: "Card D", colorIdentity: [], set: "TST", types: ["Creature"], cmc: 4 },
      { name: "Card E", scryfallId: "e1", multiverseid: 5, twoFaced: false, oracleCardName: "Card E", colorIdentity: [], set: "TST", types: ["Creature"], cmc: 5 },
    ];

    const testProvenance: DeckProvenance = {
      retrievedDate: new Date(),
      sourceUrl: "test://example.com",
      deckSource: "test",
    };

    testDeck = {
      version: PERSISTED_DECK_VERSION,
      id: 12345,
      name: "Test Deck",
      totalCards: 5,
      provenance: testProvenance,
      cards,
      commanders: [],
    };
  });

  test("shuffling with same seed produces identical results", () => {
    const seed = 42;

    const gameState1 = GameState.newGame(1, 1, 1, testDeck, seed);
    gameState1.startGame();
    const library1 = gameState1.listLibrary().map(card => card.card.name);

    const gameState2 = GameState.newGame(2, 1, 1, testDeck, seed);
    gameState2.startGame();
    const library2 = gameState2.listLibrary().map(card => card.card.name);

    expect(library1).toEqual(library2);
  });

  test("shuffling with different seeds produces different results", () => {
    const gameState1 = GameState.newGame(1, 1, 1, testDeck, 42);
    gameState1.startGame();
    const library1 = gameState1.listLibrary().map(card => card.card.name);

    const gameState2 = GameState.newGame(2, 1, 1, testDeck, 123);
    gameState2.startGame();
    const library2 = gameState2.listLibrary().map(card => card.card.name);

    expect(library1).not.toEqual(library2);
  });

  test("shuffling without seed still works (random)", () => {
    const gameState = GameState.newGame(1, 1, 1, testDeck);
    gameState.startGame();
    const library = gameState.listLibrary();

    expect(library).toHaveLength(5);
    expect(library.map(card => card.card.name)).toContain("Card A");
    expect(library.map(card => card.card.name)).toContain("Card B");
    expect(library.map(card => card.card.name)).toContain("Card C");
    expect(library.map(card => card.card.name)).toContain("Card D");
    expect(library.map(card => card.card.name)).toContain("Card E");
  });
});