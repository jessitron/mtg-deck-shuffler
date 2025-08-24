import { ArchidektDeck } from "./types.js";
import { markCurrentSpanAsError, setCommonSpanAttributes } from "../tracing_util.js";

export class ArchidektGateway {
  async fetchDeck(deckId: string): Promise<ArchidektDeck> {
    setCommonSpanAttributes({ archidektDeckNumber: deckId || "missing" });
    const response = await fetch(`https://archidekt.com/api/decks/${deckId}/`);

    if (!response.ok) {
      markCurrentSpanAsError(`Failed to fetch deck`, {
        "error.response_body": await response.text(),
      });
      throw new Error(`Failed to fetch deck: ${response.status}`);
    }

    const archidektDeck: ArchidektDeck = await response.json();
    return archidektDeck;
  }
}