import * as fc from "fast-check";
import { CardDefinition, Deck, DeckProvenance, PERSISTED_DECK_VERSION } from "../src/types.js";

// Generator for card names using common MTG card patterns
export const cardName = fc.oneof(
  // Classic cards
  fc.constantFrom(
    "Lightning Bolt",
    "Counterspell",
    "Sol Ring",
    "Black Lotus",
    "Ancestral Recall",
    "Swords to Plowshares",
    "Path to Exile",
    "Birds of Paradise",
    "Dark Ritual",
    "Giant Growth"
  ),
  // Generated patterns
  fc
    .tuple(
      fc.constantFrom("Fire", "Lightning", "Storm", "Shadow", "Ancient", "Elder", "Young", "Mighty"),
      fc.constantFrom("Bolt", "Strike", "Dragon", "Beast", "Wizard", "Knight", "Elemental", "Spirit")
    )
    .map(([prefix, suffix]) => `${prefix} ${suffix}`),
  // Artifact patterns
  fc
    .tuple(
      fc.constantFrom("Mox", "Lotus", "Ring", "Orb", "Sword", "Shield"),
      fc.constantFrom("Ruby", "Sapphire", "Emerald", "Pearl", "Jet", "Power", "Wisdom", "Fire", "Ice")
    )
    .map(([item, modifier]) => `${item} of ${modifier}`)
);

// Generator for Scryfall IDs (UUID format)
export const scryfallId = fc.uuid();

// Generator for multiverse IDs
export const multiverseId = fc.integer({ min: 1, max: 999999 });

// Generator for CardDefinition
export const cardDefinition: fc.Arbitrary<CardDefinition> = fc.record({
  name: cardName,
  scryfallId: scryfallId,
  multiverseid: multiverseId,
});

// Generator for commander names (legendary creatures)
export const commanderName = fc.oneof(
  fc.constantFrom(
    "Atraxa, Praetors' Voice",
    "Breya, Etherium Shaper",
    "Yuriko, the Tiger's Shadow",
    "Edgar Markov",
    "Kaalia of the Vast",
    "Meren of Clan Nel Toth",
    "Prossh, Skyraider of Kher",
    "Derevi, Empyrial Tactician",
    "Zur the Enchanter",
    "Omnath, Locus of Creation"
  ),
  fc
    .tuple(
      fc.constantFrom("Atraxa", "Breya", "Yuriko", "Edgar", "Kaalia", "Meren", "Prossh", "Derevi", "Zur", "Omnath"),
      fc.constantFrom("the Mighty", "the Wise", "the Bold", "the Ancient", "of the Storm", "of Valor", "the Eternal")
    )
    .map(([name, title]) => `${name}, ${title}`)
);

// Generator for commander cards
export const commanderCard: fc.Arbitrary<CardDefinition> = fc.record({
  name: commanderName,
  scryfallId: scryfallId,
  multiverseid: multiverseId,
});

// Generator for deck names
export const deckName = fc.oneof(
  fc.constantFrom("Budget Red Aggro", "Control Magic", "Artifact Combo", "Tribal Elves", "Lifegain Matters", "Storm Combo", "Lands Matter", "Graveyard Value"),
  fc
    .tuple(
      fc.constantFrom("Aggressive", "Controlling", "Combo", "Midrange", "Tribal", "Budget"),
      fc.constantFrom("Red", "Blue", "Green", "White", "Black", "Multicolor", "Artifact")
    )
    .map(([strategy, color]) => `${strategy} ${color}`)
);

// Generator for DeckProvenance
// TODO: these fields are coupled; generate either an archidekt or local or test one, and make it internally consistent.
export const deckProvenance: fc.Arbitrary<DeckProvenance> = fc.record({
  retrievedDate: fc.date({ min: new Date("2020-01-01"), max: new Date("2024-12-31") }),
  sourceUrl: fc.oneof(
    fc.nat().map((n) => `https://archidekt.com/decks/${n}/test-deck`),
    fc.constantFrom("/deck/123", "https://example.com/deck/456", "file://local-deck.json")
  ),
  deckSource: fc.constantFrom("archidekt", "local", "test" as const),
});

// Generator for deck ID
export const deckId = fc.integer({ min: 1, max: 999999 });

// Generator for a small array of unique cards (avoids duplicates by name)
export const uniqueCards = (minCards: number = 1, maxCards: number = 10): fc.Arbitrary<CardDefinition[]> =>
  fc
    .array(cardDefinition, { minLength: minCards, maxLength: maxCards })
    .map((cards) => {
      // Remove duplicates by name
      const seen = new Set<string>();
      return cards.filter((card) => {
        if (seen.has(card.name)) {
          return false;
        }
        seen.add(card.name);
        return true;
      });
    })
    .filter((cards) => cards.length >= minCards); // Ensure we still meet minimum after deduplication

// Generator for commanders array (0-2 commanders)
export const commanders = fc
  .oneof(
    fc.constant([]), // No commanders
    fc.array(commanderCard, { minLength: 1, maxLength: 1 }), // One commander
    fc.array(commanderCard, { minLength: 2, maxLength: 2 }) // Two commanders (partner)
  )
  .map((cmds) => {
    // Ensure unique commander names
    const seen = new Set<string>();
    return cmds.filter((cmd) => {
      if (seen.has(cmd.name)) {
        return false;
      }
      seen.add(cmd.name);
      return true;
    });
  });

// Generator for complete Deck
export const deck: fc.Arbitrary<Deck> = fc
  .tuple(
    deckId,
    deckName,
    commanders,
    uniqueCards(1, 20), // 1-20 unique cards
    deckProvenance
  )
  .map(([id, name, cmdrs, cards, provenance]) => ({
    version: PERSISTED_DECK_VERSION,
    id,
    name,
    totalCards: cards.length,
    commanders: cmdrs,
    cards,
    provenance,
  }));

// Specific generators for common test patterns

// Generator for a minimal deck (useful for simple tests)
export const minimalDeck: fc.Arbitrary<Deck> = fc
  .tuple(
    deckId,
    deckName,
    uniqueCards(1, 3), // Just 1-3 cards
    deckProvenance
  )
  .map(([id, name, cards, provenance]) => ({
    version: PERSISTED_DECK_VERSION,
    id,
    name,
    totalCards: cards.length,
    commanders: [],
    cards,
    provenance,
  }));  

// Generator for a deck with exactly one commander
export const deckWithOneCommander: fc.Arbitrary<Deck> = fc
  .tuple(deckId, deckName, commanderCard, uniqueCards(1, 10), deckProvenance)
  .map(([id, name, commander, cards, provenance]) => ({
    version: PERSISTED_DECK_VERSION,
    id,
    name,
    totalCards: cards.length,
    commanders: [commander],
    cards,
    provenance,
  }));

// Generator for a deck with exactly two commanders
export const deckWithTwoCommanders: fc.Arbitrary<Deck> = fc
  .tuple(deckId, deckName, uniqueCards(1, 10), deckProvenance)
  .chain(([id, name, cards, provenance]) =>
    fc.tuple(commanderCard, commanderCard)
      .filter(([cmd1, cmd2]) => cmd1.name !== cmd2.name) // Ensure different commanders
      .map(([cmd1, cmd2]) => ({
        version: PERSISTED_DECK_VERSION,
        id,
        name,
        totalCards: cards.length,
        commanders: [cmd1, cmd2],
        cards,
        provenance,
      }))
  );

// Convenience exports for common card patterns from existing tests
export const lightningBolt: CardDefinition = {
  name: "Lightning Bolt",
  scryfallId: "abc123",
  multiverseid: 12345,
};

export const ancestralRecall: CardDefinition = {
  name: "Ancestral Recall",
  scryfallId: "def456",
  multiverseid: 67890,
};

export const blackLotus: CardDefinition = {
  name: "Black Lotus",
  scryfallId: "ghi789",
  multiverseid: 11111,
};

export const atraxa: CardDefinition = {
  name: "Atraxa, Praetors' Voice",
  scryfallId: "cmd001",
  multiverseid: 22222,
};

export const testProvenance: DeckProvenance = {
  retrievedDate: new Date("2023-01-01"),
  sourceUrl: "https://example.com/deck/123",
  deckSource: "test",
};

// Simple helper for creating test PersistedGameState - to be used in specific tests
export const createTestPersistedGameState = (gameId: number, deck: Deck, status: any = 0) => ({
  version: 3 as const, // PERSISTED_GAME_STATE_VERSION
  gameId,
  status,
  deckProvenance: deck.provenance,
  commanders: deck.commanders,
  deckName: deck.name,
  deckId: deck.id,
  totalCards: deck.totalCards,
  gameCards: deck.cards.map((card, index) => ({
    card,
    location: { type: "Library" as const, position: index },
    gameCardIndex: index,
  })),
  events: [],
});
