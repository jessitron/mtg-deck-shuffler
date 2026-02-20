import { Deck } from "../types.js";

export type PrepId = number;

export const PERSISTED_GAME_PREP_VERSION: 2 = 2;

export interface PersistedGamePrep {
  version: typeof PERSISTED_GAME_PREP_VERSION;
  prepId: PrepId;
  deck: Deck;
  createdAt: Date;
  updatedAt: Date;
}

export interface PersistPrepPort {
  savePrep(prep: PersistedGamePrep): Promise<PrepId>;
  retrievePrep(prepId: PrepId): Promise<PersistedGamePrep | null>;
  newPrepId(): PrepId;
}
