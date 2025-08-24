import { Deck } from "../deck.js";

export interface ArchidektDeckRetrievalRequest {
  archidektDeckId: string;
}

export interface LocalDeckRetrievalRequest {
  localFile: string;
}

export type DeckRetrievalRequest = ArchidektDeckRetrievalRequest | LocalDeckRetrievalRequest;

// Type guards
export function isArchidektDeckRetrievalRequest(request: DeckRetrievalRequest): request is ArchidektDeckRetrievalRequest {
  return "archidektDeckId" in request;
}

export function isLocalDeckRetrievalRequest(request: DeckRetrievalRequest): request is LocalDeckRetrievalRequest {
  return "localFile" in request;
}

export interface RetrieveDeckPort {
  canHandle(request: DeckRetrievalRequest): boolean;
  retrieveDeck(request: DeckRetrievalRequest): Promise<Deck>;
}

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
  }>;
  cards: ArchidektCard[];
}
