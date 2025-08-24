import { Deck } from "../deck.js";
import { RetrieveDeckPort, DeckRetrievalRequest, isArchidektRequest, isLocalRequest } from "./types.js";
import { ArchidektGateway } from "./ArchidektGateway.js";
import { ArchidektDeckToDeckAdapter } from "./ArchidektDeckToDeckAdapter.js";
import { LocalDeckGateway } from "./LocalDeckGateway.js";

export class RetrieveDeckAdapter implements RetrieveDeckPort {
  constructor(
    private archidektGateway: ArchidektGateway,
    private archidektDeckToDeckAdapter: ArchidektDeckToDeckAdapter,
    private localDeckGateway: LocalDeckGateway
  ) {}

  async retrieveDeck(request: DeckRetrievalRequest): Promise<Deck> {
    if (isArchidektRequest(request)) {
      const archidektDeck = await this.archidektGateway.fetchDeck(request.archidektDeckId);
      return this.archidektDeckToDeckAdapter.convert(archidektDeck);
    } else if (isLocalRequest(request)) {
      return await this.localDeckGateway.readDeck(request.localFile);
    } else {
      throw new Error("Unknown deck retrieval request type");
    }
  }
}