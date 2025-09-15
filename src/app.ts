import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { formatHomepageHtmlPage } from "./view/deck-selection/deck-selection-page.js";
import { formatErrorPageHtmlPage } from "./view/error-view.js";
import { formatDeckReviewHtmlPage, formatLibraryModalHtml } from "./view/deck-review/deck-review-page.js";
import { formatGameHtmlSection, formatTableModalHtmlFragment } from "./view/play-game/active-game-page.js";
import { formatHistoryModalHtmlFragment } from "./view/play-game/history-components.js";
import { formatDebugStateModalHtmlFragment } from "./view/debug/state-copy.js";
import { formatLoadStateModalHtmlFragment } from "./view/debug/load-state.js";
import { formatGamePageHtmlPage } from "./view/play-game/active-game-page.js";
import { GameState } from "./GameState.js";
import { setCommonSpanAttributes } from "./tracing_util.js";
import { DeckRetrievalRequest, RetrieveDeckPort } from "./port-deck-retrieval/types.js";
import { PersistStatePort, PERSISTED_GAME_STATE_VERSION, PersistedGameState } from "./port-persist-state/types.js";
import { trace } from "@opentelemetry/api";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(deckRetriever: RetrieveDeckPort, persistStatePort: PersistStatePort): express.Application {
  const app = express();

  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(express.json({ limit: '10mb' }));

  // Returns whole page - homepage with deck selection
  app.get("/", async (req, res) => {
    try {
      const availableDecks = deckRetriever.listAvailableDecks();
      const html = formatHomepageHtmlPage(availableDecks);

      res.send(html);
    } catch (error) {
      console.error("Error loading homepage:", error);
      res.status(500).send(`<div>
        <p>Error: Could not load the homepage</p>
        <p>Please try refreshing the page</p>
    </div>`);
    }
  });

  app.use(express.static(path.join(__dirname, "..", "public")));
  app.use("/decks", express.static(path.join(__dirname, "..", "decks")));

  // Redirects to game page on success, returns whole error page on failure
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
      const game = GameState.newGame(gameId, deck);
      await persistStatePort.save(game.toPersistedGameState());

      res.redirect(`/game/${gameId}`);
    } catch (error) {
      console.error("Error fetching deck:", error);
      res.status(500).send(
        formatErrorPageHtmlPage({
          icon: "🚫",
          title: "Deck Load Error",
          message: `Could not fetch deck <strong>${deckNumber || localFile}</strong> from <strong>${deckSource}</strong>.`,
          details: "The deck may not exist, be private, or there may be a network issue.",
        })
      );
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

      const html = formatGameHtmlSection(game, { shuffling: true });
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
        res.status(404).send(
          formatErrorPageHtmlPage({
            icon: "🎯",
            title: "Game Not Found",
            message: `Game <strong>${gameId}</strong> could not be found.`,
            details: "It may have expired or the ID might be incorrect.",
          })
        );
        return;
      }

      const game = GameState.fromPersistedGameState(persistedGame);
      var html: string;
      if (game.gameStatus() === "Active") {
        html = formatGamePageHtmlPage(game);
      } else {
        html = formatDeckReviewHtmlPage(game);
      }
      res.send(html);
    } catch (error) {
      console.error("Error loading game:", error);
      res.status(500).send(
        formatErrorPageHtmlPage({
          icon: "⚠️",
          title: "Game Load Error",
          message: `Could not load game <strong>${gameId}</strong>.`,
          details: "There may be a technical issue with the game data.",
        })
      );
    }
  });

  // Redirects to new game page
  app.post("/restart-game", async (req, res) => {
    const gameId: number = parseInt(req.body["game-id"]);

    try {
      const persistedGame = await persistStatePort.retrieve(gameId);
      if (!persistedGame) {
        res.status(404).send(
          formatErrorPageHtmlPage({
            icon: "🎯",
            title: "Game Not Found",
            message: `Game <strong>${gameId}</strong> could not be found.`,
            details: "It may have expired or the ID might be incorrect.",
          })
        );
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
        // sourceUrl is like /decks/
        const localFile = persistedGame.deckProvenance.sourceUrl.replace(/.*\//, "");
        deckRequest = { deckSource: "local", localFile };
      } else {
        throw new Error(`Unsupported deck source: ${persistedGame.deckProvenance.deckSource}`);
      }

      const deck = await deckRetriever.retrieveDeck(deckRequest);
      const newGameId = persistStatePort.newGameId();
      const newGame = GameState.newGame(newGameId, deck);
      await persistStatePort.save(newGame.toPersistedGameState());

      res.redirect(`/game/${newGameId}`);
    } catch (error) {
      console.error("Error restarting game:", error);
      res.status(500).send(
        formatErrorPageHtmlPage({
          icon: "🔄",
          title: "Game Restart Error",
          message: `Could not restart game <strong>${gameId}</strong>.`,
          details: "There may be an issue with the original deck data.",
        })
      );
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
      const modalHtml = formatTableModalHtmlFragment(game);
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

  // Returns modal for loading game state
  app.get("/load-state-modal", (req, res) => {
    const modalHtml = formatLoadStateModalHtmlFragment();
    res.send(modalHtml);
  });

  // Creates a new game from JSON state
  app.post("/create-game-from-state", async (req, res) => {
    const { "state-json": stateJsonString } = req.body;

    try {
      const stateData = JSON.parse(stateJsonString);

      // Validate version
      if (stateData.version !== PERSISTED_GAME_STATE_VERSION) {
        const errorMessage = `Invalid state version. Expected version ${PERSISTED_GAME_STATE_VERSION}, but got ${stateData.version}`;
        res.status(400).send(`<div class="error-message">
          <h3>⚠️ Version Mismatch</h3>
          <p>${errorMessage}</p>
          <button hx-get="/" hx-target="body" hx-swap="outerHTML">Back to Home</button>
        </div>`);
        return;
      }

      // Create new game with fresh ID
      const newGameId = persistStatePort.newGameId();
      const newPersistedState: PersistedGameState = {
        ...stateData,
        gameId: newGameId
      };

      // Save the new game
      await persistStatePort.save(newPersistedState);

      // Redirect to the new game
      res.send(`<div>
        <p>Game created successfully! Redirecting...</p>
        <script>window.location.href = '/game/${newGameId}';</script>
      </div>`);

    } catch (error) {
      console.error("Error creating game from state:", error);
      let errorMessage = "Failed to parse JSON or create game";
      if (error instanceof SyntaxError) {
        errorMessage = "Invalid JSON format";
      }
      res.status(400).send(`<div class="error-message">
        <h3>⚠️ Error</h3>
        <p>${errorMessage}</p>
        <button hx-get="/load-state-modal" hx-target="#modal-container" hx-swap="innerHTML">Try Again</button>
        <button hx-get="/close-modal" hx-target="#modal-container" hx-swap="innerHTML">Cancel</button>
      </div>`);
    }
  });

  app.get("/history-modal/:gameId", async (req, res) => {
    const gameId = parseInt(req.params.gameId);
    try {
      const persistedGame = await persistStatePort.retrieve(gameId);
      if (!persistedGame) {
        res.status(404).send(`<div>Game ${gameId} not found</div>`);
        return;
      }
      const game = GameState.fromPersistedGameState(persistedGame);
      const modalHtml = formatHistoryModalHtmlFragment(game);
      res.send(modalHtml);
    } catch (error) {
      console.error("Error loading history modal:", error);
      res.status(500).send(`<div>Error loading history</div>`);
    }
  });

  app.get("/debug-state/:gameId", async (req, res) => {
    const gameId = parseInt(req.params.gameId);
    try {
      const persistedGame = await persistStatePort.retrieve(gameId);
      if (!persistedGame) {
        res.status(404).send(`<div>Game ${gameId} not found</div>`);
        return;
      }
      const modalHtml = formatDebugStateModalHtmlFragment(persistedGame);
      res.send(modalHtml);
    } catch (error) {
      console.error("Error loading debug state:", error);
      res.status(500).send(`<div>Error loading debug state</div>`);
    }
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

      const html = formatGameHtmlSection(game);
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

      const html = formatGameHtmlSection(game);
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

      const html = formatGameHtmlSection(game);
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

      const html = formatGameHtmlSection(game);
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

      const html = formatGameHtmlSection(game);
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

      if (game.gameStatus() !== "Active") {
        res.status(400).send(`<div>Cannot draw: Game is not active</div>`);
        return;
      }

      game.draw();
      const persistedGameState = game.toPersistedGameState();
      trace.getActiveSpan()?.setAttributes({
        "game.gameStatus()": game.gameStatus(),
        "game.cardsInLibrary": game.listLibrary().length,
        "game.cardsInHand": game.listHand().length,
        "game.full_json": JSON.stringify(persistedGameState),
      });
      await persistStatePort.save(persistedGameState);

      const html = formatGameHtmlSection(game);
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

      if (game.gameStatus() !== "Active") {
        res.status(400).send(`<div>Cannot play card: Game is not active</div>`);
        return;
      }

      const whatHappened = game.playCard(gameCardIndex);
      const persistedGameState = game.toPersistedGameState();
      trace.getActiveSpan()?.setAttributes({
        "game.gameStatus()": game.gameStatus(),
        "game.cardsInLibrary": game.listLibrary().length,
        "game.cardsInHand": game.listHand().length,
        "game.full_json": JSON.stringify(persistedGameState),
      });

      await persistStatePort.save(persistedGameState);

      const html = formatGameHtmlSection(game, whatHappened);
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

      const html = formatGameHtmlSection(game, whatHappened);
      res.send(html);
    } catch (error) {
      console.error("Error shuffling library:", error);
      res.status(500).send(`<div>Error: ${error instanceof Error ? error.message : "Could not shuffle library"}</div>`);
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

      if (game.gameStatus() !== "Active") {
        res.status(400).send(`<div>Cannot swap card: Game is not active</div>`);
        return;
      }

      const whatHappened = game.swapHandCardWithNext(handPosition);
      await persistStatePort.save(game.toPersistedGameState());

      const html = formatGameHtmlSection(game, whatHappened);
      res.send(html);
    } catch (error) {
      console.error("Error swapping card with next:", error);
      res.status(500).send(`<div>Error: ${error instanceof Error ? error.message : "Could not swap card with next"}</div>`);
    }
  });

  app.post("/undo/:gameId/:gameEventIndex", async (req, res) => {
    const gameId = parseInt(req.params.gameId);
    const gameEventIndex = parseInt(req.params.gameEventIndex);
    try {
      const persistedGame = await persistStatePort.retrieve(gameId);
      if (!persistedGame) {
        res.status(404).send(`<div>Game ${gameId} not found</div>`);
        return;
      }

      var game = GameState.fromPersistedGameState(persistedGame);
      game = game.undo(gameEventIndex);
      await persistStatePort.save(game.toPersistedGameState());

      const html = formatGameHtmlSection(game);
      res.send(html);
    } catch (error) {
      console.error("Error undoing event:", error);
      res.status(500).send(`<div>Error: ${error instanceof Error ? error.message : "Could not undo event"}</div>`);
    }
  });

  // Proxy endpoint for card images to avoid CORS issues
  app.get("/proxy-image", async (req, res) => {
    const cardId = req.query.cardId as string;

    if (!cardId || typeof cardId !== "string" || cardId.length !== 36) {
      return res.status(400).send("Invalid card ID");
    }

    try {
      // Import getCardImageUrl function
      const { getCardImageUrl } = await import("./types.js");
      const imageUrl = getCardImageUrl(cardId);

      const response = await fetch(imageUrl);
      if (!response.ok) {
        return res.status(response.status).send("Failed to fetch image");
      }

      // Set CORS headers to allow the frontend to access the image
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Content-Type", response.headers.get("content-type") || "image/png");

      // Pipe the image data through
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (error) {
      console.error("Error proxying image:", error);
      res.status(500).send("Internal server error");
    }
  });

  // 404 handler - must be last
  app.get("*", (req, res) => {
    res.status(404).sendFile(path.join(__dirname, "..", "public", "404.html"));
  });

  return app;
}
