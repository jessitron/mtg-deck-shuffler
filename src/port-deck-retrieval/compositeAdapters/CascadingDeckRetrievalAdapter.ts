import { RetrieveDeckPort, DeckRetrievalRequest, AvailableDecks } from "../types.js";
import { Deck } from "../../types.js";

export class CascadingDeckRetrievalAdapter implements RetrieveDeckPort {
  private adapters: RetrieveDeckPort[];

  constructor(...adapters: RetrieveDeckPort[]) {
    this.adapters = adapters;
  }
  listAvailableDecks(): AvailableDecks {
    return this.adapters.flatMap((a) => a.listAvailableDecks());
  }

  canHandle(request: DeckRetrievalRequest): boolean {
    return this.adapters.some((adapter) => adapter.canHandle(request));
  }

  async retrieveDeck(request: DeckRetrievalRequest): Promise<Deck> {
    for (const adapter of this.adapters) {
      if (adapter.canHandle(request)) {
        return adapter.retrieveDeck(request);
      }
    }

    throw new Error("No adapter can handle this request");
  }
}
