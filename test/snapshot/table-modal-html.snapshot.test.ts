// Jest globals are available without imports
import fs from "node:fs/promises";
import path from "node:path";
import { formatTableModalHtmlFragment } from "../../src/view/play-game/game-modals.js";
import { GameState } from "../../src/GameState.js";
import { Deck } from "../../src/types.js";
import { FilesystemArchidektGateway, ArchidektDeckToDeckAdapter } from "../../src/port-deck-retrieval/implementations.js";

describe("Table Modal HTML Snapshot Tests", () => {
  const snapshotDir = path.join(process.cwd(), "test", "snapshot", "snapshots");

  // Load real deck data for testing
  let testDeck: Deck;

  beforeAll(async () => {
    const filesystemGateway = new FilesystemArchidektGateway("./test/decks");
    const deterministicDate = new Date('2024-01-01T12:00:00Z');
    const adapter = new ArchidektDeckToDeckAdapter(filesystemGateway, deterministicDate);
    testDeck = await adapter.retrieveDeck({ deckSource: "archidekt", archidektDeckId: "75009" });
  });

  const createGameStateWithMultipleTableCards = (): GameState => {
    const gameState = GameState.newGame(456, testDeck, 42);
    gameState.startGame();

    // Draw some cards and play them to the table
    gameState.draw();
    gameState.draw();
    gameState.draw();
    const handCards = gameState.listHand();

    // Play multiple cards to table
    for (let i = 0; i < Math.min(3, handCards.length); i++) {
      const currentHand = gameState.listHand();
      if (currentHand.length > 0) {
        gameState.playCard(currentHand[0].gameCardIndex);
      }
    }

    return gameState;
  };

  const createGameStateWithSingleTableCard = (): GameState => {
    const gameState = GameState.newGame(789, testDeck, 42);
    gameState.startGame();

    // Draw a card and play it to the table
    gameState.draw();
    const handCards = gameState.listHand();
    if (handCards.length > 0) {
      gameState.playCard(handCards[0].gameCardIndex);
    }

    return gameState;
  };

  const createGameStateWithEmptyTable = (): GameState => {
    const gameState = GameState.newGame(123, testDeck, 42);
    gameState.startGame();
    // Don't play any cards, table remains empty
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

  it("formatTableModalHtml with multiple table cards", async () => {
    const snapshotFile = "table-modal-multiple-cards.html";
    const gameState = createGameStateWithMultipleTableCards();
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
    const gameState = createGameStateWithSingleTableCard();
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
    const gameState = createGameStateWithEmptyTable();
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