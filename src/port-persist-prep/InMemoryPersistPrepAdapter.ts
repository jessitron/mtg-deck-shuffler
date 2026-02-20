import { PersistPrepPort, PersistedGamePrep, PrepId } from "./types.js";
import { CardRepositoryPort } from "../port-card-repository/types.js";
import { PersistedDeck } from "../port-persist-state/persisted-types.js";
import { hydrateDeck, dehydrateDeck } from "../port-card-repository/hydration.js";

// Internal storage type with dehydrated deck
interface StoredPrep {
  version: number;
  prepId: PrepId;
  deck: PersistedDeck;
  createdAt: Date;
  updatedAt: Date;
}

export class InMemoryPersistPrepAdapter implements PersistPrepPort {
  private storage = new Map<PrepId, StoredPrep>();
  private nextPrepId = 1;
  private cardRepository: CardRepositoryPort;

  constructor(cardRepository: CardRepositoryPort) {
    this.cardRepository = cardRepository;
  }

  async savePrep(prep: PersistedGamePrep): Promise<PrepId> {
    // Dehydrate the deck before storing
    const storedPrep: StoredPrep = {
      ...prep,
      deck: dehydrateDeck(prep.deck),
    };
    this.storage.set(prep.prepId, storedPrep);
    return prep.prepId;
  }

  async retrievePrep(prepId: PrepId): Promise<PersistedGamePrep | null> {
    const stored = this.storage.get(prepId);
    if (!stored) {
      return null;
    }

    // Hydrate the deck before returning
    const hydratedDeck = await hydrateDeck(stored.deck, this.cardRepository);
    return {
      version: stored.version as 2,
      prepId: stored.prepId,
      deck: hydratedDeck,
      createdAt: stored.createdAt,
      updatedAt: stored.updatedAt,
    };
  }

  newPrepId(): PrepId {
    return this.nextPrepId++;
  }
}
