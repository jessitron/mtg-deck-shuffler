import { readFileSync } from "fs";
import { ArchidektDeck } from "./archidektTypes.js";
import { ArchidektGatewayInterface } from "./ArchidektGatewayInterface.js";
import { setCommonSpanAttributes } from "../../tracing_util.js";

export class FilesystemArchidektGateway implements ArchidektGatewayInterface {
  constructor(private basePath: string) {}

  async fetchDeck(deckId: string): Promise<ArchidektDeck> {
    setCommonSpanAttributes({ archidektDeckId: deckId || "missing" });

    const filePath = `${this.basePath}/${deckId}.json`;

    try {
      const fileContent = readFileSync(filePath, 'utf-8');
      const archidektDeck: ArchidektDeck = JSON.parse(fileContent);
      return archidektDeck;
    } catch (error) {
      throw new Error(`Failed to read deck file ${filePath}: ${error}`);
    }
  }
}