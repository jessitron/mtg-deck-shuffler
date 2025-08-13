export interface Card {
  name: string;
}

export interface ArchidektDeck {
  id: number;
  name: string;
  categories: Array<{
    id: number;
    name: string;
    isPremier: boolean;
    includedInDeck: boolean;
    includedInPrice: boolean;
  }>;
  cards: Array<{
    card: {
      name?: string;
      oracleCard?: {
        name: string;
      };
    };
    quantity: number;
    categories: string[];
  }>;
}

export interface Deck {
  id: number;
  name: string;
  totalCards: number;
  includedCards: number;
  excludedCards: number;
  commander?: Card;
}

export function convertArchidektToDeck(archidektDeck: ArchidektDeck): Deck {
  const totalCards = archidektDeck.cards.reduce((sum, card) => sum + card.quantity, 0);

  // Create a map of category names to their includedInDeck status
  const categoryInclusionMap = new Map(archidektDeck.categories.map((cat) => [cat.name, cat.includedInDeck]));

  // Check if a card's primary category (first in the list) is included in deck
  const isCardIncluded = (card: (typeof archidektDeck.cards)[0]) => {
    const primaryCategory = card.categories[0];

    // Sideboard cards are always excluded from the deck
    if (primaryCategory === "Sideboard") {
      return false;
    }

    // Other categories are excluded if they have includedInDeck: false
    return categoryInclusionMap.get(primaryCategory) ?? true; // default to included if not found
  };

  const includedCards = archidektDeck.cards.filter(isCardIncluded).reduce((sum, card) => sum + card.quantity, 0);

  const excludedCards = archidektDeck.cards.filter((card) => !isCardIncluded(card)).reduce((sum, card) => sum + card.quantity, 0);

  const commanderCard = archidektDeck.cards.find((card) => card.categories.includes("Commander"));
  const commanderName = commanderCard?.card.oracleCard?.name || commanderCard?.card.name;

  return {
    id: archidektDeck.id,
    name: archidektDeck.name,
    totalCards,
    includedCards,
    excludedCards,
    commander: commanderName ? { name: commanderName } : undefined,
  };
}
