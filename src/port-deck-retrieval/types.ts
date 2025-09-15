import { Deck } from "../types.js";

// this is really config
export const LOCAL_DECK_RELATIVE_PATH = "./decks/";

export type DeckSource = "archidekt" | "local";

export interface ArchidektDeckRetrievalRequest {
  deckSource: "archidekt";
  archidektDeckId: string;
}

export interface LocalDeckRetrievalRequest {
  deckSource: "local";
  localFile: string;
}

export type DeckRetrievalRequest = ArchidektDeckRetrievalRequest | LocalDeckRetrievalRequest;

// Type guards
export function isArchidektDeckRetrievalRequest(request: DeckRetrievalRequest): request is ArchidektDeckRetrievalRequest {
  return request.deckSource === "archidekt";
}

export function isLocalDeckRetrievalRequest(request: DeckRetrievalRequest): request is LocalDeckRetrievalRequest {
  return request.deckSource === "local";
}

export type AvailableDeck = { description: string } & DeckRetrievalRequest;
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
