import { PersistPrepPort, PersistedGamePrep, PrepId } from "./types.js";

export class InMemoryPersistPrepAdapter implements PersistPrepPort {
  private storage = new Map<PrepId, PersistedGamePrep>();
  private nextPrepId = 1;

  async savePrep(prep: PersistedGamePrep): Promise<PrepId> {
    this.storage.set(prep.prepId, { ...prep });
    return prep.prepId;
  }

  async retrievePrep(prepId: PrepId): Promise<PersistedGamePrep | null> {
    const stored = this.storage.get(prepId);
    return stored ? { ...stored } : null;
  }

  newPrepId(): PrepId {
    return this.nextPrepId++;
  }
}
