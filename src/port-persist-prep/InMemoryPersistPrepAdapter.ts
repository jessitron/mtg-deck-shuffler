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

  async retrieveLatestPrepByDeck(deckId: number): Promise<PersistedGamePrep | null> {
    // Find all preps for this deck
    const prepsForDeck = Array.from(this.storage.values()).filter(
      (prep) => prep.deck.id === deckId
    );

    if (prepsForDeck.length === 0) {
      return null;
    }

    // Sort by createdAt descending and return the first one
    const sortedPreps = prepsForDeck.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );

    return { ...sortedPreps[0] };
  }

  newPrepId(): PrepId {
    return this.nextPrepId++;
  }
}
