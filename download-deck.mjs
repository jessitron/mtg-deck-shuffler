#!/usr/bin/env node

import { ArchidektGateway } from "./dist/deck-retrieval/ArchidektGateway.js";
import { promises as fs } from "fs";
import { join } from "path";

async function main() {
  const deckId = process.argv[2];
  
  if (!deckId) {
    console.error("Usage: node download-deck.mjs <archidektDeckId>");
    process.exit(1);
  }

  console.log(`Downloading deck ${deckId}...`);

  try {
    const gateway = new ArchidektGateway();
    const deckData = await gateway.fetchDeck(deckId);
    
    const filename = `deck-${deckId}.json`;
    const filepath = join(process.cwd(), filename);
    
    await fs.writeFile(filepath, JSON.stringify(deckData, null, 2), 'utf-8');
    
    console.log(`Deck saved to ${filename}`);
    console.log(`Deck name: ${deckData.name}`);
    console.log(`Cards: ${deckData.cards.length}`);
    
  } catch (error) {
    console.error("Failed to download deck:", error);
    process.exit(1);
  }
}

main();