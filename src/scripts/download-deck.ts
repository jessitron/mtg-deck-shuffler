#!/usr/bin/env node

import { ArchidektGateway } from "../port-deck-retrieval/archidektAdapter/ArchidektGateway.js";
import { ArchidektDeckToDeckAdapter } from "../port-deck-retrieval/archidektAdapter/ArchidektDeckToDeckAdapter.js";
import { promises as fs } from "fs";
import { join } from "path";

async function main(): Promise<void> {
  const deckId: string | undefined = process.argv[2];

  if (!deckId) {
    console.error("Usage: node download-deck.mjs <archidektDeckId>");
    process.exit(1);
  }

  console.log(`Downloading deck ${deckId}...`);

  try {
    const gateway = new ArchidektGateway();
    const adapter = new ArchidektDeckToDeckAdapter(gateway);
    const deckData = await adapter.retrieveDeck({ deckSource: "archidekt", archidektDeckId: deckId });

    const filename = `deck-${deckId}.json`;
    const filepath = join(process.cwd(), "decks", filename);

    await fs.writeFile(filepath, JSON.stringify(deckData, null, 2), "utf-8");

    console.log(`Deck saved to decks/${filename}`);
    console.log(`Deck name: ${deckData.name}`);
    console.log(`Total cards: ${deckData.totalCards}`);
    if (deckData.commanders.length > 0) {
      console.log(`Commander(s): ${deckData.commanders.map(c => c.name).join(", ")}`);
    }
  } catch (error) {
    console.error("Failed to download deck:", error);
    process.exit(1);
  }
}

main();
