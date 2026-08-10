import { InMemoryPersistStateAdapter } from "../../src/port-persist-state/InMemoryPersistStateAdapter.js";
import { PersistedGameState, PERSISTED_GAME_STATE_VERSION } from "../../src/port-persist-state/types.js";
import { GameStatus } from "../../src/GameState.js";
import * as fc from "fast-check";
import { deckWithOneCommander, createTestPersistedGameState } from "../generators.js";
import { InMemoryCardRepositoryAdapter } from "../../src/port-card-repository/InMemoryCardRepositoryAdapter.js";
import { CardRepositoryPort } from "../../src/port-card-repository/types.js";
import { GAME_ID_WORD_FORMAT } from "../../src/gameIdGenerator.js";

describe("InMemoryPersistStateAdapter", () => {
  let adapter: InMemoryPersistStateAdapter;
  let cardRepository: CardRepositoryPort;
  let testGameState: PersistedGameState;

  beforeEach(async () => {
    cardRepository = new InMemoryCardRepositoryAdapter();
    adapter = new InMemoryPersistStateAdapter(cardRepository);

    // Use generator to create test deck, then convert to PersistedGameState
    const testDeck = fc.sample(deckWithOneCommander, { numRuns: 1 })[0];

    // Save all cards to the repository so they can be hydrated later
    await cardRepository.saveCards([...testDeck.cards, ...testDeck.commanders]);

    testGameState = createTestPersistedGameState(1, testDeck, GameStatus.Active);
  });

  it("should generate fun word-combo game IDs, not sequential numbers", () => {
    const id1 = adapter.newGameId();
    const id2 = adapter.newGameId();
    const id3 = adapter.newGameId();

    // Not derivable from one another the way sequential integers are.
    expect(id1).not.toBe(id2);
    expect(id2).not.toBe(id3);
    for (const id of [id1, id2, id3]) {
      expect(typeof id).toBe("string");
      expect(id as string).toMatch(GAME_ID_WORD_FORMAT);
    }
  });

  it("should save and retrieve game state", async () => {
    const gameId = await adapter.save(testGameState);

    expect(gameId).toBe(testGameState.gameId);

    const retrieved = await adapter.retrieve(gameId);

    expect(retrieved).not.toBe(null);
    expect(retrieved).toEqual(testGameState);
    expect(retrieved).not.toBe(testGameState); // Should be a copy
  });

  it("should save and retrieve a game with a word-combo id (new format)", async () => {
    const wordIdGameState: PersistedGameState = {
      ...testGameState,
      gameId: "brave-falcon-42",
    };

    const gameId = await adapter.save(wordIdGameState);
    expect(gameId).toBe("brave-falcon-42");

    const retrieved = await adapter.retrieve("brave-falcon-42");
    expect(retrieved).toEqual(wordIdGameState);
  });

  it("should still load an old game saved with a plain numeric id", async () => {
    const oldNumericGameState: PersistedGameState = {
      ...testGameState,
      gameId: 47,
    };

    await adapter.save(oldNumericGameState);

    const retrieved = await adapter.retrieve(47);
    expect(retrieved).toEqual(oldNumericGameState);
  });

  it("should return null for non-existent game ID", async () => {
    const retrieved = await adapter.retrieve(999);
    expect(retrieved).toBe(null);
  });

  it("should store multiple game states independently", async () => {
    const gameState2: PersistedGameState = {
      ...testGameState,
      gameId: 2,
      deckName: "Second Deck",
    };

    await adapter.save(testGameState);
    await adapter.save(gameState2);

    const retrieved1 = await adapter.retrieve(1);
    const retrieved2 = await adapter.retrieve(2);

    expect(retrieved1?.deckName).toEqual(testGameState.deckName);
    expect(retrieved2?.deckName).toEqual("Second Deck");
  });

  it("should update existing game state when saving with same ID", async () => {
    await adapter.save(testGameState);

    const updatedGameState: PersistedGameState = {
      ...testGameState,
      status: GameStatus.Active,
      deckName: "Updated Deck Name",
    };

    await adapter.save(updatedGameState);

    const retrieved = await adapter.retrieve(testGameState.gameId);

    expect(retrieved?.status).toBe(GameStatus.Active);
    expect(retrieved?.deckName).toBe("Updated Deck Name");
  });

  it("should persist gameEventIndex in events", async () => {
    const gameStateWithEvents: PersistedGameState = {
      ...testGameState,
      events: [
        {
          eventName: "start game",
          gameEventIndex: 0,
        },
        {
          eventName: "shuffle library",
          compactMoves: [],
          gameEventIndex: 1,
        },
      ],
    };

    await adapter.save(gameStateWithEvents);
    const retrieved = await adapter.retrieve(gameStateWithEvents.gameId);

    expect(retrieved?.events).toHaveLength(2);
    expect(retrieved?.events[0].gameEventIndex).toBe(0);
    expect(retrieved?.events[1].gameEventIndex).toBe(1);
  });
});