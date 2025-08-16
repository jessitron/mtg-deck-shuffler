export interface Card {
  name: string;
  uid: string;
  multiverseid: number;
}

export interface ArchidektCard {
  card: {
    displayName?: string;
    uid: string;
    multiverseid: number;
    oracleCard: {
      name: string;
    };
  };
  quantity: number;
  categories: string[];
}

export function convertArchidektToCard(archidektCard: ArchidektCard): Card | undefined {
  /* A few cards, such as "Miku, the Renowned" have a display name that's different from the oracle name.
   * The Oracle Card is the canonical card, like you can't have two of the same in a Commander deck,
   * while certain fancy cards get a vanity name. On the printed card, the Oracle Name shows up as a subtitle */
  const cardName = archidektCard.card.displayName || archidektCard.card.oracleCard.name;
  return { name: cardName, uid: archidektCard.card.uid, multiverseid: archidektCard.card.multiverseid };
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
  cards: ArchidektCard[];
}

export interface Deck {
  id: number;
  name: string;
  totalCards: number;
  includedCards: number;
  excludedCards: number;
  commander?: Card;
  cards: Card[];
}

export interface Library {
  cards: Card[];
  count: number;
}

export interface Game {
  deck: Deck;
  library: Library;
}

export function getCardImageUrl(uid: string, format: "small" | "normal" | "large" | "png" | "art_crop" | "border_crop" = "normal"): string {
  const extension = format === "png" ? "png" : "jpg";
  const firstTwo = uid.substring(0, 1);
  const nextTwo = uid.substring(1, 2);
  return `https://cards.scryfall.io/${format}/front/${firstTwo}/${nextTwo}/${uid}.${extension}`;
}

export function shuffleDeck(deck: Deck): Library {
  const shuffledCards = [...deck.cards];
  
  // Fisher-Yates shuffle algorithm
  for (let i = shuffledCards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledCards[i], shuffledCards[j]] = [shuffledCards[j], shuffledCards[i]];
  }
  
  return {
    cards: shuffledCards,
    count: shuffledCards.length
  };
}

export function convertArchidektToDeck(archidektDeck: ArchidektDeck): Deck {
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
  };
}
