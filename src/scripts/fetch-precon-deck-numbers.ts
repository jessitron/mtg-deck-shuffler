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
  }
}

async function main(): Promise<void> {
  const shouldDownload = process.argv.includes('--download');
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
        await downloadDeck(deckId.toString(), gateway, adapter);
        // Small delay between requests to be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 250));
      }

      console.log(`\n✅ Download complete! Downloaded ${deckNumbers.length} precon decks to ./decks/`);
    } else {
      console.log("\n💡 Add --download flag to download all precon decks to ./decks/");
    }
  } catch (error) {
    process.exit(1);
  }
}

main();
