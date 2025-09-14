// Jest globals are available without imports
import fs from "node:fs/promises";
import path from "node:path";
import { formatErrorPageHtmlPage } from "../../src/view/error-view.js";

describe("Error Page HTML Snapshot Tests", () => {
  const snapshotDir = path.join(process.cwd(), "test", "snapshot", "snapshots");

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

  it("formatErrorPageHtml with deck load error", async () => {
    const snapshotFile = "error-page-deck-load.html";
    const actualHtml = formatErrorPageHtmlPage({
      icon: "🚫",
      title: "Deck Load Error",
      message: `Could not fetch deck <strong>12345</strong> from <strong>archidekt</strong>.`,
      details: "The deck may not exist, be private, or there may be a network issue.",
    });

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

  it("formatErrorPageHtml with game not found error", async () => {
    const snapshotFile = "error-page-game-not-found.html";
    const actualHtml = formatErrorPageHtmlPage({
      icon: "🎯",
      title: "Game Not Found",
      message: `Game <strong>123</strong> could not be found.`,
      details: "It may have expired or the ID might be incorrect.",
    });

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

  it("formatErrorPageHtml without details", async () => {
    const snapshotFile = "error-page-simple.html";
    const actualHtml = formatErrorPageHtmlPage({
      icon: "⚠️",
      title: "Simple Error",
      message: "Something went wrong.",
    });

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