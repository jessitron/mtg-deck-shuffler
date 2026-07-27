import { CardDefinition, DeckProvenance } from "../types.js";
import { GameEvent } from "../GameEvents.js";
import { PrepId } from "../port-persist-prep/types.js";
import { PersistedGameCard } from "./persisted-types.js";

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

// Bumped 7 -> 8 when CardDefinition dropped manaCost/cmc/oracleText/backFace and
// renamed types -> cardTypes (commit f76b49c). The game-state envelope itself is
// unchanged, but the card data its scryfallIds resolve to is now incompatible, so
// games saved before this are not loadable. fromPersistedGameState rejects them.
// Bumped 8 -> 9 when the envelope gained mulliganStage/mulliganCount (the
// opening-hand acceptance stage).
// Bumped 9 -> 10 when those two fields were removed again: the mulligan stage
// and count are now DERIVED from the event log ("deal opening hand"/"mulligan"
// marker events) instead of stored, so undo restores them for free. Old games
// lack the markers, so they'd derive the wrong stage — rejected, not migrated.
// Bumped 10 -> 11 when the deal/mulligan events became atomic and carry their
// `moves` (so a mulligan is one undoable event). v10 events lack `moves`, so an
// old mulligan couldn't be undone — rejected, not migrated.
// When/how to bump: notes/DESIGN-persistence-versioning.md
export const PERSISTED_GAME_STATE_VERSION: 11 = 11;

/** Thrown when a persisted game was saved in a format this build can't load. */
export class IncompatibleStateVersionError extends Error {
  constructor(public readonly foundVersion: unknown, public readonly expectedVersion: number) {
    super(
      `This game was saved in an older, incompatible format (version ${foundVersion}); this build expects version ${expectedVersion}. Old games can't be loaded — please start a new game.`
    );
    this.name = "IncompatibleStateVersionError";
  }
}

export interface PersistedGameState {
  version: typeof PERSISTED_GAME_STATE_VERSION;
  gameId: GameId;
  status: GameStatus;
  prepId: PrepId;
  prepVersion: number;
  deckProvenance: DeckProvenance;
  deckName: string;
  deckId: number;
  totalCards: number;
  gameCards: PersistedGameCard[]; // Changed from GameCard[] to PersistedGameCard[]
  events: GameEvent[];
}

export interface GameHistorySummary {
  gameId: GameId;
  deckName: string;
  commanderNames: string[];
  actionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PersistStatePort {
  save(psg: PersistedGameState): Promise<GameId>;
  retrieve(gameId: GameId): Promise<PersistedGameState | null>;
  newGameId(): GameId;
  getAllGames(): Promise<GameHistorySummary[]>;
}
