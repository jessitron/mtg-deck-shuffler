import { ArchidektDeck } from "./ArchidektTypes.js";

export interface ArchidektGateway {
  fetchDeck(deckId: string): Promise<ArchidektDeck>;
}

export class HttpArchidektGateway implements ArchidektGateway {
  async fetchDeck(deckId: string): Promise<ArchidektDeck> {
    const response = await fetch(`https://archidekt.com/api/decks/${deckId}/`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch deck from Archidekt: ${response.status}`);
    }
    
    return await response.json();
  }
}