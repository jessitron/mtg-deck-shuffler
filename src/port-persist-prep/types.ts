import { Deck } from "../types.js";

export type PrepId = number;

export interface PersistedGamePrep {
  version: number;
  prepId: PrepId;
  deck: Deck;
  createdAt: Date;
  updatedAt: Date;
}

export interface PersistPrepPort {
  savePrep(prep: PersistedGamePrep): Promise<PrepId>;
  retrievePrep(prepId: PrepId): Promise<PersistedGamePrep | null>;
  retrieveLatestPrepByDeck(deckId: number): Promise<PersistedGamePrep | null>;
  newPrepId(): PrepId;
}
