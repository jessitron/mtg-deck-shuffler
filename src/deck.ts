export interface ArchidektDeck {
  id: number;
  name: string;
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
  deckCards: number;
  sideboardCards: number;
  commander?: string;
}

export function convertArchidektToDeck(archidektDeck: ArchidektDeck): Deck {
  const totalCards = archidektDeck.cards.reduce((sum, card) => sum + card.quantity, 0);
  
  const deckCards = archidektDeck.cards
    .filter((card) => !card.categories.includes("Sideboard"))
    .reduce((sum, card) => sum + card.quantity, 0);
  
  const sideboardCards = archidektDeck.cards
    .filter((card) => card.categories.includes("Sideboard"))
    .reduce((sum, card) => sum + card.quantity, 0);

  const commanderCard = archidektDeck.cards.find((card) => card.categories.includes("Commander"));

  return {
    id: archidektDeck.id,
    name: archidektDeck.name,
    totalCards,
    deckCards,
    sideboardCards,
    commander: commanderCard?.card.oracleCard?.name || commanderCard?.card.name,
  };
}