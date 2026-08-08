import { CardDefinition } from "./types.js";

// The game-state domain vocabulary: what a game is made of while it's being
// played. GameState.ts is the module that owns and mutates these; the
// persistence port (port-persist-state/) depends on them, not the other way
// around. The persisted (on-disk) shapes live in
// port-persist-state/persisted-types.ts.

export type GameId = number;

export enum GameStatus {
  Active = "Active",
  Ended = "Ended",
}

export interface LibraryLocation {
  type: "Library";
  /**
   * Position for ordering cards in library. NOT constrained to contiguous integers [0, length).
   * Positions must be unique within Library but can have gaps and be fractional.
   */
  position: number;
}

export interface HandLocation {
  type: "Hand";
  /**
   * Position for ordering cards in hand. NOT constrained to contiguous integers [0, length).
   *
   * - Initial assignment: Cards drawn get sequential integers (0, 1, 2, ...)
   * - After removal: Gaps remain (no renormalization). E.g., [0,1,2,3] -> remove 1 -> [0,2,3]
   * - After reordering: Fractional values used between cards. E.g., moving between positions 1 and 2 -> position 1.5
   * - Constraints: Must be unique within Hand, but can be any number (integer or float) with gaps
   * - Display: Cards sorted by position value (see GameState.listHand())
   */
  position: number;
}

export interface RevealedLocation {
  type: "Revealed";
  /**
   * Position for ordering revealed cards. NOT constrained to contiguous integers [0, length).
   * Positions must be unique within Revealed but can have gaps and be fractional.
   */
  position: number;
}

export interface TableLocation {
  type: "Table";
}

export interface CommandZoneLocation {
  type: "CommandZone";
  /**
   * Position for ordering cards in command zone. NOT constrained to contiguous integers [0, length).
   * Positions must be unique within CommandZone but can have gaps and be fractional.
   */
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
  /**
   * Opaque GUID: this card's *instance* identity for the event contract
   * (JES-128) — "this particular Forest", minted per game. Optional only for
   * old saves; GameState mints-on-load, so it is always present at runtime.
   * This — never gameCardIndex — is what crosses the Shuffler's boundary.
   */
  cardInstanceId?: string;
}
