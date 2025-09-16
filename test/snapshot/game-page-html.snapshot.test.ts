// Jest globals are available without imports
import fs from "node:fs/promises";
import path from "node:path";
import { formatGamePageHtmlPage } from "../../src/view/play-game/active-game-page.js";
import { GameState } from "../../src/GameState.js";
import { Deck } from "../../src/types.js";
import { FilesystemArchidektGateway, ArchidektDeckToDeckAdapter } from "../../src/port-deck-retrieval/implementations.js";

describe("Game Page HTML Snapshot Tests", () => {
  const snapshotDir = path.join(process.cwd(), "test", "snapshot", "snapshots");

  // Load real deck data for testing
  let testDeck: Deck;

  beforeAll(async () => {
    const filesystemGateway = new FilesystemArchidektGateway("./test/decks");
    const adapter = new ArchidektDeckToDeckAdapter(filesystemGateway);
    testDeck = await adapter.retrieveDeck({ deckSource: "archidekt", archidektDeckId: "75009" });
  });

  const createActiveGameState = (): GameState => {
    const gameState = GameState.newGame(789, testDeck, 42);
    gameState.startGame();

    // Draw some cards to hand
    gameState.draw();
    gameState.draw();

    // Play a card to table
    const handCards = gameState.listHand();
    if (handCards.length > 0) {
      gameState.playCard(handCards[0].gameCardIndex);
    }

    return gameState;
  };

  const createNotStartedGameState = (): GameState => {
    const gameState = GameState.newGame(456, testDeck);
    // Don't start the game
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

  it("formatGamePageHtml with active game state", async () => {
    const snapshotFile = "game-page-active-game.html";
    const gameState = createActiveGameState();
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
    const notStartedGameState = createNotStartedGameState();
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