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
import { ScryfallCardImagesGateway } from "./port-card-images/ScryfallCardImagesGateway.js";
import { TabletopPort } from "./port-tabletop/types.js";
import { HttpTabletopGateway } from "./port-tabletop/HttpTabletopGateway.js";
import { createApp } from "./app.js";

function createPersistStateAdapter(cardRepository: CardRepositoryPort): PersistStatePort {
  const adapterType = process.env.PORT_PERSIST_STATE;

  if (adapterType === "in-memory") {
    console.log("Using in-memory persistence adapter");
    return new InMemoryPersistStateAdapter(cardRepository);
  } else {
    const dbPath = process.env.SQLITE_DB_PATH || "./data.db";
    console.log(`Using SQLite persistence adapter (${dbPath})`);
    return new SqlitePersistStateAdapter(dbPath, cardRepository);
  }
}

function createPersistPrepAdapter(cardRepository: CardRepositoryPort): PersistPrepPort {
  const adapterType = process.env.PORT_PERSIST_PREP || process.env.PORT_PERSIST_STATE;

  if (adapterType === "in-memory") {
    console.log("Using in-memory prep persistence adapter");
    return new InMemoryPersistPrepAdapter(cardRepository);
  } else {
    const dbPath = process.env.SQLITE_DB_PATH || "./data.db";
    console.log(`Using SQLite prep persistence adapter (${dbPath})`);
    return new SqlitePersistPrepAdapter(dbPath, cardRepository);
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

const deckRetriever: RetrieveDeckPort = new CascadingDeckRetrievalAdapter(
  new LocalFileAdapter(LOCAL_DECK_RELATIVE_PATH),
  new ArchidektDeckToDeckAdapter(new ArchidektGateway(), undefined, new ScryfallCardImagesGateway())
);
const cardRepository: CardRepositoryPort = createCardRepositoryAdapter();
const persistStatePort: PersistStatePort = createPersistStateAdapter(cardRepository);
const persistPrepPort: PersistPrepPort = createPersistPrepAdapter(cardRepository);

// SCAFFOLDING (JES-127): the Shuffler talks straight to the Tabletop today;
// the Spine absorbs this seam later (see src/port-tabletop/types.ts).
// In production TABLETOP_URL is in-cluster DNS (http://mtg-tabletop-service);
// locally the tabletop dev server listens on 5180.
const tabletopUrl = process.env.TABLETOP_URL || "http://localhost:5180";
console.log(`Sending played cards to tabletop at ${tabletopUrl} (for games at a table)`);
const tabletopPort: TabletopPort = new HttpTabletopGateway(tabletopUrl);

const app = createApp(deckRetriever, persistStatePort, persistPrepPort, cardRepository, tabletopPort);
const PORT = process.env.PORT || 3333;


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
