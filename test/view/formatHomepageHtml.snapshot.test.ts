import { test } from "node:test";
import { strict as assert } from "node:assert";
import { formatHomepageHtml } from "../../src/view/load-deck-view.js";
import { AvailableDecks } from "../../src/port-deck-retrieval/types.js";
import * as fs from "fs";
import * as path from "path";

const SNAPSHOT_DIR = path.join(import.meta.dirname, "snapshots");
const SNAPSHOT_FILE = path.join(SNAPSHOT_DIR, "formatHomepageHtml.html");

// Create fake deck data for testing
const testAvailableDecks: AvailableDecks = [
  {
    description: "Atraxa, Praetors' Voice Commander",
    deckSource: "local",
    localFile: "atraxa-commander.json"
  },
  {
    description: "Elspeth, Knight-Errant Planeswalker",
    deckSource: "local", 
    localFile: "elspeth-planeswalker.json"
  },
  {
    description: "Online Archidekt Deck",
    deckSource: "archidekt",
    archidektDeckId: "12345678"
  }
];

function ensureSnapshotDir() {
  if (!fs.existsSync(SNAPSHOT_DIR)) {
    fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  }
}

function readSnapshot(): string | null {
  try {
    return fs.readFileSync(SNAPSHOT_FILE, "utf8");
  } catch (error) {
    return null;
  }
}

function writeSnapshot(content: string) {
  ensureSnapshotDir();
  fs.writeFileSync(SNAPSHOT_FILE, content, "utf8");
}

test("formatHomepageHtml snapshot test", () => {
  const actualOutput = formatHomepageHtml(testAvailableDecks);
  const existingSnapshot = readSnapshot();

  if (existingSnapshot === null) {
    // No snapshot exists, create one
    writeSnapshot(actualOutput);
    console.log(`📸 Created new snapshot: ${SNAPSHOT_FILE}`);
    return;
  }

  if (actualOutput !== existingSnapshot) {
    // Output has changed - fail test and show diff
    console.log("❌ HTML output has changed!");
    console.log("Expected (snapshot):");
    console.log("---");
    console.log(existingSnapshot);
    console.log("---");
    console.log("Actual (current):");
    console.log("---");
    console.log(actualOutput);
    console.log("---");
    console.log(`💡 To update snapshot, delete ${SNAPSHOT_FILE} and run the test again`);
    
    assert.fail("HTML output differs from snapshot. Review changes and update snapshot if intentional.");
  }

  // Test passes - output matches snapshot
  console.log("✅ HTML output matches snapshot");
});