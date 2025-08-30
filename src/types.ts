export interface CardDefinition {
  name: string;
  uid: string;
  multiverseid: number;
}

export interface DeckProvenance {
  retrievedDate: Date;
  sourceUrl: string;
  deckSource: "archidekt" | "local" | "test";
}

export interface Deck {
  id: number;
  name: string;
  totalCards: number;
  commanders: CardDefinition[];
  cards: CardDefinition[];
  provenance: DeckProvenance;
}

export interface Library {
  cards: CardDefinition[];
  count: number;
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
    count: shuffledCards.length,
  };
}
