// Jest globals are available without imports
import fs from "node:fs/promises";
import path from "node:path";
import { formatDeckReviewHtmlPage } from "../../src/view/deck-review/deck-review-page.js";
import { GameState } from "../../src/GameState.js";
import { Deck } from "../../src/types.js";
import { FilesystemArchidektGateway, ArchidektDeckToDeckAdapter } from "../../src/port-deck-retrieval/implementations.js";

describe("Deck Review HTML Snapshot Tests", () => {
  const snapshotDir = path.join(process.cwd(), "test", "snapshot", "snapshots");

  // Load real deck data for testing
  let deckWithTwoSidedCards: Deck;

  beforeAll(async () => {
    const filesystemGateway = new FilesystemArchidektGateway("./test/decks");
    const deterministicDate = new Date("2024-01-01T12:00:00Z");
    const adapter = new ArchidektDeckToDeckAdapter(filesystemGateway, deterministicDate);
    // Deck 75009 contains two-sided cards like "Esika, God of the Tree // The Prismatic Bridge"
    deckWithTwoSidedCards = await adapter.retrieveDeck({ deckSource: "archidekt", archidektDeckId: "75009" });
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

  it("formatDeckReviewHtmlPage with deck containing two-sided cards", async () => {
    const snapshotFile = "deck-review-two-sided-cards.html";
    const gameState = GameState.newGame(789, deckWithTwoSidedCards);
    const actualHtml = formatDeckReviewHtmlPage(gameState);

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
