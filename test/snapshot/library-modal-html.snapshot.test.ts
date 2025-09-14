// Jest globals are available without imports
import fs from "node:fs/promises";
import path from "node:path";
import { formatLibraryModalHtml } from "../../src/view/deck-review/deck-review-page.js";
import { GameState } from "../../src/GameState.js";
import { CardDefinition } from "../../src/types.js";
import { GameCard, GameStatus, LibraryLocation, PERSISTED_GAME_STATE_VERSION } from "../../src/port-persist-state/types.js";

describe("Library Modal HTML Snapshot Tests", () => {
  const snapshotDir = path.join(process.cwd(), "test", "snapshot", "snapshots");

  // Create fake card data for testing
  const createFakeCard = (name: string, index: number): CardDefinition => ({
    name,
    scryfallId: `fake-scryfall-id-${index.toString().padStart(3, "0")}`,
    multiverseid: 1000 + index,
  });

  const createFakeGameState = (cardCount: number): GameState => {
    // Cards must be sorted by name for GameState validation
    const cards = Array.from({ length: cardCount }, (_, i) =>
      createFakeCard(`Card ${String.fromCharCode(65 + i)}`, i)
    ).sort((a, b) => a.name.localeCompare(b.name));

    const commanders = [createFakeCard("Test Commander", 1)];

    // Create game cards in library
    const gameCards: GameCard[] = cards.map((card, index) => ({
      card,
      location: { type: "Library", position: index } as LibraryLocation,
      gameCardIndex: index,
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
      deckName: "Test Library Modal Deck",
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

  it("formatLibraryModalHtml with multiple library cards", async () => {
    const snapshotFile = "library-modal-multiple-cards.html";
    const gameState = createFakeGameState(5);
    const actualHtml = formatLibraryModalHtml(gameState);

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

  it("formatLibraryModalHtml with single library card", async () => {
    const snapshotFile = "library-modal-single-card.html";
    const gameState = createFakeGameState(1);
    const actualHtml = formatLibraryModalHtml(gameState);

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

  it("formatLibraryModalHtml with empty library", async () => {
    const snapshotFile = "library-modal-empty.html";
    const gameState = createFakeGameState(0);
    const actualHtml = formatLibraryModalHtml(gameState);

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