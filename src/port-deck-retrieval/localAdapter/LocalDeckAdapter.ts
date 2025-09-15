import { RetrieveDeckPort, DeckRetrievalRequest, isLocalDeckRetrievalRequest, LOCAL_DECK_RELATIVE_PATH, AvailableDecks, AvailableDeck } from "../types.js";
import { Deck, PERSISTED_DECK_VERSION, DeckVersionMismatchError } from "../../types.js";
import fs from "fs";

export class LocalDeckAdapter implements RetrieveDeckPort {
  private readonly Directory = LOCAL_DECK_RELATIVE_PATH;

  listAvailableDecks(): AvailableDecks {
    const ls = fs.readdirSync(this.Directory);
    const options: AvailableDeck[] = ls.map((filename) => {
      try {
        const pathToLocalFile = this.Directory + filename;
        const fileContent = fs.readFileSync(pathToLocalFile, "utf8");
        const deck = JSON.parse(fileContent);
        return { deckSource: "local", description: deck.name || filename, localFile: filename };
      } catch (error) {
        // If we can't read the deck file, fall back to filename
        return { deckSource: "local", description: filename, localFile: filename };
      }
    });
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

      // Check version compatibility - treat missing version as version 0
      const deckVersion = deck.version ?? 0;
      if (deckVersion !== PERSISTED_DECK_VERSION) {
        throw new DeckVersionMismatchError(PERSISTED_DECK_VERSION, deckVersion, pathToLocalFile);
      }

      const now = new Date();
      deck.provenance = {
        retrievedDate: now,
        sourceUrl: `/${pathToLocalFile}`,
        deckSource: "local",
      };
      return deck;
    } catch (error) {
      if (error instanceof DeckVersionMismatchError) {
        throw error;
      }
      throw new Error(`Failed to read local deck file: ${pathToLocalFile}`);
    }
  }
}
