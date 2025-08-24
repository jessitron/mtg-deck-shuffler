import { RetrieveDeckPort, DeckRetrievalRequest } from "./types.js";
import { Deck } from "../deck.js";

export class CascadingDeckRetrievalAdapter implements RetrieveDeckPort {
  constructor(private adapters: RetrieveDeckPort[]) {}

  canHandle(request: DeckRetrievalRequest): boolean {
    return this.adapters.some(adapter => adapter.canHandle(request));
  }

  async retrieveDeck(request: DeckRetrievalRequest): Promise<Deck> {
    for (const adapter of this.adapters) {
      if (adapter.canHandle(request)) {
        return await adapter.retrieveDeck(request);
      }
    }

    throw new Error("No adapter can handle this request");
  }
}