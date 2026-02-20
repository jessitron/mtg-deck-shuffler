import { DeckProvenance } from "../types.js";
import { CardLocation } from "./types.js";

/**
 * Persisted representation of a Deck.
 * Stores only scryfallIds instead of full CardDefinition objects.
 * This is what gets saved to the database.
 */
export interface PersistedDeck {
  version: 2;
  id: number;
  name: string;
  totalCards: number;
  commanderIds: string[]; // scryfallIds
  cardIds: string[]; // scryfallIds
  provenance: DeckProvenance;
}

/**
 * Persisted representation of a GameCard.
 * Stores only scryfallId instead of full CardDefinition object.
 * This is what gets saved to the database.
 */
export interface PersistedGameCard {
  scryfallId: string; // reference to card in repository
  location: CardLocation;
  gameCardIndex: number;
  isCommander: boolean;
  currentFace: "front" | "back";
}

