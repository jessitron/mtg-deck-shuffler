import { DeckProvenance } from "../types.js";
import { CardLocation } from "../domain-types.js";

export interface PersistedDeck {
  version: 2;
  id: number;
  name: string;
  totalCards: number;
  commanderIds: string[]; // scryfallIds
  cardIds: string[]; // scryfallIds
  provenance: DeckProvenance;
}

export interface PersistedGameCard {
  scryfallId: string; // reference to card in repository
  location: CardLocation;
  gameCardIndex: number;
  isCommander: boolean;
  currentFace: "front" | "back";
  cardInstanceId?: string;
}

