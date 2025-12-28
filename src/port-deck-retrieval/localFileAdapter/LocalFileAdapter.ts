import { RetrieveDeckPort, DeckRetrievalRequest, isLocalFileRetrievalRequest, AvailableDecks, AvailableDeck, DeckVersionMismatchError } from "../types.js";
import { Deck, PERSISTED_DECK_VERSION } from "../../types.js";
import fs from "fs";

export class LocalFileAdapter implements RetrieveDeckPort {
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
        const deck: Deck = JSON.parse(fileContent);

        // Extract commander metadata
        const commanders = deck.commanders.map(cmd => ({
          name: cmd.name,
          colorIdentity: cmd.colorIdentity,
          set: cmd.set
        }));

        const createdYear = deck.provenance?.createdAt
          ? new Date(deck.provenance.createdAt).getFullYear()
          : undefined;

        return {
          deckSource: "precon",
          description: deck.name || filename,
          localFile: filename,
          metadata: {
            commanders,
            createdYear
          }
        };
      } catch (error) {
        // If we can't read the deck file, fall back to filename
        return { deckSource: "precon", description: filename, localFile: filename };
      }
    });
    return options;
  }

  canHandle(request: DeckRetrievalRequest): boolean {
    return isLocalFileRetrievalRequest(request);
  }

  async retrieveDeck(request: DeckRetrievalRequest): Promise<Deck> {
    if (!isLocalFileRetrievalRequest(request)) {
      throw new Error("Cannot handle this request type");
    }

    // TypeScript now knows request is LocalFileRetrievalRequest

    const pathToLocalFile = this.Directory + request.localFile;

    try {
      const fileContent = fs.readFileSync(pathToLocalFile, "utf8");
      const parsedData = JSON.parse(fileContent);

      // Check version before treating as Deck
      if (parsedData.version !== PERSISTED_DECK_VERSION) {
        throw new DeckVersionMismatchError(PERSISTED_DECK_VERSION, parsedData.version, pathToLocalFile);
      }

      const deck: Deck = parsedData;

      const now = new Date();
      deck.provenance = {
        retrievedDate: now,
        sourceUrl: `/${pathToLocalFile}`,
        deckSource: "precon",
      };
      return deck;
    } catch (error) {
      if (error instanceof DeckVersionMismatchError) {
        throw error;
      }
      throw new Error(`Failed to read local file: ${pathToLocalFile}`);
    }
  }
}
