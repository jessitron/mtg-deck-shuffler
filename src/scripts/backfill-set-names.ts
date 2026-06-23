#!/usr/bin/env node

/**
 * Backfill full set NAMES into existing precon deck files, replacing the raw set
 * CODES that the MTGJSON adapter used to store. Display surfaces (deck tiles) show
 * the `set` field, and we want "Secret Lair Drop", not "SLD" — matching what the
 * Archidekt adapter already stores.
 *
 * Only touches precon-mtgjson-*.json. Archidekt-sourced decks already carry full
 * edition names, so they're left alone. Idempotent: a value that isn't a known set
 * code (i.e. already a name) is left as-is.
 *
 * Unlike `precons:fetch-mtgjson -- --convert`, this only changes `set` fields — a
 * clean diff with no fresh retrievedDate churn.
 *
 * Usage:
 *   npm run decks:backfill-set-names
 */

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
