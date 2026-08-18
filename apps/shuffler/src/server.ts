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
import { SpinePort } from "./port-spine/types.js";
import { HttpSpineGateway } from "./port-spine/HttpSpineGateway.js";
import { createApp } from "./app.js";
import { log } from "./log.js";

function createPersistStateAdapter(cardRepository: CardRepositoryPort): PersistStatePort {
  const adapterType = process.env.PORT_PERSIST_STATE;

  if (adapterType === "in-memory") {
    log.info("Using in-memory persistence adapter");
    return new InMemoryPersistStateAdapter(cardRepository);
  } else {
    const dbPath = process.env.SQLITE_DB_PATH || "./data.db";
    log.info("Using SQLite persistence adapter", { "db.path": dbPath });
    return new SqlitePersistStateAdapter(dbPath, cardRepository);
  }
}

function createPersistPrepAdapter(cardRepository: CardRepositoryPort): PersistPrepPort {
  const adapterType = process.env.PORT_PERSIST_PREP || process.env.PORT_PERSIST_STATE;

  if (adapterType === "in-memory") {
    log.info("Using in-memory prep persistence adapter");
    return new InMemoryPersistPrepAdapter(cardRepository);
  } else {
    const dbPath = process.env.SQLITE_DB_PATH || "./data.db";
    log.info("Using SQLite prep persistence adapter", { "db.path": dbPath });
    return new SqlitePersistPrepAdapter(dbPath, cardRepository);
  }
}

function createCardRepositoryAdapter(): CardRepositoryPort {
  const adapterType = process.env.PORT_CARD_REPOSITORY || process.env.PORT_PERSIST_STATE;

  if (adapterType === "in-memory") {
    log.info("Using in-memory card repository adapter");
    return new InMemoryCardRepositoryAdapter();
  } else {
    const dbPath = process.env.SQLITE_DB_PATH || "./data.db";
    log.info("Using SQLite card repository adapter", { "db.path": dbPath });
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

const spineUrl = process.env.SPINE_URL || "http://localhost:4600";
log.info("Sending card.played to the Spine's event log (for games at a table)", { "spine.url": spineUrl });
const spinePort: SpinePort = new HttpSpineGateway(spineUrl);

const app = createApp(deckRetriever, persistStatePort, persistPrepPort, cardRepository, spinePort);
const PORT = process.env.PORT || 3333;


app.listen(PORT, () => {
  log.info("Server running", { "server.url": `http://localhost:${PORT}` });
});
