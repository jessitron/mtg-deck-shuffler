
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

/** Construct a Scryfall CDN URL from a scryfallId. This is the fallback used when
 * a card has no stored `imageUris` — it works for most cards, but the bare
 * (version-less) URL can 404 for very recently released cards, which is why we
 * prefer the stored URLs from `getCardImageUrl`. */
export function constructCardImageUrl(scryfallId: string, format: ImageFormat = "png", face: "front" | "back" = "front"): string {
  const extension = format === "png" ? "png" : "jpg";
  const firstTwo = scryfallId.substring(0, 1);
  const nextTwo = scryfallId.substring(1, 2);
  return `https://cards.scryfall.io/${format}/${face}/${firstTwo}/${nextTwo}/${scryfallId}.${extension}`;
}

export function getCardImageUrl(card: CardDefinition, format: ImageFormat = "png", face: "front" | "back" = "front"): string {
  const stored = face === "back" ? card.backImageUris : card.imageUris;
  return stored?.[format] ?? constructCardImageUrl(card.scryfallId, format, face);
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
