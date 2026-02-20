import { ArchidektGateway, ArchidektDeckToDeckAdapter, LocalFileAdapter, CascadingDeckRetrievalAdapter } from "./port-deck-retrieval/implementations.js";
import { RetrieveDeckPort, LOCAL_DECK_RELATIVE_PATH } from "./port-deck-retrieval/types.js";
import { PersistStatePort } from "./port-persist-state/types.js";
import { InMemoryPersistStateAdapter } from "./port-persist-state/InMemoryPersistStateAdapter.js";
import { SqlitePersistStateAdapter } from "./port-persist-state/SqlitePersistStateAdapter.js";
import { PersistPrepPort } from "./port-persist-prep/types.js";
import { InMemoryPersistPrepAdapter } from "./port-persist-prep/InMemoryPersistPrepAdapter.js";
import { SqlitePersistPrepAdapter } from "./port-persist-prep/SqlitePersistPrepAdapter.js";
import { CardRepositoryPort } from "./port-card-repository/types.js";
import { InMemoryCardRepositoryAdapter } from "./port-card-repository/InMemoryCardRepositoryAdapter.js";
import { SqliteCardRepositoryAdapter } from "./port-card-repository/SqliteCardRepositoryAdapter.js";
import { createApp } from "./app.js";

function createPersistStateAdapter(): PersistStatePort {
  const adapterType = process.env.PORT_PERSIST_STATE;

  if (adapterType === "in-memory") {
    console.log("Using in-memory persistence adapter");
    return new InMemoryPersistStateAdapter();
  } else {
    const dbPath = process.env.SQLITE_DB_PATH || "./data.db";
    console.log(`Using SQLite persistence adapter (${dbPath})`);
    return new SqlitePersistStateAdapter(dbPath);
  }
}

function createPersistPrepAdapter(): PersistPrepPort {
  const adapterType = process.env.PORT_PERSIST_PREP || process.env.PORT_PERSIST_STATE;

  if (adapterType === "in-memory") {
    console.log("Using in-memory prep persistence adapter");
    return new InMemoryPersistPrepAdapter();
  } else {
    const dbPath = process.env.SQLITE_DB_PATH || "./data.db";
    console.log(`Using SQLite prep persistence adapter (${dbPath})`);
    return new SqlitePersistPrepAdapter(dbPath);
  }
}

function createCardRepositoryAdapter(): CardRepositoryPort {
  const adapterType = process.env.PORT_CARD_REPOSITORY || process.env.PORT_PERSIST_STATE;

  if (adapterType === "in-memory") {
    console.log("Using in-memory card repository adapter");
    return new InMemoryCardRepositoryAdapter();
  } else {
    const dbPath = process.env.SQLITE_DB_PATH || "./data.db";
    console.log(`Using SQLite card repository adapter (${dbPath})`);
    return new SqliteCardRepositoryAdapter(dbPath);
  }
}

const deckRetriever: RetrieveDeckPort = new CascadingDeckRetrievalAdapter(new LocalFileAdapter(LOCAL_DECK_RELATIVE_PATH), new ArchidektDeckToDeckAdapter(new ArchidektGateway()));
const persistStatePort: PersistStatePort = createPersistStateAdapter();
const persistPrepPort: PersistPrepPort = createPersistPrepAdapter();
const cardRepository: CardRepositoryPort = createCardRepositoryAdapter();

const app = createApp(deckRetriever, persistStatePort, persistPrepPort, cardRepository);
const PORT = process.env.PORT || 3333;


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
