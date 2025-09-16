export interface CardDefinition {
  name: string;
  scryfallId: string;
  multiverseid: number;
  twoFaced: boolean;
  oracleCardName?: string;
}

export interface DeckProvenance {
  retrievedDate: Date;
  sourceUrl: string;
  deckSource: "archidekt" | "local" | "test";
}

export const PERSISTED_DECK_VERSION: 1 = 1;

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

export interface WhatHappened {
  shuffling?: boolean;
  movedRight?: import("./port-persist-state/types.js").GameCard[];
  movedLeft?: import("./port-persist-state/types.js").GameCard[];
  flipped?: import("./port-persist-state/types.js").GameCard[];
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
