import { RetrieveDeckPort, DeckRetrievalRequest, AvailableDecks } from "../types.js";
import { Deck } from "../../types.js";

export class CascadingDeckRetrievalAdapter implements RetrieveDeckPort {
  private adapters: RetrieveDeckPort[];

  constructor(...adapters: RetrieveDeckPort[]) {
    this.adapters = adapters;
  }
  listAvailableDecks(): AvailableDecks {
    const allDecks = this.adapters.flatMap((a) => a.listAvailableDecks());

    // Sort by release date (newest first), treating missing dates as oldest
    return allDecks.sort((a, b) => {
      const yearA = a.metadata?.createdYear ?? 0;
      const yearB = b.metadata?.createdYear ?? 0;
      return yearB - yearA; // Descending order (newest first)
    });
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
