import { RetrieveDeckPort, DeckRetrievalRequest, isLocalDeckRetrievalRequest, AvailableDecks, AvailableDeck, DeckVersionMismatchError } from "../types.js";
import { Deck, PERSISTED_DECK_VERSION } from "../../types.js";
import fs from "fs";

export class LocalDeckAdapter implements RetrieveDeckPort {
  private readonly Directory: string;

  constructor(deckPath: string) {
    this.Directory = deckPath;
  }

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

  async retrieveDeck(request: DeckRetrievalRequest, retrievedDate?: Date): Promise<Deck> {
    if (!isLocalDeckRetrievalRequest(request)) {
      throw new Error("Cannot handle this request type");
    }

    // TypeScript now knows request is LocalDeckRetrievalRequest

    const pathToLocalFile = this.Directory + request.localFile;

    try {
      const fileContent = fs.readFileSync(pathToLocalFile, "utf8");
      const parsedData = JSON.parse(fileContent);

      // Check version before treating as Deck
      if (parsedData.version !== PERSISTED_DECK_VERSION) {
        throw new DeckVersionMismatchError(PERSISTED_DECK_VERSION, parsedData.version, pathToLocalFile);
      }

      const deck: Deck = parsedData;

      const dateToUse = retrievedDate || new Date();
      deck.provenance = {
        retrievedDate: dateToUse,
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
