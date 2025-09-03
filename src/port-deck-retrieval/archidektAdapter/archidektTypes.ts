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

export interface ArchidektDeck {
  id: number;
  name: string;
  categories: Array<{
    id: number;
    name: string;
    isPremier: boolean;
    includedInDeck: boolean;
    includedInPrice: boolean;
  }> | null;
  cards: ArchidektCard[];
}