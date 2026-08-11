import { DeckProvenance } from "../types.js";
import { GameEvent } from "../GameEvents.js";
import { PrepId } from "../port-persist-prep/types.js";
import { GameId, GameStatus } from "../domain-types.js";
import { PersistedGameCard } from "./persisted-types.js";

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
// When/how to bump: apps/shuffler/notes/DESIGN-persistence-versioning.md
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
  // Table info (JES-127): present only when this game joined a table on the
  // Tabletop. Optional with graceful fallbacks (solo play) — NO version bump;
  // see the "optional fields" exception in apps/shuffler/notes/DESIGN-persistence-versioning.md.
  tableName?: string;
  playerName?: string;
  /** The seat's short GUID — player names are not unique; this is the seat's identity. */
  seatId?: string;
  // The Spine's own table/seat ids (src/port-spine/), present only when the
  // Spine join succeeded (best-effort). Same optional/no-version-bump exception.
  spineTableId?: string;
  spineSeatNumber?: number;
  // Table look: the /prepare picker's sleeve/playmat choice, snapshotted at
  // /start-game. Optional, no version bump — same exception as tableName above.
  sleeveColor?: string;
  playmatImagePath?: string;
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
