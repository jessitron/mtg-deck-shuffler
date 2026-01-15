import { Deck } from "../types.js";
import { SleeveConfig } from "../types/SleeveConfig.js";

export type PrepId = number;

export interface PersistedGamePrep {
  version: number;
  prepId: PrepId;
  deck: Deck;
  sleeveConfig?: SleeveConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface PersistPrepPort {
  savePrep(prep: PersistedGamePrep): Promise<PrepId>;
  retrievePrep(prepId: PrepId): Promise<PersistedGamePrep | null>;
  newPrepId(): PrepId;
}
