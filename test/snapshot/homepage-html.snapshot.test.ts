// Jest globals are available without imports
import fs from "node:fs/promises";
import path from "node:path";
import { formatHomepageHtml } from "../../src/view/load-deck-view.js";
import { AvailableDecks } from "../../src/port-deck-retrieval/types.js";

describe("Homepage HTML Snapshot Tests", () => {
  const snapshotDir = path.join(process.cwd(), "test", "snapshot", "snapshots");
  
  // Create fake deck data for testing
  const fakeAvailableDecks: AvailableDecks = [
    {
      description: "Test Commander Deck",
      deckSource: "local",
      localFile: "test-commander.json"
    },
    {
      description: "Example Aggro Deck", 
      deckSource: "local",
      localFile: "aggro-example.json"
    },
    {
      description: "Control Deck Sample",
      deckSource: "local", 
      localFile: "control-sample.json"
    }
  ];

  const emptyAvailableDecks: AvailableDecks = [];

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

  it("formatHomepageHtml with multiple local decks", async () => {
    const snapshotFile = "homepage-with-decks.html";
    const actualHtml = formatHomepageHtml(fakeAvailableDecks);
    
    // Normalize HTML for consistent comparison (remove env-dependent values)
    const normalizedHtml = actualHtml
      .replace(/apiKey: ".*?"/, 'apiKey: "TEST_API_KEY"')
      .replace(/\n\s*/g, '\n') // normalize whitespace
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

  it("formatHomepageHtml with no local decks", async () => {
    const snapshotFile = "homepage-no-decks.html";
    const actualHtml = formatHomepageHtml(emptyAvailableDecks);
    
    // Normalize HTML for consistent comparison
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