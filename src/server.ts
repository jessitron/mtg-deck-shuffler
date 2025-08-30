import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { shuffleDeck } from "./types.js";
import { ArchidektGateway, ArchidektDeckToDeckAdapter, LocalDeckAdapter, CascadingDeckRetrievalAdapter } from "./port-deck-retrieval/implementations.js";
import { formatChooseDeckHtml, formatDeckHtml, formatGameHtml } from "./html-formatters.js";
import { GameState } from "./GameState.js";
import { setCommonSpanAttributes } from "./tracing_util.js";
import { DeckRetrievalRequest, RetrieveDeckPort } from "./port-deck-retrieval/types.js";
import { PersistStatePort } from "./port-persist-state/types.js";
import { InMemoryAdapter } from "./port-persist-state/InMemoryAdapter.js";

const deckRetriever: RetrieveDeckPort = new CascadingDeckRetrievalAdapter(new LocalDeckAdapter(), new ArchidektDeckToDeckAdapter(new ArchidektGateway()));
const persistStateAdapter = new InMemoryAdapter();
const persistStatePort: PersistStatePort = persistStateAdapter;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "..")));

app.get("/game/:gameId", async (req, res) => {
  const gameId = parseInt(req.params.gameId);
  
  if (isNaN(gameId)) {
    res.status(400).send(`<div>
        <p>Error: Invalid game ID</p>
        <a href="/">Try another deck</a>
    </div>`);
    return;
  }

  try {
    const persistedState = await persistStateAdapter.retrieveLatest(gameId);
    
    if (!persistedState) {
      res.status(404).send(`<div>
          <p>Error: Game ${gameId} not found</p>
          <a href="/">Start a new game</a>
      </div>`);
      return;
    }

    const game = GameState.fromPersistedGameState(persistedState);
    const html = formatGameHtml(game);
    res.send(html);
  } catch (error) {
    console.error("Error loading game:", error);
    res.status(500).send(`<div>
        <p>Error: Could not load game ${gameId}</p>
        <a href="/">Try another deck</a>
    </div>`);
  }
});

app.get("/choose-deck", async (req, res) => {
  try {
    const availableDecks = deckRetriever.listAvailableDecks();
    const html = formatChooseDeckHtml(availableDecks);

    res.send(html);
  } catch (error) {
    console.error("Error fetching deck:", error);
    res.send(`<div>
        <p>Error: Could not figure out how you might load a deck</p>
        <a href="/">Try another deck</a>
    </div>`);
  }
});

app.post("/deck", async (req, res) => {
  const deckNumber: string = req.body["deck-number"];
  const deckSource: string = req.body["deck-source"];
  const localFile: string = req.body["local-deck"];
  setCommonSpanAttributes({ archidektDeckId: deckNumber, deckSource });
  const deckRequest: DeckRetrievalRequest =
    deckSource === "archidekt" ? { deckSource: "archidekt", archidektDeckId: deckNumber } : { deckSource: "local", localFile };

  try {
    const deck = await deckRetriever.retrieveDeck(deckRequest);
    const gameId = await persistStatePort.newGameId();
    const game = new GameState(gameId, deck);
    const stateId = await persistStatePort.save(game.toPersistedGameState());

    res.redirect(`/game/${gameId}`);
  } catch (error) {
    console.error("Error fetching deck:", error);
    res.send(`<div>
        <p>Error: Could not fetch deck ${deckNumber || localFile} from ${deckSource}</p>
        <a href="/">Try another deck</a>
    </div>`);
  }
});

app.post("/start-game", async (req, res) => {
  const gameIdStr: string = req.body["game-id"];
  const gameId = parseInt(gameIdStr);

  if (isNaN(gameId)) {
    res.status(400).send(`<div>
        <p>Error: Invalid game ID</p>
        <a href="/">Try another deck</a>
    </div>`);
    return;
  }

  try {
    const persistedState = await persistStateAdapter.retrieveLatest(gameId);
    
    if (!persistedState) {
      res.status(404).send(`<div>
          <p>Error: Game ${gameId} not found</p>
          <a href="/">Start a new game</a>
      </div>`);
      return;
    }

    const game = GameState.fromPersistedGameState(persistedState);
    const startedGame = game.startGame();
    const stateId = await persistStatePort.save(startedGame.toPersistedGameState());

    const html = formatGameHtml(startedGame);
    res.send(html);
  } catch (error) {
    console.error("Error starting game:", error);
    res.send(`<div>
        <p>Error: Could not start game ${gameId}</p>
        <a href="/">Try another deck</a>
    </div>`);
  }
});

app.post("/end-game", async (req, res) => {
  const deckId = req.body["deck-id"];
  // TODO: get this stuff from game state !!!
  try {
    const deck = await deckRetriever.retrieveDeck({ deckSource: "archidekt", archidektDeckId: deckId });
    const html = formatDeckHtml(deck);
    res.send(html);
  } catch (error) {
    console.error("Error ending game:", error);
    res.send(`<div>
        <p>Error: Could not reload deck ${deckId}</p>
        <a href="/">Try another deck</a>
    </div>`);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
