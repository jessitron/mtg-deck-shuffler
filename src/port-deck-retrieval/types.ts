import { Deck } from "../types.js";

// this is really config
export const LOCAL_DECK_RELATIVE_PATH = "./decks/";

export type DeckSource = "archidekt" | "precon";

export interface ArchidektDeckRetrievalRequest {
  deckSource: "archidekt";
  archidektDeckId: string;
}

export interface LocalFileRetrievalRequest {
  deckSource: "precon";
  localFile: string;
}

export type DeckRetrievalRequest = ArchidektDeckRetrievalRequest | LocalFileRetrievalRequest;

// Type guards
export function isArchidektDeckRetrievalRequest(request: DeckRetrievalRequest): request is ArchidektDeckRetrievalRequest {
  return request.deckSource === "archidekt";
}

export function isLocalFileRetrievalRequest(request: DeckRetrievalRequest): request is LocalFileRetrievalRequest {
  return request.deckSource === "precon";
}

export interface PreconMetadata {
  commanders: Array<{
    name: string;
    colorIdentity?: string[];
    set?: string;
    imageUrl?: string;
  }>;
  createdYear?: number;
}

export type AvailableDeck = {
  description: string;
  metadata?: PreconMetadata;
} & DeckRetrievalRequest;

export type AvailableDecks = AvailableDeck[];

export interface RetrieveDeckPort {
  listAvailableDecks(): AvailableDecks;
  canHandle(request: DeckRetrievalRequest): boolean;
  retrieveDeck(request: DeckRetrievalRequest): Promise<Deck>;
}

export class DeckVersionMismatchError extends Error {
  constructor(expectedVersion: number, actualVersion: number | undefined, filePath: string) {
    super(`Deck version mismatch in ${filePath}. Expected version ${expectedVersion}, but got ${actualVersion}`);
    this.name = "DeckVersionMismatchError";
  }
}
