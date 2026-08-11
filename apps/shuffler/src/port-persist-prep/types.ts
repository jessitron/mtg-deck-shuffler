import { Deck } from "../types.js";

export type PrepId = number;

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
  tableName?: string;
  playerName?: string;
  /** The seat's short GUID — player names are not unique; this is the seat's identity. */
  seatId?: string;
  spineTableId?: string;
  spineSeatNumber?: number;
  sleeveColor?: string;
  playmatImagePath?: string;
}

export interface PersistPrepPort {
  savePrep(prep: PersistedGamePrep): Promise<PrepId>;
  retrievePrep(prepId: PrepId): Promise<PersistedGamePrep | null>;
  newPrepId(): PrepId;
}
