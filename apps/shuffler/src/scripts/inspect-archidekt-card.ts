#!/usr/bin/env node


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
