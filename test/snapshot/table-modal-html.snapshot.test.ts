// Jest globals are available without imports
import fs from "node:fs/promises";
import path from "node:path";
import { formatTableModalHtmlFragment } from "../../src/view/play-game/active-game-page.js";
import { GameState } from "../../src/GameState.js";
import { CardDefinition } from "../../src/types.js";
import { GameCard, GameStatus, TableLocation, PERSISTED_GAME_STATE_VERSION } from "../../src/port-persist-state/types.js";

describe("Table Modal HTML Snapshot Tests", () => {
  const snapshotDir = path.join(process.cwd(), "test", "snapshot", "snapshots");

  // Create fake card data for testing
  const createFakeCard = (name: string, index: number): CardDefinition => ({
    name,
    scryfallId: `fake-scryfall-id-${index.toString().padStart(3, "0")}`,
    multiverseid: 1000 + index,
  });

  const createFakeGameState = (tableCardCount: number): GameState => {
    // Cards must be sorted by name for GameState validation
    const tableCards = Array.from({ length: tableCardCount }, (_, i) =>
      createFakeCard(`Table Card ${String.fromCharCode(65 + i)}`, i)
    ).sort((a, b) => a.name.localeCompare(b.name));

    const commanders = [createFakeCard("Test Commander", 100)];

    // Create game cards on table
    const gameCards: GameCard[] = tableCards.map((card, index) => ({
      card,
      location: { type: "Table" } as TableLocation,
      gameCardIndex: index,
    }));

    const persistedState = {
      version: PERSISTED_GAME_STATE_VERSION,
      gameId: 456,
      status: GameStatus.Active,
      deckProvenance: {
        retrievedDate: new Date("2024-01-01T12:00:00Z"),
        sourceUrl: "https://archidekt.com/decks/12345/test-game",
        deckSource: "test" as const,
      },
      commanders,
      deckName: "Test Table Modal Deck",
      deckId: 12345,
      totalCards: tableCards.length,
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

  it("formatTableModalHtml with multiple table cards", async () => {
    const snapshotFile = "table-modal-multiple-cards.html";
    const gameState = createFakeGameState(3);
    const actualHtml = formatTableModalHtmlFragment(gameState);

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

  it("formatTableModalHtml with single table card", async () => {
    const snapshotFile = "table-modal-single-card.html";
    const gameState = createFakeGameState(1);
    const actualHtml = formatTableModalHtmlFragment(gameState);

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

  it("formatTableModalHtml with empty table", async () => {
    const snapshotFile = "table-modal-empty.html";
    const gameState = createFakeGameState(0);
    const actualHtml = formatTableModalHtmlFragment(gameState);

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