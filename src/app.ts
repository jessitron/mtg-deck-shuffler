import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { shuffleDeck } from "./types.js";
import { formatChooseDeckHtml, formatDeckHtml, formatGameNotFoundPageHtml } from "./view/load-deck-view.js";
import { formatGamePageHtml, formatLibraryModalHtml } from "./view/review-deck-view.js";
import { formatGameHtml, formatTableModalHtml } from "./view/active-game-view.js";
import { GameState } from "./GameState.js";
import { setCommonSpanAttributes } from "./tracing_util.js";
import { DeckRetrievalRequest, RetrieveDeckPort } from "./port-deck-retrieval/types.js";
import { PersistStatePort } from "./port-persist-state/types.js";
import { trace } from "@opentelemetry/api";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(deckRetriever: RetrieveDeckPort, persistStatePort: PersistStatePort): express.Application {
  const app = express();

  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(path.join(__dirname, "..", "public")));
  app.use("/decks", express.static(path.join(__dirname, "..", "decks")));

  // Returns whole page - deck selection screen
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

  // Redirects to game page or returns error fragment
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

  // Returns active game fragment - game board 
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

      const html = formatGameHtml(game, { shuffling: true });
      res.send(html);
    } catch (error) {
      console.error("Error starting game:", error);
      res.send(`<div>
        <p>Error: Could not start game ${gameId}</p>
        <a href="/">Try starting a new game</a>
    </div>`);
    }
  });

  // Returns whole page - game review screen (deck loaded, game not started)
  app.get("/game/:gameId", async (req, res) => {
    const gameId = parseInt(req.params.gameId);

    try {
      const persistedGame = await persistStatePort.retrieve(gameId);
      if (!persistedGame) {
        res.status(404).send(formatGameNotFoundPageHtml(gameId));
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

  // Redirects to new game page
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

  // Redirects to home page
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
  // Returns modal fragment - library contents modal
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

  // Returns modal fragment - table contents modal
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

  // Returns empty response - closes modal
  app.get("/close-modal", (req, res) => {
    res.send("");
  });

  // Card action endpoints
  // Returns active game fragment - updated game board
  app.post("/reveal-card/:gameId/:gameCardIndex", async (req, res) => {
    const gameId = parseInt(req.params.gameId);
    const gameCardIndex = parseInt(req.params.gameCardIndex);

    try {
      const persistedGame = await persistStatePort.retrieve(gameId);
      if (!persistedGame) {
        res.status(404).send(`<div>Game ${gameId} not found</div>`);
        return;
      }

      const game = GameState.fromPersistedGameState(persistedGame);
      game.revealByGameCardIndex(gameCardIndex);

      // Persist the updated state
      await persistStatePort.save(game.toPersistedGameState());

      const html = formatGameHtml(game);
      res.send(html);
    } catch (error) {
      console.error("Error revealing card:", error);
      res.status(500).send(`<div>Error revealing card</div>`);
    }
  });

  // Returns active game fragment - updated game board
  app.post("/put-in-hand/:gameId/:gameCardIndex", async (req, res) => {
    const gameId = parseInt(req.params.gameId);
    const gameCardIndex = parseInt(req.params.gameCardIndex);

    try {
      const persistedGame = await persistStatePort.retrieve(gameId);
      if (!persistedGame) {
        res.status(404).send(`<div>Game ${gameId} not found</div>`);
        return;
      }

      const game = GameState.fromPersistedGameState(persistedGame);
      game.putInHandByGameCardIndex(gameCardIndex);

      await persistStatePort.save(game.toPersistedGameState());

      const html = formatGameHtml(game);
      res.send(html);
    } catch (error) {
      console.error("Error putting card in hand:", error);
      res.status(500).send(`<div>Error putting card in hand</div>`);
    }
  });

  // Returns active game fragment - updated game board
  app.post("/put-down/:gameId/:gameCardIndex", async (req, res) => {
    const gameId = parseInt(req.params.gameId);
    const gameCardIndex = parseInt(req.params.gameCardIndex);

    try {
      const persistedGame = await persistStatePort.retrieve(gameId);
      if (!persistedGame) {
        res.status(404).send(`<div>Game ${gameId} not found</div>`);
        return;
      }

      const game = GameState.fromPersistedGameState(persistedGame);
      game.revealByGameCardIndex(gameCardIndex);

      // Persist the updated state
      await persistStatePort.save(game.toPersistedGameState());

      trace.getActiveSpan()?.setAttributes({
        "game.cardsInHand": game.listHand().length,
        "game.cardsRevealed": game.listRevealed().length,
      });

      const html = formatGameHtml(game);
      res.send(html);
    } catch (error) {
      console.error("Error putting card down:", error);
      res.status(500).send(`<div>Error putting card down</div>`);
    }
  });

  // Returns active game fragment - updated game board
  app.post("/put-on-top/:gameId/:gameCardIndex", async (req, res) => {
    const gameId = parseInt(req.params.gameId);
    const gameCardIndex = parseInt(req.params.gameCardIndex);

    try {
      const persistedGame = await persistStatePort.retrieve(gameId);
      if (!persistedGame) {
        res.status(404).send(`<div>Game ${gameId} not found</div>`);
        return;
      }

      const game = GameState.fromPersistedGameState(persistedGame);
      game.putOnTopByGameCardIndex(gameCardIndex);

      await persistStatePort.save(game.toPersistedGameState());

      const html = formatGameHtml(game);
      res.send(html);
    } catch (error) {
      console.error("Error putting card on top:", error);
      res.status(500).send(`<div>Error putting card on top</div>`);
    }
  });

  // Returns active game fragment - updated game board
  app.post("/put-on-bottom/:gameId/:gameCardIndex", async (req, res) => {
    const gameId = parseInt(req.params.gameId);
    const gameCardIndex = parseInt(req.params.gameCardIndex);

    try {
      const persistedGame = await persistStatePort.retrieve(gameId);
      if (!persistedGame) {
        res.status(404).send(`<div>Game ${gameId} not found</div>`);
        return;
      }

      const game = GameState.fromPersistedGameState(persistedGame);
      game.putOnBottomByGameCardIndex(gameCardIndex);

      await persistStatePort.save(game.toPersistedGameState());

      const html = formatGameHtml(game);
      res.send(html);
    } catch (error) {
      console.error("Error putting card on bottom:", error);
      res.status(500).send(`<div>Error putting card on bottom</div>`);
    }
  });

  // Returns active game fragment - updated game board
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

  // Returns active game fragment - updated game board
  app.post("/play-card/:gameId/:gameCardIndex", async (req, res) => {
    const gameId = parseInt(req.params.gameId);
    const gameCardIndex = parseInt(req.params.gameCardIndex);

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

      const whatHappened = game.playCard(gameCardIndex);
      const persistedGameState = game.toPersistedGameState();
      trace.getActiveSpan()?.setAttributes({
        "game.status": game.status,
        "game.cardsInLibrary": game.listLibrary().length,
        "game.cardsInHand": game.listHand().length,
        "game.full_json": JSON.stringify(persistedGameState),
      });

      await persistStatePort.save(persistedGameState);

      const html = formatGameHtml(game, whatHappened);
      res.send(html);
    } catch (error) {
      console.error("Error playing card:", error);
      res.status(500).send(`<div>Error: ${error instanceof Error ? error.message : "Could not play card"}</div>`);
    }
  });

  // Returns active game fragment - updated game board
  app.post("/shuffle/:gameId", async (req, res) => {
    const gameId = parseInt(req.params.gameId);

    try {
      const persistedGame = await persistStatePort.retrieve(gameId);
      if (!persistedGame) {
        res.status(404).send(`<div>Game ${gameId} not found</div>`);
        return;
      }

      const game = GameState.fromPersistedGameState(persistedGame);
      const whatHappened = game.shuffle();
      await persistStatePort.save(game.toPersistedGameState());

      const html = formatGameHtml(game, whatHappened);
      res.send(html);
    } catch (error) {
      console.error("Error shuffling library:", error);
      res.status(500).send(`<div>Error: ${error instanceof Error ? error.message : "Could not shuffle library"}</div>`);
    }
  });

  // Returns active game fragment - updated game board
  app.post("/move-to-left/:gameId/:handPosition", async (req, res) => {
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
        res.status(400).send(`<div>Cannot move card: Game is not active</div>`);
        return;
      }

      const whatHappened = game.swapHandCardWithLeft(handPosition);
      await persistStatePort.save(game.toPersistedGameState());

      const html = formatGameHtml(game, whatHappened);
      res.send(html);
    } catch (error) {
      console.error("Error moving card to left:", error);
      res.status(500).send(`<div>Error: ${error instanceof Error ? error.message : "Could not move card to left"}</div>`);
    }
  });

  // Returns active game fragment - updated game board
  app.post("/move-to-right/:gameId/:handPosition", async (req, res) => {
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
        res.status(400).send(`<div>Cannot move card: Game is not active</div>`);
        return;
      }

      const whatHappened = game.swapHandCardWithRight(handPosition);
      await persistStatePort.save(game.toPersistedGameState());

      const html = formatGameHtml(game, whatHappened);
      res.send(html);
    } catch (error) {
      console.error("Error moving card to right:", error);
      res.status(500).send(`<div>Error: ${error instanceof Error ? error.message : "Could not move card to right"}</div>`);
    }
  });

  app.post("/swap-with-next/:gameId/:handPosition", async (req, res) => {
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
        res.status(400).send(`<div>Cannot swap card: Game is not active</div>`);
        return;
      }

      const whatHappened = game.swapHandCardWithNext(handPosition);
      await persistStatePort.save(game.toPersistedGameState());

      const html = formatGameHtml(game, whatHappened);
      res.send(html);
    } catch (error) {
      console.error("Error swapping card with next:", error);
      res.status(500).send(`<div>Error: ${error instanceof Error ? error.message : "Could not swap card with next"}</div>`);
    }
  });

  // 404 handler - must be last
  app.get("*", (req, res) => {
    res.status(404).sendFile(path.join(__dirname, "..", "public", "404.html"));
  });

  return app;
}