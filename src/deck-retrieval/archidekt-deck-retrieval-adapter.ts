import { Deck } from "../deck.js";
import { RetrieveDeckPort, DeckRetrievalRequest, ArchidektDeckRetrievalRequest } from "./types.js";
import { ArchidektGateway } from "./archidekt-gateway.js";
import { ArchidektDeckToDeckAdapter } from "./archidekt-deck-to-deck-adapter.js";

export class ArchidektDeckRetrievalAdapter implements RetrieveDeckPort {
  private gateway: ArchidektGateway;
  private adapter: ArchidektDeckToDeckAdapter;

  constructor() {
    this.gateway = new ArchidektGateway();
    this.adapter = new ArchidektDeckToDeckAdapter();
  }

  canHandle(request: DeckRetrievalRequest): boolean {
    return "archidektDeckId" in request;
  }

  async retrieveDeck(request: DeckRetrievalRequest): Promise<Deck> {
    if (!this.canHandle(request)) {
      throw new Error("Cannot handle this request type");
    }

    const archidektRequest = request as ArchidektDeckRetrievalRequest;
    const archidektDeck = await this.gateway.fetchDeck(archidektRequest.archidektDeckId);
    return this.adapter.convertToDeck(archidektDeck);
  }
}