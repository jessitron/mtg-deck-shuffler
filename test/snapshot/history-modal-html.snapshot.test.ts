// Jest globals are available without imports
import fs from "node:fs/promises";
import path from "node:path";
import { formatHistoryModalHtmlFragment } from "../../src/view/play-game/history-components.js";
import { GameState } from "../../src/GameState.js";
import { CardDefinition } from "../../src/types.js";
import { GameCard, GameStatus, LibraryLocation, PERSISTED_GAME_STATE_VERSION, TableLocation } from "../../src/port-persist-state/types.js";
import { GameEvent, MoveCardEvent, ShuffleEvent, StartEvent } from "../../src/GameEvents.js";

describe("History Modal HTML Snapshot Tests", () => {
  const snapshotDir = path.join(process.cwd(), "test", "snapshot", "snapshots");

  // Create fake card data for testing
  const createFakeCard = (name: string, index: number): CardDefinition => ({
    name,
    scryfallId: `fake-scryfall-id-${index.toString().padStart(3, "0")}`,
    multiverseid: 1000 + index,
  });

  const createFakeGameStateWithEvents = (events: GameEvent[]): GameState => {
    // Cards must be sorted by name for GameState validation
    const cards = [
      createFakeCard("Lightning Bolt", 0),
      createFakeCard("Mountain", 1),
      createFakeCard("Shock", 2),
    ].sort((a, b) => a.name.localeCompare(b.name));

    const commanders = [createFakeCard("Test Commander", 1)];

    // Create game cards in library
    const gameCards: GameCard[] = cards.map((card, index) => ({
      card,
      location: { type: "Library", position: index } as LibraryLocation,
      gameCardIndex: index,
      isCommander: false,
    }));

    const persistedState = {
      version: PERSISTED_GAME_STATE_VERSION,
      gameId: 123,
      status: GameStatus.Active,
      deckProvenance: {
        retrievedDate: new Date("2024-01-01T12:00:00Z"),
        sourceUrl: "https://archidekt.com/decks/12345/test-game",
        deckSource: "test" as const,
      },
      commanders,
      deckName: "Test History Modal Deck",
      deckId: 12345,
      totalCards: cards.length,
      gameCards,
      events,
    };

    return GameState.fromPersistedGameState(persistedState);
  };

  async function ensureSnapshotDir() {
    try {
      await fs.mkdir(snapshotDir, { recursive: true });
    } catch (error) {
      // Directory already exists
    }
  }

  async function readSnapshot(filename: string): Promise<string | null> {
    try {
      return await fs.readFile(path.join(snapshotDir, filename), "utf-8");
    } catch {
      return null;
    }
  }

  async function writeSnapshot(filename: string, content: string): Promise<void> {
    await ensureSnapshotDir();
    await fs.writeFile(path.join(snapshotDir, filename), content, "utf-8");
  }

  it("formatHistoryModalHtmlFragment with multiple events", async () => {
    const snapshotFile = "history-modal-multiple-events.html";

    const events: GameEvent[] = [
      { eventName: "start game", gameEventIndex: 0 },
      {
        eventName: "move card",
        gameEventIndex: 1,
        move: {
          gameCardIndex: 0,
          fromLocation: { type: "Library", position: 0 } as LibraryLocation,
          toLocation: { type: "Table" } as TableLocation,
        }
      },
      {
        eventName: "shuffle library",
        gameEventIndex: 2,
        moves: [
          {
            gameCardIndex: 1,
            fromLocation: { type: "Library", position: 1 } as LibraryLocation,
            toLocation: { type: "Library", position: 2 } as LibraryLocation,
          },
          {
            gameCardIndex: 2,
            fromLocation: { type: "Library", position: 2 } as LibraryLocation,
            toLocation: { type: "Library", position: 1 } as LibraryLocation,
          }
        ]
      },
    ];

    const gameState = createFakeGameStateWithEvents(events);
    const actualHtml = formatHistoryModalHtmlFragment(gameState);

    // Normalize HTML for consistent comparison
    const normalizedHtml = actualHtml
      .replace(/\n\s*/g, '\n')
      .trim();

    const existingSnapshot = await readSnapshot(snapshotFile);

    if (existingSnapshot === null) {
      // No snapshot exists, create it
      await writeSnapshot(snapshotFile, normalizedHtml);
      console.log(`Created new snapshot: ${snapshotFile}`);
    } else {
      // Compare with existing snapshot
      const normalizedSnapshot = existingSnapshot.trim();

      if (normalizedHtml !== normalizedSnapshot) {
        // Write the actual output for comparison
        await writeSnapshot(`${snapshotFile}.actual`, normalizedHtml);

        throw new Error(`Snapshot mismatch for ${snapshotFile}.\n` +
          `Expected content matches snapshot file: test/snapshot/snapshots/${snapshotFile}\n` +
          `Actual content written to: test/snapshot/snapshots/${snapshotFile}.actual\n` +
          `Run snapshot tests to update if changes are expected.`);
      }
    }
  });

  it("formatHistoryModalHtmlFragment with single start event", async () => {
    const snapshotFile = "history-modal-single-event.html";

    const events: GameEvent[] = [
      { eventName: "start game", gameEventIndex: 0 },
    ];

    const gameState = createFakeGameStateWithEvents(events);
    const actualHtml = formatHistoryModalHtmlFragment(gameState);

    // Normalize HTML for consistent comparison
    const normalizedHtml = actualHtml
      .replace(/\n\s*/g, '\n')
      .trim();

    const existingSnapshot = await readSnapshot(snapshotFile);

    if (existingSnapshot === null) {
      // No snapshot exists, create it
      await writeSnapshot(snapshotFile, normalizedHtml);
      console.log(`Created new snapshot: ${snapshotFile}`);
    } else {
      // Compare with existing snapshot
      const normalizedSnapshot = existingSnapshot.trim();

      if (normalizedHtml !== normalizedSnapshot) {
        // Write the actual output for comparison
        await writeSnapshot(`${snapshotFile}.actual`, normalizedHtml);

        throw new Error(`Snapshot mismatch for ${snapshotFile}.\n` +
          `Expected content matches snapshot file: test/snapshot/snapshots/${snapshotFile}\n` +
          `Actual content written to: test/snapshot/snapshots/${snapshotFile}.actual\n` +
          `Run snapshot tests to update if changes are expected.`);
      }
    }
  });

  it("formatHistoryModalHtmlFragment with empty history", async () => {
    const snapshotFile = "history-modal-empty.html";

    const events: GameEvent[] = [];

    const gameState = createFakeGameStateWithEvents(events);
    const actualHtml = formatHistoryModalHtmlFragment(gameState);

    // Normalize HTML for consistent comparison
    const normalizedHtml = actualHtml
      .replace(/\n\s*/g, '\n')
      .trim();

    const existingSnapshot = await readSnapshot(snapshotFile);

    if (existingSnapshot === null) {
      // No snapshot exists, create it
      await writeSnapshot(snapshotFile, normalizedHtml);
      console.log(`Created new snapshot: ${snapshotFile}`);
    } else {
      // Compare with existing snapshot
      const normalizedSnapshot = existingSnapshot.trim();

      if (normalizedHtml !== normalizedSnapshot) {
        // Write the actual output for comparison
        await writeSnapshot(`${snapshotFile}.actual`, normalizedHtml);

        throw new Error(`Snapshot mismatch for ${snapshotFile}.\n` +
          `Expected content matches snapshot file: test/snapshot/snapshots/${snapshotFile}\n` +
          `Actual content written to: test/snapshot/snapshots/${snapshotFile}.actual\n` +
          `Run snapshot tests to update if changes are expected.`);
      }
    }
  });
});