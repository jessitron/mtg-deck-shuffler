import { Deck } from "../types.js";

export type PrepId = number;

export const PERSISTED_GAME_PREP_VERSION: 2 = 2;

export interface PersistedGamePrep {
  version: typeof PERSISTED_GAME_PREP_VERSION;
  prepId: PrepId;
  deck: Deck; // Application layer uses full Deck; adapters handle dehydration internally
  createdAt: Date;
  updatedAt: Date;
}

export interface PersistPrepPort {
  savePrep(prep: PersistedGamePrep): Promise<PrepId>;
  retrievePrep(prepId: PrepId): Promise<PersistedGamePrep | null>;
  newPrepId(): PrepId;
}
