import { Card } from "../deck.js";

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