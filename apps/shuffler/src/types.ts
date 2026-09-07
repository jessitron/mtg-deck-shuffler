
export type ImageFormat = "small" | "normal" | "large" | "png" | "art_crop" | "border_crop";

export type CardImageUris = Partial<Record<ImageFormat, string>>;

export interface CardDefinition {
  name: string;
  scryfallId: string;
  multiverseid?: number;
  twoFaced: boolean;
  oracleCardName: string;
  colorIdentity: string[];
  set: string;
  cardTypes: string[];
  imageUris?: CardImageUris;
  /** Scryfall image URLs for the back face; present only for two-faced cards. */
  backImageUris?: CardImageUris;
}

export interface DeckProvenance {
  retrievedDate: Date;
  sourceUrl: string;
  deckSource: "archidekt" | "precon" | "test";
  createdAt?: Date;
}

export const PERSISTED_DECK_VERSION: 3 = 3;

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
