// Jest globals are available without imports
import fs from "node:fs/promises";
import path from "node:path";
import { formatGamePageHtmlPage } from "../../src/view/play-game/active-game-page.js";
import { GameState } from "../../src/GameState.js";
import { CardDefinition } from "../../src/types.js";
import { GameCard, GameStatus, LibraryLocation, HandLocation, TableLocation, PERSISTED_GAME_STATE_VERSION } from "../../src/port-persist-state/types.js";

describe("Game Page HTML Snapshot Tests", () => {
  const snapshotDir = path.join(process.cwd(), "test", "snapshot", "snapshots");

  // Create fake card data for testing
  const createFakeCard = (name: string, index: number): CardDefinition => ({
    name,
    scryfallId: `fake-scryfall-id-${index.toString().padStart(3, "0")}`,
    multiverseid: 1000 + index,
  });

  const createFakeGameState = (): GameState => {
    // Cards must be sorted by name for GameState validation
    const cards = [
      createFakeCard("Card A", 100),
      createFakeCard("Card B", 101),
      createFakeCard("Card C", 102),
      createFakeCard("Card D", 103),
      createFakeCard("Card E", 104),
    ];

    const commanders = [createFakeCard("Test Commander", 1)];

    // Create game cards in different locations
    const gameCards: GameCard[] = [
      // Cards in library
      {
        card: cards[0],
        location: { type: "Library", position: 0 } as LibraryLocation,
        gameCardIndex: 0,
        isCommander: false,
      },
      {
        card: cards[1],
        location: { type: "Library", position: 1 } as LibraryLocation,
        gameCardIndex: 1,
        isCommander: false,
      },
      // Cards in hand
      {
        card: cards[2],
        location: { type: "Hand", position: 0 } as HandLocation,
        gameCardIndex: 2,
        isCommander: false,
      },
      // Cards on table
      {
        card: cards[3],
        location: { type: "Table" } as TableLocation,
        gameCardIndex: 3,
        isCommander: false,
      },
    ];

    const persistedState = {
      version: PERSISTED_GAME_STATE_VERSION,
      gameId: 789,
      status: GameStatus.Active,
      deckProvenance: {
        retrievedDate: new Date("2024-01-01T12:00:00Z"),
        sourceUrl: "https://archidekt.com/decks/12345/test-game-page",
        deckSource: "test" as const,
      },
      commanders,
      deckName: "Test Game Page Deck",
      deckId: 12345,
      totalCards: cards.length,
      gameCards,
      events: [],
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

  it("formatGamePageHtml with active game state", async () => {
    const snapshotFile = "game-page-active-game.html";
    const gameState = createFakeGameState();
    const actualHtml = formatGamePageHtmlPage(gameState);

    // Normalize HTML for consistent comparison (remove env-dependent values)
    const normalizedHtml = actualHtml
      .replace(/apiKey: ".*?"/, 'apiKey: "TEST_API_KEY"')
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

  it("formatGamePageHtml with not started game state", async () => {
    const snapshotFile = "game-page-not-started.html";

    // Create a game state that hasn't started yet
    const cards = [createFakeCard("Card A", 100), createFakeCard("Card B", 101)].sort((a, b) => a.name.localeCompare(b.name));

    const gameCards: GameCard[] = cards.map((card, index) => ({
      card,
      location: { type: "Library", position: index } as LibraryLocation,
      gameCardIndex: index,
      isCommander: false,
    }));

    const persistedState = {
      version: PERSISTED_GAME_STATE_VERSION,
      gameId: 456,
      status: GameStatus.NotStarted,
      deckProvenance: {
        retrievedDate: new Date("2024-01-01T12:00:00Z"),
        sourceUrl: "https://archidekt.com/decks/12345/test-game-page-not-started",
        deckSource: "test" as const,
      },
      commanders: [createFakeCard("Test Commander", 1)],
      deckName: "Test Not Started Game Page",
      deckId: 12345,
      totalCards: cards.length,
      gameCards,
      events: [],
    };

    const notStartedGameState = GameState.fromPersistedGameState(persistedState);
    const actualHtml = formatGamePageHtmlPage(notStartedGameState);

    // Normalize HTML for consistent comparison (remove env-dependent values)
    const normalizedHtml = actualHtml
      .replace(/apiKey: ".*?"/, 'apiKey: "TEST_API_KEY"')
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