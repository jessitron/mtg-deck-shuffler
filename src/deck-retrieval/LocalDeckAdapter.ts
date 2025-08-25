import { RetrieveDeckPort, DeckRetrievalRequest, isLocalDeckRetrievalRequest, DescribedDeckRetrievalRequests } from "./types.js";
import { Deck } from "../deck.js";
import fs from "fs";

export class LocalDeckAdapter implements RetrieveDeckPort {
  listAvailableDecks(): DescribedDeckRetrievalRequests[] {
    return [{ description: "Locally stored decks", options: [] }];
  }

  canHandle(request: DeckRetrievalRequest): boolean {
    return isLocalDeckRetrievalRequest(request);
  }

  async retrieveDeck(request: DeckRetrievalRequest): Promise<Deck> {
    if (!isLocalDeckRetrievalRequest(request)) {
      throw new Error("Cannot handle this request type");
    }

    // TypeScript now knows request is LocalDeckRetrievalRequest

    try {
      const fileContent = fs.readFileSync(request.localFile, "utf8");
      const deck: Deck = JSON.parse(fileContent);

      const now = new Date();
      deck.provenance = {
        retrievedDate: now,
        sourceUrl: `local://${request.localFile}`,
      };
      return deck;
    } catch (error) {
      throw new Error(`Failed to read local deck file: ${request.localFile}`);
    }
  }
}
