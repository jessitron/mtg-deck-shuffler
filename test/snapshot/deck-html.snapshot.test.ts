// Jest globals are available without imports
import fs from "node:fs/promises";
import path from "node:path";
import { formatDeckHtmlSection } from "../../src/view/deck-selection/deck-selection-page.js";
import { Deck } from "../../src/types.js";
import { FilesystemArchidektGateway, ArchidektDeckToDeckAdapter } from "../../src/port-deck-retrieval/implementations.js";

describe("Deck HTML Snapshot Tests", () => {
  const snapshotDir = path.join(process.cwd(), "test", "snapshot", "snapshots");

  // Load real deck data for testing
  let testDeck1: Deck;
  let testDeck2: Deck;

  beforeAll(async () => {
    const filesystemGateway = new FilesystemArchidektGateway("./test/decks");
    const adapter = new ArchidektDeckToDeckAdapter(filesystemGateway);
    testDeck1 = await adapter.retrieveDeck({ deckSource: "archidekt", archidektDeckId: "75009" });
    testDeck2 = await adapter.retrieveDeck({ deckSource: "archidekt", archidektDeckId: "14669648" });
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

  it("formatDeckHtml with first test deck", async () => {
    const snapshotFile = "deck-test-1.html";
    const actualHtml = formatDeckHtmlSection(testDeck1);
    
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

  it("formatDeckHtml with second test deck", async () => {
    const snapshotFile = "deck-test-2.html";
    const actualHtml = formatDeckHtmlSection(testDeck2);
    
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

  it("formatDeckHtml with deck subset", async () => {
    const snapshotFile = "deck-subset.html";
    // Create a subset of testDeck1 with fewer cards for different test case
    const subsetDeck = {
      ...testDeck1,
      name: testDeck1.name + " (Subset)",
      cards: testDeck1.cards.slice(0, 5), // Just first 5 cards
      totalCards: 5
    };
    const actualHtml = formatDeckHtmlSection(subsetDeck);
    
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