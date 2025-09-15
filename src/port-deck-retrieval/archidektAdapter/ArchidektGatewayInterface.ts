import { ArchidektDeck } from "./archidektTypes.js";

export interface ArchidektGatewayInterface {
  fetchDeck(deckId: string): Promise<ArchidektDeck>;
}