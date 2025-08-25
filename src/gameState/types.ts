import { CardDefinition } from "../deck.js";
import { DeckRetrievalRequest } from "../deck-retrieval/types.js";

// Phase 1: Core Data Types

// Step 1.1: Define card location types
export type CommandZone = {
  type: "CommandZone";
};

export type Library = {
  type: "Library";
  position: number; // 0 is the top of the library
};

export type Hand = {
  type: "Hand";
  position: number; // 0 is leftmost in hand
};

export type Revealed = {
  type: "Revealed";
  position: number; // 0 is first revealed
};

export type Table = {
  type: "Table";
  // No position tracking for table
};

export type CardLocation = CommandZone | Library | Hand | Revealed | Table;

// Step 1.2: Define GameCard type that combines CardDefinition with location
export interface GameCard {
  definition: CardDefinition;
  location: CardLocation;
}

// Deck retrieval spec with timestamp
export interface DeckRetrievalSpec extends DeckRetrievalRequest {
  retrievedAt: Date;
}

// Step 1.3: GameState class will be defined below
export interface GameStateData {
  deckRetrievalSpec: DeckRetrievalSpec;
  cards: GameCard[]; // Ordered by display name for invariant verification
}