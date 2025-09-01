import { CardDefinition, DeckProvenance } from "../types.js";

export type GameId = number;

export enum GameStatus {
  NotStarted = "NotStarted",
  Active = "Active",
  Ended = "Ended",
}

export interface LibraryLocation {
  type: "Library";
  position: number;
}

export interface HandLocation {
  type: "Hand";
  position: number;
}

export interface RevealedLocation {
  type: "Revealed";
  position: number;
}

export interface TableLocation {
  type: "Table";
}

export type CardLocation = LibraryLocation | HandLocation | RevealedLocation | TableLocation;

export interface GameCard {
  card: CardDefinition;
  location: CardLocation;
  gameCardIndex: number;
}

export interface PersistedGameState {
  gameId: GameId;
  status: GameStatus;
  deckProvenance: DeckProvenance;
  commanders: CardDefinition[];
  deckName: string;
  deckId: number;
  totalCards: number;
  gameCards: GameCard[];
}

export interface PersistStatePort {
  save(psg: PersistedGameState): Promise<GameId>;
  retrieve(gameId: GameId): Promise<PersistedGameState | null>;
  newGameId(): GameId;
}