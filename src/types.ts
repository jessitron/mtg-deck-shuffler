export interface CardDefinition {
  name: string;
  scryfallId: string;
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
  totalCards: number; // TODO: remove, derive from cards
  commanders: CardDefinition[];
  cards: CardDefinition[];
  provenance: DeckProvenance;
}

export interface Library {
  cards: CardDefinition[];
  count: number;
}

export interface LibraryLocation {
  type: "Library";
  position: number;
}

export interface HandLocation {
  type: "Hand";
  position: number;
}

export interface RevealedLocation {
  type: "Revealed";
  position: number;
}

export interface TableLocation {
  type: "Table";
}

export type GameId = number;

export enum GameStatus {
  NotStarted = "NotStarted",
  Active = "Active",
  Ended = "Ended",
}

export type CardLocation = LibraryLocation | HandLocation | RevealedLocation | TableLocation;

export interface GameCard {
  card: CardDefinition; // TODO: rename to cardDefinition
  location: CardLocation;
  gameCardIndex: number;
}

export function getCardImageUrl(scryfallId: string, format: "small" | "normal" | "large" | "png" | "art_crop" | "border_crop" = "png"): string {
  const extension = format === "png" ? "png" : "jpg";
  const firstTwo = scryfallId.substring(0, 1);
  const nextTwo = scryfallId.substring(1, 2);
  return `https://cards.scryfall.io/${format}/front/${firstTwo}/${nextTwo}/${scryfallId}.${extension}`;
}

export interface WhatHappened {
  shuffling?: boolean;
  movedRight?: GameCard[];
  movedLeft?: GameCard[];
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
