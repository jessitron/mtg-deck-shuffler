import { InMemoryPersistStateAdapter } from "../../src/port-persist-state/InMemoryPersistStateAdapter.js";
import { PersistedGameState, PERSISTED_GAME_STATE_VERSION } from "../../src/port-persist-state/types.js";
import { GameStatus } from "../../src/GameState.js";

describe("InMemoryPersistStateAdapter", () => {
  let adapter: InMemoryPersistStateAdapter;
  let testGameState: PersistedGameState;

  beforeEach(() => {
    adapter = new InMemoryPersistStateAdapter();
    testGameState = {
      version: PERSISTED_GAME_STATE_VERSION,
      gameId: 1,
      status: GameStatus.NotStarted,
      deckProvenance: {
        retrievedDate: new Date("2023-01-01"),
        sourceUrl: "https://test.com",
        deckSource: "test",
      },
      commanders: [
        {
          name: "Test Commander",
          scryfallId: "test-uid",
          multiverseid: 12345,
        },
      ],
      deckName: "Test Deck",
      deckId: 123,
      totalCards: 100,
      gameCards: [
        {
          card: {
            name: "Test Card",
            scryfallId: "card-uid",
            multiverseid: 67890,
          },
          location: { type: "Library", position: 0 },
          gameCardIndex: 0,
        },
      ],
      events: [],
    };
  });

  it("should generate new game IDs incrementally", () => {
    const id1 = adapter.newGameId();
    const id2 = adapter.newGameId();
    const id3 = adapter.newGameId();

    expect(id1).toBe(1);
    expect(id2).toBe(2);
    expect(id3).toBe(3);
  });

  it("should save and retrieve game state", async () => {
    const gameId = await adapter.save(testGameState);

    expect(gameId).toBe(testGameState.gameId);

    const retrieved = await adapter.retrieve(gameId);

    expect(retrieved).not.toBe(null);
    expect(retrieved).toEqual(testGameState);
    expect(retrieved).not.toBe(testGameState); // Should be a copy
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

    expect(retrieved1?.deckName).toEqual("Test Deck");
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
          moves: [],
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