// Jest globals are available without imports
import fs from "node:fs/promises";
import path from "node:path";
import { GameState } from "../../src/GameState.js";
import { Deck } from "../../src/types.js";
import { FilesystemArchidektGateway, ArchidektDeckToDeckAdapter } from "../../src/port-deck-retrieval/implementations.js";
import { formatLibraryModalHtml } from "../../src/view/play-game/game-modals.js";

describe("Library Modal HTML Snapshot Tests", () => {
  const snapshotDir = path.join(process.cwd(), "test", "snapshot", "snapshots");

  // Load real deck data for testing
  let testDeck: Deck;

  beforeAll(async () => {
    const filesystemGateway = new FilesystemArchidektGateway("./test/decks");
    const deterministicDate = new Date('2024-01-01T12:00:00Z');
    const adapter = new ArchidektDeckToDeckAdapter(filesystemGateway, deterministicDate);
    testDeck = await adapter.retrieveDeck({ deckSource: "archidekt", archidektDeckId: "75009" });
  });

  const createGameStateWithMultipleLibraryCards = (): GameState => {
    const gameState = GameState.newGame(123, testDeck, 42);
    gameState.startGame();
    return gameState;
  };

  const createGameStateWithSingleLibraryCard = (): GameState => {
    const gameState = GameState.newGame(456, testDeck, 42);
    gameState.startGame();

    // Draw all but one card to leave just one in library
    const libraryCards = gameState.listLibrary();
    for (let i = 0; i < libraryCards.length - 1; i++) {
      gameState.draw();
    }

    return gameState;
  };

  const createGameStateWithEmptyLibrary = (): GameState => {
    const gameState = GameState.newGame(789, testDeck, 42);
    gameState.startGame();

    // Draw all cards to empty the library
    const libraryCards = gameState.listLibrary();
    for (let i = 0; i < libraryCards.length; i++) {
      gameState.draw();
    }

    return gameState;
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
    const gameState = createGameStateWithMultipleLibraryCards();
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
    const gameState = createGameStateWithSingleLibraryCard();
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
    const gameState = createGameStateWithEmptyLibrary();
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