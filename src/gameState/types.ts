import { CardDefinition, Deck } from "../deck.js";

export type CardLocation =
  | { type: "CommandZone" }
  | { type: "Library"; position: number }
  | { type: "Hand"; position: number }
  | { type: "Revealed"; position: number }
  | { type: "Table" };

export interface GameCard {
  cardDefinition: CardDefinition;
  location: CardLocation;
}

export interface DeckProvenance {
  id: number;
  name: string;
  retrievedDate: Date;
}