export interface Card {
  name: string;
  uid: string;
  multiverseid: number;
}

import { ArchidektCard } from "./deck-retrieval/types.js";

export function convertArchidektToCard(archidektCard: ArchidektCard): Card | undefined {
  /* A few cards, such as "Miku, the Renowned" have a display name that's different from the oracle name.
   * The Oracle Card is the canonical card, like you can't have two of the same in a Commander deck,
   * while certain fancy cards get a vanity name. On the printed card, the Oracle Name shows up as a subtitle */
  const cardName = archidektCard.card.displayName || archidektCard.card.oracleCard.name;
  return { name: cardName, uid: archidektCard.card.uid, multiverseid: archidektCard.card.multiverseid };
}

export interface Deck {
  id: number;
  name: string;
  totalCards: number;
  includedCards: number;
  excludedCards: number;
  commander?: Card;
  cards: Card[];
  retrievedDate: Date;
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

