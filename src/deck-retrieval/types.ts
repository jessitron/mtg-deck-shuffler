import { Deck } from "../deck.js";

// this is really config
export const LOCAL_DECK_RELATIVE_PATH = "./decks/";

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

export type SearchUrl = { description: string; url: string };
export type DescribedDeckRetrievalRequests = { description: string; options: Array<{ description: string } & DeckRetrievalRequest> };
export type AvailableDecks = DescribedDeckRetrievalRequests | SearchUrl;

export interface RetrieveDeckPort {
  listAvailableDecks(): AvailableDecks[];
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
