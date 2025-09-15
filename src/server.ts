import { ArchidektGateway, ArchidektDeckToDeckAdapter, LocalDeckAdapter, CascadingDeckRetrievalAdapter } from "./port-deck-retrieval/implementations.js";
import { RetrieveDeckPort, LOCAL_DECK_RELATIVE_PATH } from "./port-deck-retrieval/types.js";
import { PersistStatePort } from "./port-persist-state/types.js";
import { InMemoryPersistStateAdapter } from "./port-persist-state/InMemoryPersistStateAdapter.js";
import { SqlitePersistStateAdapter } from "./port-persist-state/SqlitePersistStateAdapter.js";
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

const deckRetriever: RetrieveDeckPort = new CascadingDeckRetrievalAdapter(new LocalDeckAdapter(LOCAL_DECK_RELATIVE_PATH), new ArchidektDeckToDeckAdapter(new ArchidektGateway()));
const persistStatePort: PersistStatePort = createPersistStateAdapter();

const app = createApp(deckRetriever, persistStatePort);
const PORT = process.env.PORT || 3000;


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
