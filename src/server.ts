import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { shuffleDeck } from "./types.js";
import { ArchidektGateway, ArchidektDeckToDeckAdapter, LocalDeckAdapter, CascadingDeckRetrievalAdapter } from "./port-deck-retrieval/implementations.js";
import { formatChooseDeckHtml, formatDeckHtml, formatGameHtml, formatGamePageHtml, formatLibraryModalHtml, formatTableModalHtml } from "./html-formatters.js";
import { GameState } from "./GameState.js";
import { setCommonSpanAttributes } from "./tracing_util.js";
import { DeckRetrievalRequest, RetrieveDeckPort } from "./port-deck-retrieval/types.js";
import { PersistStatePort } from "./port-persist-state/types.js";
import { InMemoryPersistStateAdapter } from "./port-persist-state/InMemoryPersistStateAdapter.js";
import { trace } from "@opentelemetry/api";

const deckRetriever: RetrieveDeckPort = new CascadingDeckRetrievalAdapter(new LocalDeckAdapter(), new ArchidektDeckToDeckAdapter(new ArchidektGateway()));
const persistStatePort: PersistStatePort = new InMemoryPersistStateAdapter();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "..", "public")));

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
    const gameId = persistStatePort.newGameId();
    const game = new GameState(gameId, deck);
    await persistStatePort.save(game.toPersistedGameState());

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
  const gameId: number = parseInt(req.body["game-id"]);

  try {
    const persistedGame = await persistStatePort.retrieve(gameId);
    if (!persistedGame) {
      res.status(404).send(`<div>
          <p>Game ${gameId} not found</p>
          <a href="/">Start a new game</a>
      </div>`);
      return;
    }

    const game = GameState.fromPersistedGameState(persistedGame);
    game.startGame();
    await persistStatePort.save(game.toPersistedGameState());

    const html = formatGameHtml(game, true);
    res.send(html);
  } catch (error) {
    console.error("Error starting game:", error);
    res.send(`<div>
        <p>Error: Could not start game ${gameId}</p>
        <a href="/">Try starting a new game</a>
    </div>`);
  }
});

app.get("/game/:gameId", async (req, res) => {
  const gameId = parseInt(req.params.gameId);

  try {
    const persistedGame = await persistStatePort.retrieve(gameId);
    if (!persistedGame) {
      res.status(404).send(`<div>
          <p>Game ${gameId} not found</p>
          <a href="/">Start a new game</a>
      </div>`);
      return;
    }

    const game = GameState.fromPersistedGameState(persistedGame);
    const html = formatGamePageHtml(game);
    res.send(html);
  } catch (error) {
    console.error("Error loading game:", error);
    res.status(500).send(`<div>
        <p>Error: Could not load game ${gameId}</p>
        <a href="/">Try starting a new game</a>
    </div>`);
  }
});

app.post("/restart-game", async (req, res) => {
  const gameId: number = parseInt(req.body["game-id"]);

  try {
    const persistedGame = await persistStatePort.retrieve(gameId);
    if (!persistedGame) {
      res.status(404).send(`<div>
          <p>Game ${gameId} not found</p>
          <a href="/">Start a new game</a>
      </div>`);
      return;
    }

    // Create new game with same deck data
    let deckRequest: DeckRetrievalRequest;
    if (persistedGame.deckProvenance.deckSource === "archidekt") {
      // Extract archidekt deck ID from sourceUrl like "https://archidekt.com/decks/14669648"
      const match = persistedGame.deckProvenance.sourceUrl.match(/\/decks\/(\d+)/);
      if (!match) {
        throw new Error(`Cannot extract archidekt deck ID from URL: ${persistedGame.deckProvenance.sourceUrl}`);
      }
      deckRequest = { deckSource: "archidekt", archidektDeckId: match[1] };
    } else if (persistedGame.deckProvenance.deckSource === "local") {
      // Extract local file path from sourceUrl like "local://path/to/file.json"
      const localFile = persistedGame.deckProvenance.sourceUrl.replace("local://", "");
      deckRequest = { deckSource: "local", localFile };
    } else {
      throw new Error(`Unsupported deck source: ${persistedGame.deckProvenance.deckSource}`);
    }

    const deck = await deckRetriever.retrieveDeck(deckRequest);
    const newGameId = persistStatePort.newGameId();
    const newGame = new GameState(newGameId, deck);
    await persistStatePort.save(newGame.toPersistedGameState());

    res.redirect(`/game/${newGameId}`);
  } catch (error) {
    console.error("Error restarting game:", error);
    res.status(500).send(`<div>
        <p>Error: Could not restart game ${gameId}</p>
        <a href="/">Try starting a new game</a>
    </div>`);
  }
});

app.post("/end-game", async (req, res) => {
  const gameId: number = parseInt(req.body["game-id"]);

  try {
    const persistedGame = await persistStatePort.retrieve(gameId);
    if (persistedGame) {
      // Mark the game as ended by updating its status
      const game = GameState.fromPersistedGameState(persistedGame);
      // TODO: Add an "ended" status to GameState if needed
      await persistStatePort.save(game.toPersistedGameState());
    }

    res.redirect("/");
  } catch (error) {
    console.error("Error ending game:", error);
    res.redirect("/");
  }
});

// Modal endpoints
app.get("/library-modal/:gameId", async (req, res) => {
  const gameId = parseInt(req.params.gameId);

  try {
    const persistedGame = await persistStatePort.retrieve(gameId);
    if (!persistedGame) {
      res.status(404).send(`<div>Game ${gameId} not found</div>`);
      return;
    }

    const game = GameState.fromPersistedGameState(persistedGame);
    const modalHtml = formatLibraryModalHtml(game);
    res.send(modalHtml);
  } catch (error) {
    console.error("Error loading library modal:", error);
    res.status(500).send(`<div>Error loading library</div>`);
  }
});

app.get("/table-modal/:gameId", async (req, res) => {
  const gameId = parseInt(req.params.gameId);

  try {
    const persistedGame = await persistStatePort.retrieve(gameId);
    if (!persistedGame) {
      res.status(404).send(`<div>Game ${gameId} not found</div>`);
      return;
    }

    const game = GameState.fromPersistedGameState(persistedGame);
    const modalHtml = formatTableModalHtml(game);
    res.send(modalHtml);
  } catch (error) {
    console.error("Error loading table modal:", error);
    res.status(500).send(`<div>Error loading table contents</div>`);
  }
});

app.get("/close-modal", (req, res) => {
  res.send("");
});

// Card action endpoints
app.post("/reveal-card/:gameId/:position", async (req, res) => {
  const gameId = parseInt(req.params.gameId);
  const position = parseInt(req.params.position);

  try {
    const persistedGame = await persistStatePort.retrieve(gameId);
    if (!persistedGame) {
      res.status(404).send(`<div>Game ${gameId} not found</div>`);
      return;
    }

    const game = GameState.fromPersistedGameState(persistedGame);
    game.reveal(position);

    // Persist the updated state
    await persistStatePort.save(game.toPersistedGameState());

    const html = formatGameHtml(game);
    res.send(html);
  } catch (error) {
    console.error("Error revealing card:", error);
    res.status(500).send(`<div>Error revealing card</div>`);
  }
});

app.post("/put-in-hand/:gameId/:cardIndex", async (req, res) => {
  const gameId = parseInt(req.params.gameId);
  const cardIndex = parseInt(req.params.cardIndex);

  try {
    const persistedGame = await persistStatePort.retrieve(gameId);
    if (!persistedGame) {
      res.status(404).send(`<div>Game ${gameId} not found</div>`);
      return;
    }

    const game = GameState.fromPersistedGameState(persistedGame);
    // TODO: Implement put in hand functionality
    console.log(`Put card in hand at position: ${cardIndex} in game ${gameId}`);

    // For now, just return the current game state
    const html = formatGameHtml(game);
    res.send(html);
  } catch (error) {
    console.error("Error putting card in hand:", error);
    res.status(500).send(`<div>Error putting card in hand</div>`);
  }
});

app.post("/draw/:gameId", async (req, res) => {
  const gameId = parseInt(req.params.gameId);

  try {
    const persistedGame = await persistStatePort.retrieve(gameId);
    if (!persistedGame) {
      res.status(404).send(`<div>Game ${gameId} not found</div>`);
      return;
    }

    const game = GameState.fromPersistedGameState(persistedGame);

    if (game.status !== "Active") {
      res.status(400).send(`<div>Cannot draw: Game is not active</div>`);
      return;
    }

    game.draw();
    const persistedGameState = game.toPersistedGameState();
    trace.getActiveSpan()?.setAttributes({
      "game.status": game.status,
      "game.cardsInLibrary": game.listLibrary().length,
      "game.cardsInHand": game.listHand().length,
      "game.full_json": JSON.stringify(persistedGameState),
    });
    await persistStatePort.save(persistedGameState);

    const html = formatGameHtml(game);
    res.send(html);
  } catch (error) {
    console.error("Error drawing card:", error);
    res.status(500).send(`<div>Error: ${error instanceof Error ? error.message : "Could not draw card"}</div>`);
  }
});

app.post("/play-card/:gameId/:handPosition", async (req, res) => {
  const gameId = parseInt(req.params.gameId);
  const handPosition = parseInt(req.params.handPosition);

  try {
    const persistedGame = await persistStatePort.retrieve(gameId);
    if (!persistedGame) {
      res.status(404).send(`<div>Game ${gameId} not found</div>`);
      return;
    }

    const game = GameState.fromPersistedGameState(persistedGame);

    if (game.status !== "Active") {
      res.status(400).send(`<div>Cannot play card: Game is not active</div>`);
      return;
    }

    game.playCardFromHand(handPosition);
    const persistedGameState = game.toPersistedGameState();
    trace.getActiveSpan()?.setAttributes({
      "game.status": game.status,
      "game.cardsInLibrary": game.listLibrary().length,
      "game.cardsInHand": game.listHand().length,
      "game.full_json": JSON.stringify(persistedGameState),
    });

    await persistStatePort.save(persistedGameState);

    const html = formatGameHtml(game);
    res.send(html);
  } catch (error) {
    console.error("Error playing card:", error);
    res.status(500).send(`<div>Error: ${error instanceof Error ? error.message : "Could not play card"}</div>`);
  }
});

app.post("/shuffle/:gameId", async (req, res) => {
  const gameId = parseInt(req.params.gameId);

  try {
    const persistedGame = await persistStatePort.retrieve(gameId);
    if (!persistedGame) {
      res.status(404).send(`<div>Game ${gameId} not found</div>`);
      return;
    }

    const game = GameState.fromPersistedGameState(persistedGame);
    game.shuffle();
    await persistStatePort.save(game.toPersistedGameState());

    const html = formatGameHtml(game, true);
    res.send(html);
  } catch (error) {
    console.error("Error shuffling library:", error);
    res.status(500).send(`<div>Error: ${error instanceof Error ? error.message : "Could not shuffle library"}</div>`);
  }
});

app.post("/reveal-top/:gameId", async (req, res) => {
  const gameId = parseInt(req.params.gameId);

  try {
    const persistedGame = await persistStatePort.retrieve(gameId);
    if (!persistedGame) {
      res.status(404).send(`<div>Game ${gameId} not found</div>`);
      return;
    }

    const game = GameState.fromPersistedGameState(persistedGame);

    if (game.status !== "Active") {
      res.status(400).send(`<div>Cannot reveal: Game is not active</div>`);
      return;
    }

    game.revealTop();
    await persistStatePort.save(game.toPersistedGameState());

    const html = formatGameHtml(game);
    res.send(html);
  } catch (error) {
    console.error("Error revealing top card:", error);
    res.status(500).send(`<div>Error: ${error instanceof Error ? error.message : "Could not reveal top card"}</div>`);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
