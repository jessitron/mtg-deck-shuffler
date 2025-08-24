import { readFile } from "fs/promises";
import { Deck } from "../deck.js";

export interface LocalDeckGateway {
  readDeck(filename: string): Promise<Deck>;
}

export class FileSystemLocalDeckGateway implements LocalDeckGateway {
  async readDeck(filename: string): Promise<Deck> {
    try {
      const fileContent = await readFile(filename, 'utf8');
      const deck: Deck = JSON.parse(fileContent);
      return deck;
    } catch (error) {
      throw new Error(`Failed to read local deck file ${filename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}