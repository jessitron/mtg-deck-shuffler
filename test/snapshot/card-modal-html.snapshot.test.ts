// Jest globals are available without imports
import fs from "node:fs/promises";
import path from "node:path";
import { formatCardModalHtmlFragment } from "../../src/view/play-game/game-modals.js";
import { GameState } from "../../src/GameState.js";
import { Deck } from "../../src/types.js";
import { FilesystemArchidektGateway, ArchidektDeckToDeckAdapter } from "../../src/port-deck-retrieval/implementations.js";

describe("Card Modal HTML Snapshot Tests", () => {
  const snapshotDir = path.join(process.cwd(), "test", "snapshot", "snapshots");

  // Load real deck data for testing
  let testDeck: Deck;

  beforeAll(async () => {
    const filesystemGateway = new FilesystemArchidektGateway("./test/decks");
    const deterministicDate = new Date('2024-01-01T12:00:00Z');
    const adapter = new ArchidektDeckToDeckAdapter(filesystemGateway, deterministicDate);
    testDeck = await adapter.retrieveDeck({ deckSource: "archidekt", archidektDeckId: "75009" });
  });

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

  it("formatCardModalHtmlFragment for library card includes both modal close calls", async () => {
    const snapshotFile = "card-modal-library-card.html";
    const gameState = GameState.newGame(123, testDeck, 42);
    gameState.startGame();
    
    const libraryCards = gameState.listLibrary();
    const firstCard = libraryCards[0];
    
    const actualHtml = formatCardModalHtmlFragment(firstCard, gameState.gameId, gameState.getStateVersion());

    // Normalize HTML for consistent comparison
    const normalizedHtml = actualHtml
      .replace(/\n\s*/g, '\n')
      .trim();

    // Verify that the HTML contains both close-card-modal and close-modal calls
    expect(normalizedHtml).toContain("htmx.ajax('GET', '/close-card-modal'");
    expect(normalizedHtml).toContain("htmx.ajax('GET', '/close-modal'");
    
    // Verify they are in the same hx-on::after-request attribute
    const afterRequestMatch = normalizedHtml.match(/hx-on::after-request="([^"]*)"/);
    expect(afterRequestMatch).toBeTruthy();
    if (afterRequestMatch) {
      const afterRequestContent = afterRequestMatch[1];
      expect(afterRequestContent).toContain("htmx.ajax('GET', '/close-card-modal'");
      expect(afterRequestContent).toContain("htmx.ajax('GET', '/close-modal'");
    }

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

  it("formatCardModalHtmlFragment for revealed card includes both modal close calls", async () => {
    const snapshotFile = "card-modal-revealed-card.html";
    const gameState = GameState.newGame(456, testDeck, 42);
    gameState.startGame();
    
    // Reveal a card
    const libraryCards = gameState.listLibrary();
    const cardToReveal = libraryCards[0];
    gameState.revealByGameCardIndex(cardToReveal.gameCardIndex);
    
    const revealedCards = gameState.listRevealed();
    const revealedCard = revealedCards[0];
    
    const actualHtml = formatCardModalHtmlFragment(revealedCard, gameState.gameId, gameState.getStateVersion());

    // Normalize HTML for consistent comparison
    const normalizedHtml = actualHtml
      .replace(/\n\s*/g, '\n')
      .trim();

    // Verify that the HTML contains both close-card-modal and close-modal calls
    expect(normalizedHtml).toContain("htmx.ajax('GET', '/close-card-modal'");
    expect(normalizedHtml).toContain("htmx.ajax('GET', '/close-modal'");

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
