import { CardDefinition, DeckProvenance } from "../types.js";
import { GameEvent } from "../GameEvents.js";

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

export interface CommandZoneLocation {
  type: "CommandZone";
  position: number;
}

export type CardLocation = LibraryLocation | HandLocation | RevealedLocation | TableLocation | CommandZoneLocation;

export function printLocation(l: CardLocation) {
  switch (l.type) {
    case "Hand":
    case "Revealed":
    case "Library":
    case "CommandZone":
      return `${l.type}(${l.position})`;
    case "Table":
      return l.type;
  }
}

export interface GameCard {
  card: CardDefinition;
  location: CardLocation;
  gameCardIndex: number;
  isCommander: boolean;
  currentFace: "front" | "back";
}

export const PERSISTED_GAME_STATE_VERSION: 6 = 6;

export interface PersistedGameState {
  version: typeof PERSISTED_GAME_STATE_VERSION;
  gameId: GameId;
  status: GameStatus;
  deckProvenance: DeckProvenance;
  deckName: string;
  deckId: number;
  totalCards: number;
  gameCards: GameCard[];
  events: GameEvent[];
}

export interface PersistStatePort {
  save(psg: PersistedGameState): Promise<GameId>;
  retrieve(gameId: GameId): Promise<PersistedGameState | null>;
  newGameId(): GameId;
}
