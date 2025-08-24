import { Deck } from "../deck.js";

export interface ArchidektDeckRetrievalRequest {
  archidektDeckId: string;
}

export interface LocalDeckRetrievalRequest {
  localFile: string;
}

export type DeckRetrievalRequest = ArchidektDeckRetrievalRequest | LocalDeckRetrievalRequest;

export interface RetrieveDeckPort {
  retrieveDeck(request: DeckRetrievalRequest): Promise<Deck>;
}

export function isArchidektRequest(request: DeckRetrievalRequest): request is ArchidektDeckRetrievalRequest {
  return 'archidektDeckId' in request;
}

export function isLocalRequest(request: DeckRetrievalRequest): request is LocalDeckRetrievalRequest {
  return 'localFile' in request;
}