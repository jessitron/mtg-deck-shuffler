export interface ArchidektFace {
  name: string;
  types: string[];
  manaCost?: string;
  cmc?: number;
  text?: string;
}

export interface ArchidektCard {
  card: {
    displayName?: string;
    uid: string;
    multiverseid: number;
    oracleCard: {
      name: string;
      layout?: string;
      faces: ArchidektFace[];
      colorIdentity: string[];
      types: string[];
      manaCost?: string;
      cmc?: number;
      text?: string;
    };
    edition: {
      editionname: string;
      editioncode: string;
    };
  };
  quantity: number;
  categories: string[];
}

/** A card a user made on Archidekt: no Scryfall printing, images hosted by Archidekt. */
export interface ArchidektCustomCard {
  card: {
    id: number;
    setCode?: string | null;
    frontName: string;
    frontManaCost?: string | null;
    frontText?: string | null;
    frontTypes?: string | null;
    frontImageUrl: string;
    hasBack: boolean;
    backManaCost?: string | null;
    backText?: string | null;
    backTypes?: string | null;
    backImageUrl?: string | null;
  };
  quantity: number;
  categories: string[];
}

export interface ArchidektDeck {
  id: number;
  name: string;
  createdAt: string;
  categories: Array<{
    id: number;
    name: string;
    isPremier: boolean;
    includedInDeck: boolean;
    includedInPrice: boolean;
  }> | null;
  cards: ArchidektCard[];
  customCards?: ArchidektCustomCard[];
}