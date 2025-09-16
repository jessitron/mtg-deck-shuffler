// Jest globals are available without imports
import fs from "node:fs/promises";
import path from "node:path";
import { formatHistoryModalHtmlFragment } from "../../src/view/play-game/history-components.js";
import { GameState } from "../../src/GameState.js";
import { Deck } from "../../src/types.js";
import { FilesystemArchidektGateway, ArchidektDeckToDeckAdapter } from "../../src/port-deck-retrieval/implementations.js";

describe("History Modal HTML Snapshot Tests", () => {
  const snapshotDir = path.join(process.cwd(), "test", "snapshot", "snapshots");

  // Load real deck data for testing
  let testDeck: Deck;

  beforeAll(async () => {
    const filesystemGateway = new FilesystemArchidektGateway("./test/decks");
    const adapter = new ArchidektDeckToDeckAdapter(filesystemGateway);
    const deterministicDate = new Date("2024-01-01T00:00:00.000Z");
    testDeck = await adapter.retrieveDeck({ deckSource: "archidekt", archidektDeckId: "75009" }, deterministicDate);
  });

  const createGameStateWithMultipleEvents = (): GameState => {
    const gameState = GameState.newGame(123, testDeck, 42);
    gameState.startGame();

    // Perform multiple actions to create events
    gameState.draw();
    gameState.draw();
    const handCards = gameState.listHand();
    if (handCards.length > 0) {
      gameState.playCard(handCards[0].gameCardIndex);
    }
    gameState.shuffle();

    return gameState;
  };

  const createGameStateWithSingleStartEvent = (): GameState => {
    const gameState = GameState.newGame(456, testDeck, 42);
    gameState.startGame();
    return gameState;
  };

  const createGameStateWithEmptyHistory = (): GameState => {
    const gameState = GameState.newGame(789, testDeck);
    // Don't start the game to have empty history
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

  it("formatHistoryModalHtmlFragment with multiple events", async () => {
    const snapshotFile = "history-modal-multiple-events.html";
    const gameState = createGameStateWithMultipleEvents();
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
    const gameState = createGameStateWithSingleStartEvent();
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
    const gameState = createGameStateWithEmptyHistory();
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