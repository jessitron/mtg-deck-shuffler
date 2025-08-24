import { readFile } from "fs/promises";
import { Deck } from "../deck.js";
import { RetrieveDeckPort, DeckRetrievalRequest, LocalDeckRetrievalRequest } from "./types.js";

export class LocalDeckAdapter implements RetrieveDeckPort {
  canHandle(request: DeckRetrievalRequest): boolean {
    return "localFile" in request;
  }

  async retrieveDeck(request: DeckRetrievalRequest): Promise<Deck> {
    if (!this.canHandle(request)) {
      throw new Error("Cannot handle this request type");
    }

    const localRequest = request as LocalDeckRetrievalRequest;
    
    try {
      const fileContent = await readFile(localRequest.localFile, "utf-8");
      const deck: Deck = JSON.parse(fileContent);
      
      // Ensure retrievedDate is a proper Date object
      deck.retrievedDate = new Date();
      
      return deck;
    } catch (error) {
      throw new Error(`Failed to read local deck file: ${localRequest.localFile}`);
    }
  }
}