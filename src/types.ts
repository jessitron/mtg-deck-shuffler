
export interface CardDefinition {
  name: string;
  scryfallId: string;
  multiverseid?: number;
  twoFaced: boolean;
  oracleCardName: string;
  colorIdentity: string[];
  set: string;
  types: string[];
  manaCost?: string;
  cmc: number;
  oracleText?: string;
}

export interface DeckProvenance {
  retrievedDate: Date;
  sourceUrl: string;
  deckSource: "archidekt" | "precon" | "test";
  createdAt?: Date;
}

export const PERSISTED_DECK_VERSION: 2 = 2;

export interface Deck {
  version: typeof PERSISTED_DECK_VERSION;
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

export function getCardImageUrl(scryfallId: string, format: "small" | "normal" | "large" | "png" | "art_crop" | "border_crop" = "png", face: "front" | "back" = "front"): string {
  const extension = format === "png" ? "png" : "jpg";
  const firstTwo = scryfallId.substring(0, 1);
  const nextTwo = scryfallId.substring(1, 2);
  return `https://cards.scryfall.io/${format}/${face}/${firstTwo}/${nextTwo}/${scryfallId}.${extension}`;
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
