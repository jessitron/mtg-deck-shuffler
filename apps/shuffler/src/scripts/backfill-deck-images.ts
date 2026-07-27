#!/usr/bin/env node

/**
 * Backfill Scryfall image URLs (imageUris/backImageUris) into existing deck
 * files in decks/ without re-downloading them from MTGJSON/Archidekt.
 *
 * Unlike `precons:fetch-mtgjson -- --convert` (which rewrites every field,
 * including a fresh retrievedDate), this only ADDS the image URL fields — a
 * clean, additive diff. Idempotent: re-running refreshes the URLs.
 *
 * Usage:
 *   npm run decks:backfill-images                 # all decks/*.json
 *   npm run decks:backfill-images -- <file>...    # specific files (names or paths)
 */

import { promises as fs } from "fs";
import { join, basename } from "path";
import { Deck } from "../types.js";
import { ScryfallCardImagesGateway } from "../port-card-images/ScryfallCardImagesGateway.js";
import { enrichDeckWithImages } from "../port-card-images/enrichDeckWithImages.js";

const DECKS_DIR = join(process.cwd(), "decks");

async function resolveTargets(args: string[]): Promise<string[]> {
  if (args.length > 0) {
    return args.map((a) => (a.includes("/") ? a : join(DECKS_DIR, basename(a))));
  }
  const files = await fs.readdir(DECKS_DIR);
  return files.filter((f) => f.endsWith(".json")).map((f) => join(DECKS_DIR, f));
}

async function main(): Promise<void> {
  const targets = await resolveTargets(process.argv.slice(2));
  // One gateway across all decks so shared cards are fetched from Scryfall once.
  const gateway = new ScryfallCardImagesGateway();

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < targets.length; i++) {
    const path = targets[i];
    const name = basename(path);
    try {
      const deck: Deck = JSON.parse(await fs.readFile(path, "utf-8"));
      await enrichDeckWithImages(deck, gateway);
      await fs.writeFile(path, JSON.stringify(deck, null, 2), "utf-8");
      const withImages = [...deck.commanders, ...deck.cards].filter((c) => c.imageUris).length;
      const total = deck.commanders.length + deck.cards.length;
      console.log(`[${i + 1}/${targets.length}] ✓ ${name} (${withImages}/${total} cards enriched)`);
      updated++;
    } catch (error) {
      console.error(`[${i + 1}/${targets.length}] ✗ ${name}:`, error instanceof Error ? error.message : error);
      failed++;
    }
  }

  console.log(`\n📊 Backfilled ${updated} deck file(s), ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

main();
