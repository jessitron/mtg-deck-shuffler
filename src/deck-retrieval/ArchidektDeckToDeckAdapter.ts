import { Deck, Card } from "../deck.js";
import { ArchidektDeck, ArchidektCard, convertArchidektToCard } from "./ArchidektTypes.js";

export interface ArchidektDeckToDeckAdapter {
  convert(archidektDeck: ArchidektDeck): Deck;
}

export class StandardArchidektDeckToDeckAdapter implements ArchidektDeckToDeckAdapter {
  convert(archidektDeck: ArchidektDeck): Deck {
    const totalCards = archidektDeck.cards.reduce((sum, card) => sum + card.quantity, 0);

    // Create a map of category names to their includedInDeck status
    const categoryInclusionMap = new Map(archidektDeck.categories.map((cat) => [cat.name, cat.includedInDeck]));

    // Check if a card's primary category (first in the list) is included in deck
    const isCardIncluded = (card: ArchidektCard) => {
      const primaryCategory = card.categories[0];

      // Sideboard cards are always excluded from the deck
      if (primaryCategory === "Sideboard") {
        return false;
      }

      // Other categories are excluded if they have includedInDeck: false
      return categoryInclusionMap.get(primaryCategory) ?? true; // default to included if not found
    };

    // Expand cards based on quantity, excluding commander from main deck
    const allCards: Card[] = [];
    for (const archidektCard of archidektDeck.cards) {
      if (isCardIncluded(archidektCard) && !archidektCard.categories.includes("Commander")) {
        const card = convertArchidektToCard(archidektCard);
        if (card) {
          for (let i = 0; i < archidektCard.quantity; i++) {
            allCards.push(card);
          }
        }
      }
    }

    const includedCards = archidektDeck.cards.filter(isCardIncluded).reduce((sum, card) => sum + card.quantity, 0);

    const excludedCards = archidektDeck.cards.filter((card) => !isCardIncluded(card)).reduce((sum, card) => sum + card.quantity, 0);

    const commanderCard = archidektDeck.cards.find((card) => card.categories.includes("Commander"));

    return {
      id: archidektDeck.id,
      name: archidektDeck.name,
      totalCards,
      includedCards,
      excludedCards,
      commander: commanderCard ? convertArchidektToCard(commanderCard) : undefined,
      cards: allCards,
      retrievedDate: new Date(),
    };
  }
}