
export type ImageFormat = "small" | "normal" | "large" | "png" | "art_crop" | "border_crop";

export type CardImageUris = Partial<Record<ImageFormat, string>>;

export const IMAGE_FORMATS: ImageFormat[] = ["small", "normal", "large", "png", "art_crop", "border_crop"];

export type CardSource = "scryfall" | "archidekt-custom";

export interface CardDefinition {
  name: string;
  cardDefinitionId: string;
  /** Absent means "scryfall"; read it through cardSourceOf. */
  cardSource?: CardSource;
  multiverseid?: number;
  twoFaced: boolean;
  oracleCardName: string;
  colorIdentity: string[];
  set: string;
  cardTypes: string[];
  imageUris?: CardImageUris;
  /** Image URLs for the back face; present only for two-faced cards. */
  backImageUris?: CardImageUris;
}

export function cardSourceOf(card: CardDefinition): CardSource {
  return card.cardSource ?? "scryfall";
}

export interface DeckProvenance {
  retrievedDate: Date;
  sourceUrl: string;
  deckSource: "archidekt" | "precon" | "test";
  createdAt?: Date;
}

export const PERSISTED_DECK_VERSION: 4 = 4;

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
