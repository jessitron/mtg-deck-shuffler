#!/usr/bin/env node

/* Dump the raw Archidekt oracleCard data for cards matching a name in a deck.
 *
 * Useful for diagnosing how Archidekt represents a card before our adapter
 * touches it -- e.g. checking the `layout` field and `faces` array to see why
 * a single-faced card (Prepared, Adventure, Split) is being treated as
 * two-faced. See notes/features/two-faced-cards/.
 *
 * Usage: npm run card:inspect -- <archidektDeckId> <nameSubstring>
 * Example: npm run card:inspect -- 23735063 Studious
 */

import { ArchidektGateway } from "../port-deck-retrieval/archidektAdapter/ArchidektGateway.js";

async function main(): Promise<void> {
  const deckId: string | undefined = process.argv[2];
  const nameSubstring: string | undefined = process.argv[3];

  if (!deckId || !nameSubstring) {
    console.error("Usage: node inspect-archidekt-card.js <archidektDeckId> <nameSubstring>");
    process.exit(1);
  }

  const gateway = new ArchidektGateway();
  const deck = await gateway.fetchDeck(deckId);

  const matches = deck.cards.filter(c =>
    c.card.oracleCard.name.toLowerCase().includes(nameSubstring.toLowerCase())
  );

  if (matches.length === 0) {
    console.error(`No cards matching "${nameSubstring}" in deck ${deckId}.`);
    process.exit(1);
  }

  for (const match of matches) {
    console.log(JSON.stringify(match.card.oracleCard, null, 2));
  }
}

main();
