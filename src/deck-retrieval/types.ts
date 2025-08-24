import { Deck } from "../deck.js";

export interface ArchidektDeckRetrievalRequest {
  archidektDeckId: string;
}

export interface LocalDeckRetrievalRequest {
  localFile: string;
}

export type DeckRetrievalRequest = ArchidektDeckRetrievalRequest | LocalDeckRetrievalRequest;

export interface RetrieveDeckPort {
  canHandle(request: DeckRetrievalRequest): boolean;
  retrieveDeck(request: DeckRetrievalRequest): Promise<Deck>;
}