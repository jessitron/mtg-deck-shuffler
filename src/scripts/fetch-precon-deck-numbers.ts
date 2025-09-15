#!/usr/bin/env node

import { ArchidektGateway } from "../port-deck-retrieval/archidektAdapter/ArchidektGateway.js";
import { ArchidektDeckToDeckAdapter } from "../port-deck-retrieval/archidektAdapter/ArchidektDeckToDeckAdapter.js";
import { promises as fs } from "fs";
import { join } from "path";

async function fetchPreconDeckNumbers(url?: string): Promise<number[]> {
  // Default to the Archidekt precons page if no URL provided
  const targetUrl = url || "https://archidekt.com/commander-precons";

  console.log(`Fetching precon deck numbers from: ${targetUrl}`);

  try {
    const response = await fetch(targetUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();

    // Find all links matching /decks/{number} pattern
    const deckLinkPattern = /\/decks\/(\d+)/g;
    const matches = [...html.matchAll(deckLinkPattern)];

    // Extract unique deck numbers
    const deckNumbers = [...new Set(matches.map((match) => parseInt(match[1], 10)))];

    console.log(`Found ${deckNumbers.length} unique precon deck numbers:`);
    deckNumbers.sort((a, b) => a - b); // Sort numerically

    return deckNumbers;
  } catch (error) {
    console.error("Failed to fetch precon deck numbers:", error);
    throw error;
  }
}

async function downloadDeck(deckId: string, gateway: ArchidektGateway, adapter: ArchidektDeckToDeckAdapter): Promise<void> {
  try {
    console.log(`Downloading deck ${deckId}...`);
    const deckData = await adapter.retrieveDeck({ deckSource: "archidekt", archidektDeckId: deckId });

    const filename = `precon-${deckId}.json`;
    const filepath = join(process.cwd(), "decks", filename);

    await fs.writeFile(filepath, JSON.stringify(deckData, null, 2), "utf-8");

    console.log(`✓ Saved: ${filename} - "${deckData.name}" (${deckData.totalCards} cards)`);
  } catch (error) {
    console.error(`✗ Failed to download deck ${deckId}:`, error);
    
    // Create error file with details
    try {
      const url = `https://archidekt.com/api/decks/${deckId}/`;
      
      // Try to fetch the raw JSON to include in error file
      let rawJson = null;
      try {
        const response = await fetch(url);
        rawJson = await response.text();
      } catch (fetchError) {
        rawJson = `Failed to fetch raw data: ${fetchError}`;
      }

      const errorData = {
        deckId: deckId,
        url: url,
        timestamp: new Date().toISOString(),
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        rawJsonResponse: rawJson
      };

      const errorFilename = `error-${deckId}.json`;
      const errorFilepath = join(process.cwd(), "decks", errorFilename);
      
      await fs.writeFile(errorFilepath, JSON.stringify(errorData, null, 2), "utf-8");
      console.log(`📋 Error details saved to: ${errorFilename}`);
    } catch (errorFileError) {
      console.error(`Failed to save error file for deck ${deckId}:`, errorFileError);
    }
  }
}

async function main(): Promise<void> {
  const shouldDownload = process.argv.includes('--download');
  const shouldForce = process.argv.includes('--force');
  const url = process.argv.find(arg => !arg.startsWith('--') && arg !== process.argv[0] && arg !== process.argv[1]);

  try {
    const deckNumbers = await fetchPreconDeckNumbers(url);

    // Output the results
    console.log("\nPrecon deck numbers:");
    deckNumbers.forEach((num) => console.log(num));

    // Also output as JSON for potential piping/processing
    console.log(`\nAs JSON: ${JSON.stringify(deckNumbers)}`);

    if (shouldDownload) {
      console.log("\n🔽 Starting downloads...\n");
      
      const gateway = new ArchidektGateway();
      const adapter = new ArchidektDeckToDeckAdapter(gateway);

      // Download decks sequentially to avoid overwhelming the API
      for (const deckId of deckNumbers) {
        const deckIdStr = deckId.toString();
        const filename = `precon-${deckIdStr}.json`;
        const errorFilename = `error-${deckIdStr}.json`;
        const filepath = join(process.cwd(), "decks", filename);
        const errorFilepath = join(process.cwd(), "decks", errorFilename);
        
        // Skip if already downloaded or already has error file (unless --force flag is used)
        if (!shouldForce) {
          try {
            await fs.access(filepath);
            console.log(`⏭️  Skipping ${deckIdStr} - already downloaded`);
            continue;
          } catch {}

          try {
            await fs.access(errorFilepath);
            console.log(`⏭️  Skipping ${deckIdStr} - error file exists`);
            continue;
          } catch {}
        }

        // If using --force, clean up existing error file before attempting download
        if (shouldForce) {
          try {
            await fs.unlink(errorFilepath);
            console.log(`🗑️  Removed existing error file for ${deckIdStr}`);
          } catch {}
        }

        await downloadDeck(deckIdStr, gateway, adapter);
        // Small delay between requests to be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 250));
      }

      console.log(`\n✅ Download complete! Downloaded ${deckNumbers.length} precon decks to ./decks/`);
    } else {
      console.log("\n💡 Add --download flag to download all precon decks to ./decks/");
      console.log("💡 Add --force flag to overwrite existing decks");
    }
  } catch (error) {
    process.exit(1);
  }
}

main();
