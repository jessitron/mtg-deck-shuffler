import { Deck } from "../types.js";

export type PrepId = number;

// Bumped 2 -> 3 when CardDefinition changed (commit f76b49c). A prep embeds a
// full Deck, so old preps carry old-shape cards (types instead of cardTypes) and
// can't be rendered correctly. Routes reject mismatched versions loudly.
// When/how to bump: notes/DESIGN-persistence-versioning.md
export const PERSISTED_GAME_PREP_VERSION: 3 = 3;

/** Thrown when a persisted prep was saved in a format this build can't load. */
export class IncompatiblePrepVersionError extends Error {
  constructor(public readonly foundVersion: unknown, public readonly expectedVersion: number) {
    super(
      `This preparation was saved in an older, incompatible format (version ${foundVersion}); this build expects version ${expectedVersion}. Please start a new preparation.`
    );
    this.name = "IncompatiblePrepVersionError";
  }
}

export interface PersistedGamePrep {
  version: typeof PERSISTED_GAME_PREP_VERSION;
  prepId: PrepId;
  deck: Deck; // Application layer uses full Deck; adapters handle dehydration internally
  createdAt: Date;
  updatedAt: Date;
  // Table info (JES-127): the Prep is where the Shuffler joins a table on the
  // Tabletop, and this record is what enables rejoining later. All optional
  // with graceful fallbacks (solo play) — NO version bump; see the "optional
  // fields" exception in notes/DESIGN-persistence-versioning.md.
  tableName?: string;
  playerName?: string;
  /** The seat's short GUID — player names are not unique; this is the seat's identity. */
  seatId?: string;
}

export interface PersistPrepPort {
  savePrep(prep: PersistedGamePrep): Promise<PrepId>;
  retrievePrep(prepId: PrepId): Promise<PersistedGamePrep | null>;
  newPrepId(): PrepId;
}
