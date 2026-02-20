#!/usr/bin/env node

import { promises as fs } from "fs";
import { createWriteStream, createReadStream } from "fs";
import { join } from "path";
import { pipeline } from "stream/promises";
import { createGunzip } from "zlib";
import * as tar from "tar";
import { MtgjsonDeckAdapter } from "../port-deck-retrieval/mtgjsonAdapter/MtgjsonDeckAdapter.js";
import { MtgjsonDeck } from "../port-deck-retrieval/mtgjsonAdapter/mtgjsonTypes.js";

const MTGJSON_URL = "https://mtgjson.com/api/v5/AllDeckFiles.tar.gz";
const TEMP_DIR = join(process.cwd(), "temp-mtgjson");
const DECKS_DIR = join(process.cwd(), "decks");

async function downloadFile(url: string, destPath: string): Promise<void> {
  console.log(`Downloading ${url}...`);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const fileStream = createWriteStream(destPath);

  if (!response.body) {
    throw new Error("Response body is null");
  }

  // @ts-ignore - Node.js streams are compatible
  await pipeline(response.body, fileStream);

  console.log(`✓ Downloaded to ${destPath}`);
}

async function extractTarGz(tarGzPath: string, destDir: string): Promise<void> {
  console.log(`Extracting ${tarGzPath}...`);

  await fs.mkdir(destDir, { recursive: true });

  await tar.extract({
    file: tarGzPath,
    cwd: destDir,
  });

  console.log(`✓ Extracted to ${destDir}`);
}

async function processDecks(shouldConvert: boolean, skipExisting: boolean): Promise<void> {
  const adapter = new MtgjsonDeckAdapter();

  // Read AllDeckFiles directory
  const allDeckFilesDir = join(TEMP_DIR, "AllDeckFiles");
  const files = await fs.readdir(allDeckFilesDir);
  const jsonFiles = files.filter(f => f.endsWith(".json"));

  console.log(`\nFound ${jsonFiles.length} deck files`);

  let commanderDeckCount = 0;
  let convertedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const file of jsonFiles) {
    const filePath = join(allDeckFilesDir, file);

    try {
      const content = await fs.readFile(filePath, "utf-8");
      const mtgjsonDeck: MtgjsonDeck = JSON.parse(content);

      // Filter to only Commander Deck type
      if (mtgjsonDeck.data.type !== "Commander Deck") {
        continue;
      }

      commanderDeckCount++;

      const deckName = mtgjsonDeck.data.name;
      const setCode = mtgjsonDeck.data.code;
      const releaseDate = mtgjsonDeck.data.releaseDate;

      console.log(`\n[${commanderDeckCount}] ${deckName} (${setCode}) - Released: ${releaseDate}`);
      console.log(`  Commanders: ${mtgjsonDeck.data.commander.map(c => c.name).join(", ")}`);
      console.log(`  Cards: ${mtgjsonDeck.data.commander.length} commanders + ${mtgjsonDeck.data.mainBoard.reduce((sum, c) => sum + c.count, 0)} mainboard`);

      if (shouldConvert) {
        // Generate output filename based on deck name and set code
        const safeName = deckName.replace(/[^a-zA-Z0-9]/g, "");
        const outputFilename = `precon-mtgjson-${safeName}_${setCode}.json`;
        const outputPath = join(DECKS_DIR, outputFilename);

        // Check if file exists
        let fileExists = false;
        try {
          await fs.access(outputPath);
          fileExists = true;

          // Skip if --skip-existing flag is set
          if (skipExisting) {
            console.log(`  ⏭️  Skipping - already exists`);
            skippedCount++;
            continue;
          }
        } catch {
          // File doesn't exist
        }

        try {
          // Convert using adapter
          const deck = adapter.convertMtgjsonToDeck(mtgjsonDeck, file);

          // Save to decks directory
          await fs.writeFile(outputPath, JSON.stringify(deck, null, 2), "utf-8");

          if (fileExists) {
            console.log(`  ✓ Updated: ${outputFilename}`);
          } else {
            console.log(`  ✓ Saved: ${outputFilename}`);
          }
          convertedCount++;
        } catch (error) {
          console.error(`  ✗ Failed to convert:`, error);
          errorCount++;
        }
      }
    } catch (error) {
      console.error(`Error processing ${file}:`, error);
      errorCount++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`  Total JSON files: ${jsonFiles.length}`);
  console.log(`  Commander Decks found: ${commanderDeckCount}`);

  if (shouldConvert) {
    console.log(`  Converted: ${convertedCount}`);
    console.log(`  Skipped (already exist): ${skippedCount}`);
    console.log(`  Errors: ${errorCount}`);
  }
}

async function cleanup(): Promise<void> {
  console.log(`\nCleaning up temporary files...`);
  try {
    await fs.rm(TEMP_DIR, { recursive: true, force: true });
    console.log(`✓ Cleaned up ${TEMP_DIR}`);
  } catch (error) {
    console.error(`Failed to cleanup:`, error);
  }
}

async function main(): Promise<void> {
  const shouldConvert = process.argv.includes("--convert");
  const skipExisting = process.argv.includes("--skip-existing");
  const shouldKeepTemp = process.argv.includes("--keep-temp");

  try {
    // Create temp directory
    await fs.mkdir(TEMP_DIR, { recursive: true });

    const tarGzPath = join(TEMP_DIR, "AllDeckFiles.tar.gz");

    // Download
    await downloadFile(MTGJSON_URL, tarGzPath);

    // Extract
    await extractTarGz(tarGzPath, TEMP_DIR);

    // Process decks
    await processDecks(shouldConvert, skipExisting);

    if (!shouldConvert) {
      console.log("\n💡 Add --convert flag to convert Commander Decks to our format and save to ./decks/");
      console.log("💡 Add --skip-existing flag to skip decks that already exist (default: replace all)");
    } else {
      console.log(`\n✅ Conversion complete! Saved decks to ${DECKS_DIR}`);
    }

    // Cleanup unless --keep-temp
    if (!shouldKeepTemp) {
      await cleanup();
    } else {
      console.log(`\n💡 Temporary files kept in ${TEMP_DIR} (use --keep-temp to change this)`);
    }

  } catch (error) {
    console.error("Fatal error:", error);

    // Try to cleanup on error too
    if (!process.argv.includes("--keep-temp")) {
      await cleanup();
    }

    process.exit(1);
  }
}

main();
