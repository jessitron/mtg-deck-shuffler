import { describe, it, beforeEach } from "node:test";
import { strict as assert } from "node:assert";
import { InMemoryPersistStateAdapter } from "../../src/port-persist-state/InMemoryPersistStateAdapter.js";
import { PersistedGameState } from "../../src/port-persist-state/types.js";
import { GameStatus } from "../../src/GameState.js";

describe("InMemoryPersistStateAdapter", () => {
  let adapter: InMemoryPersistStateAdapter;
  let testGameState: PersistedGameState;

  beforeEach(() => {
    adapter = new InMemoryPersistStateAdapter();
    testGameState = {
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
          uid: "test-uid",
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
            uid: "card-uid",
            multiverseid: 67890,
          },
          location: { type: "Library", position: 0 },
        },
      ],
    };
  });

  it("should generate new game IDs incrementally", () => {
    const id1 = adapter.newGameId();
    const id2 = adapter.newGameId();
    const id3 = adapter.newGameId();

    assert.equal(id1, 1);
    assert.equal(id2, 2);
    assert.equal(id3, 3);
  });

  it("should save and retrieve game state", async () => {
    const gameId = await adapter.save(testGameState);

    assert.equal(gameId, testGameState.gameId);

    const retrieved = await adapter.retrieve(gameId);

    assert.notEqual(retrieved, null);
    assert.deepEqual(retrieved, testGameState);
    assert.notStrictEqual(retrieved, testGameState); // Should be a copy
  });

  it("should return null for non-existent game ID", async () => {
    const retrieved = await adapter.retrieve(999);
    assert.equal(retrieved, null);
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

    assert.deepEqual(retrieved1?.deckName, "Test Deck");
    assert.deepEqual(retrieved2?.deckName, "Second Deck");
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

    assert.equal(retrieved?.status, GameStatus.Active);
    assert.equal(retrieved?.deckName, "Updated Deck Name");
  });
});