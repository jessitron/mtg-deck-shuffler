import { RetrieveDeckPort, DeckRetrievalRequest, isLocalDeckRetrievalRequest, LOCAL_DECK_RELATIVE_PATH, AvailableDecks, AvailableDeck } from "../types.js";
import { Deck } from "../../types.js";
import fs from "fs";

export class LocalDeckAdapter implements RetrieveDeckPort {
  private readonly Directory = LOCAL_DECK_RELATIVE_PATH;

  listAvailableDecks(): AvailableDecks {
    const ls = fs.readdirSync(this.Directory);
    const options: AvailableDeck[] = ls.map((l) => ({ deckSource: "local", description: l, localFile: l }));
    return options;
  }

  canHandle(request: DeckRetrievalRequest): boolean {
    return isLocalDeckRetrievalRequest(request);
  }

  async retrieveDeck(request: DeckRetrievalRequest): Promise<Deck> {
    if (!isLocalDeckRetrievalRequest(request)) {
      throw new Error("Cannot handle this request type");
    }

    // TypeScript now knows request is LocalDeckRetrievalRequest

    const pathToLocalFile = this.Directory + request.localFile;

    try {
      const fileContent = fs.readFileSync(pathToLocalFile, "utf8");
      const deck: Deck = JSON.parse(fileContent);

      const now = new Date();
      deck.provenance = {
        retrievedDate: now,
        sourceUrl: `/${pathToLocalFile}`,
        deckSource: "local",
      };
      return deck;
    } catch (error) {
      throw new Error(`Failed to read local deck file: ${pathToLocalFile}`);
    }
  }
}
