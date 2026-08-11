#!/usr/bin/env node


import { promises as fs } from "fs";
import { join, basename } from "path";
import { Deck, CardDefinition } from "../types.js";
import { fetchScryfallSetNames } from "../port-deck-retrieval/mtgjsonAdapter/scryfallSetNames.js";

const DECKS_DIR = join(process.cwd(), "decks");

async function main(): Promise<void> {
  console.log("Fetching set names from Scryfall...");
  const setNames = await fetchScryfallSetNames();
  console.log(`  Loaded ${setNames.size} set names`);

  const files = (await fs.readdir(DECKS_DIR)).filter((f) => f.startsWith("precon-mtgjson-") && f.endsWith(".json"));
  console.log(`\nBackfilling ${files.length} precon deck file(s)...`);

  const unmapped = new Set<string>();
  let updated = 0;

  for (const file of files) {
    const path = join(DECKS_DIR, file);
    const deck: Deck = JSON.parse(await fs.readFile(path, "utf-8"));

    let changed = false;
    const applyName = (card: CardDefinition) => {
      const name = setNames.get(card.set.toUpperCase());
      if (name) {
        if (card.set !== name) {
          card.set = name;
          changed = true;
        }
      } else {
        unmapped.add(card.set);
      }
    };
    deck.commanders.forEach(applyName);
    deck.cards.forEach(applyName);

    if (changed) {
      await fs.writeFile(path, JSON.stringify(deck, null, 2), "utf-8");
      updated++;
    }
  }

  console.log(`\n📊 Updated ${updated} deck file(s).`);
  if (unmapped.size > 0) {
    console.log(`\n⚠️  ${unmapped.size} set value(s) had no Scryfall match (left as-is):`);
    console.log(`   ${[...unmapped].sort().join(", ")}`);
  }
}

main();
