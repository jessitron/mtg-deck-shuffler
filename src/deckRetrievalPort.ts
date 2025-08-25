import { Deck } from "./types.js";

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
export type DropdownOptions = { description: string; options: Array<{ description: string } & DeckRetrievalRequest> };
export type AvailableDecks = DropdownOptions | SearchUrl;
export function isSearchUrl(ad: DropdownOptions | SearchUrl): ad is SearchUrl {
  return "url" in ad;
}
export function isDropdownOptions(ad: DropdownOptions | SearchUrl): ad is DropdownOptions {
  return "options" in ad;
}

export interface RetrieveDeckPort {
  listAvailableDecks(): AvailableDecks[];
  canHandle(request: DeckRetrievalRequest): boolean;
  retrieveDeck(request: DeckRetrievalRequest): Promise<Deck>;
}
