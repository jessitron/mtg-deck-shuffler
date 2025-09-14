// Jest globals are available without imports
import fs from "node:fs/promises";
import path from "node:path";
import { formatGameHtmlSection } from "../../src/view/play-game/active-game-page.js";
import { GameState } from "../../src/GameState.js";
import { CardDefinition } from "../../src/types.js";
import { GameCard, GameStatus, LibraryLocation, HandLocation, RevealedLocation, TableLocation } from "../../src/port-persist-state/types.js";
import { StartGameEvent } from "../../src/GameEvents.js";

describe("Game HTML Snapshot Tests", () => {
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
      createFakeCard("Command Tower", 103), // C
      createFakeCard("Counterspell", 101), // C
      createFakeCard("Island", 104), // I
      createFakeCard("Lightning Bolt", 100), // L
      createFakeCard("Mountain", 105), // M
      createFakeCard("Sol Ring", 102), // S
    ];

    const commanders = [createFakeCard("Atraxa, Praetors' Voice", 1)];

    // Create game cards in different locations
    const gameCards: GameCard[] = [
      // Cards in library
      {
        card: cards[0], // Command Tower
        location: { type: "Library", position: 0 } as LibraryLocation,
        gameCardIndex: 0,
      },
      {
        card: cards[1], // Counterspell
        location: { type: "Library", position: 1 } as LibraryLocation,
        gameCardIndex: 1,
      },
      // Cards in hand
      {
        card: cards[2], // Island
        location: { type: "Hand", position: 0 } as HandLocation,
        gameCardIndex: 2,
      },
      {
        card: cards[3], // Lightning Bolt
        location: { type: "Hand", position: 1 } as HandLocation,
        gameCardIndex: 3,
      },
      // Cards revealed
      {
        card: cards[4], // Mountain
        location: { type: "Revealed", position: 0 } as RevealedLocation,
        gameCardIndex: 4,
      },
      // Cards on table
      {
        card: cards[5], // Sol Ring
        location: { type: "Table" } as TableLocation,
        gameCardIndex: 5,
      },
    ];

    const persistedState = {
      version: 2 as const,
      gameId: 123,
      status: GameStatus.Active,
      deckProvenance: {
        retrievedDate: new Date("2024-01-01T12:00:00Z"),
        sourceUrl: "https://archidekt.com/decks/12345/test-game",
        deckSource: "test" as const,
      },
      commanders,
      deckName: "Test Game Deck",
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

  it("formatGameHtml with cards in hand, revealed, and on table", async () => {
    const snapshotFile = "game-active-state.html";
    const gameState = createFakeGameState();
    const actualHtml = formatGameHtmlSection(gameState, {});

    // Normalize HTML for consistent comparison (remove env-dependent values)
    const normalizedHtml = actualHtml
      .replace(/apiKey: ".*?"/, 'apiKey: "TEST_API_KEY"')
      .replace(/\n\s*/g, "\n")
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

        throw new Error(
          `Snapshot mismatch for ${snapshotFile}.\n` +
            `Expected content matches snapshot file: test/snapshot/snapshots/${snapshotFile}\n` +
            `Actual content written to: test/snapshot/snapshots/${snapshotFile}.actual\n` +
            `Run snapshot tests to update if changes are expected.`
        );
      }
    }
  });

  it("formatGameHtml with not started game state", async () => {
    const snapshotFile = "game-not-started-state.html";

    // Create a game state that hasn't started yet
    const gameState = createFakeGameState();
    // Change status to NotStarted by creating a fresh persisted state
    const cards = [createFakeCard("Lightning Bolt", 100), createFakeCard("Sol Ring", 102)].sort((a, b) => a.name.localeCompare(b.name));

    const gameCards: GameCard[] = cards.map((card, index) => ({
      card,
      location: { type: "Library", position: index } as LibraryLocation,
      gameCardIndex: index,
    }));

    const persistedState = {
      version: 2 as const,
      gameId: 456,
      status: GameStatus.NotStarted,
      deckProvenance: {
        retrievedDate: new Date("2024-01-01T12:00:00Z"),
        sourceUrl: "https://archidekt.com/decks/12345/test-game",
        deckSource: "test" as const,
      },
      commanders: [createFakeCard("Atraxa, Praetors' Voice", 1)],
      deckName: "Test Not Started Game",
      deckId: 12345,
      totalCards: cards.length,
      gameCards,
      events: [StartGameEvent],
    };

    const notStartedGameState = GameState.fromPersistedGameState(persistedState);
    const actualHtml = formatGameHtmlSection(notStartedGameState, {});

    // Normalize HTML for consistent comparison (remove env-dependent values)
    const normalizedHtml = actualHtml
      .replace(/apiKey: ".*?"/, 'apiKey: "TEST_API_KEY"')
      .replace(/\n\s*/g, "\n")
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

        throw new Error(
          `Snapshot mismatch for ${snapshotFile}.\n` +
            `Expected content matches snapshot file: test/snapshot/snapshots/${snapshotFile}\n` +
            `Actual content written to: test/snapshot/snapshots/${snapshotFile}.actual\n` +
            `Run snapshot tests to update if changes are expected.`
        );
      }
    }
  });
});
