// Jest globals are available without imports
import fs from "node:fs/promises";
import path from "node:path";
import { formatDeckHtml } from "../../src/html-formatters.js";
import { Deck, CardDefinition } from "../../src/types.js";

describe("Deck HTML Snapshot Tests", () => {
  const snapshotDir = path.join(process.cwd(), "test", "snapshot", "snapshots");
  
  // Create fake card data for testing
  const createFakeCard = (name: string, index: number): CardDefinition => ({
    name,
    scryfallId: `fake-scryfall-id-${index.toString().padStart(3, '0')}`,
    multiverseid: 1000 + index
  });

  const createFakeDeck = (commanderCount: number): Deck => {
    const commanders: CardDefinition[] = [];
    if (commanderCount >= 1) {
      commanders.push(createFakeCard("Atraxa, Praetors' Voice", 1));
    }
    if (commanderCount >= 2) {
      commanders.push(createFakeCard("Breya, Etherium Shaper", 2));
    }

    const cards = [
      createFakeCard("Lightning Bolt", 100),
      createFakeCard("Counterspell", 101),
      createFakeCard("Sol Ring", 102)
    ];

    return {
      id: 12345,
      name: `Test Deck with ${commanderCount} Commander${commanderCount !== 1 ? 's' : ''}`,
      totalCards: cards.length,
      commanders,
      cards,
      provenance: {
        retrievedDate: new Date('2024-01-01T12:00:00Z'),
        sourceUrl: "https://archidekt.com/decks/12345/test-deck",
        deckSource: "test"
      }
    };
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

  it("formatDeckHtml with zero commanders", async () => {
    const snapshotFile = "deck-zero-commanders.html";
    const deck = createFakeDeck(0);
    const actualHtml = formatDeckHtml(deck);
    
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

  it("formatDeckHtml with one commander", async () => {
    const snapshotFile = "deck-one-commander.html";
    const deck = createFakeDeck(1);
    const actualHtml = formatDeckHtml(deck);
    
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

  it("formatDeckHtml with two commanders", async () => {
    const snapshotFile = "deck-two-commanders.html";
    const deck = createFakeDeck(2);
    const actualHtml = formatDeckHtml(deck);
    
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