import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { formatHomeV2HtmlPage } from "./view/home-v2/home-v2-page.js";
import { formatErrorPageHtmlPage } from "./view/error-view.js";
import { formatDeckReviewHtmlPage } from "./view/deck-review/deck-review-page.js";
import { formatCardModalHtmlFragment, formatLibraryModalHtml, formatLossModalHtmlFragment, formatStaleStateErrorModal, formatTableModalHtmlFragment } from "./view/play-game/game-modals.js";
import { formatFlippingContainer } from "./view/common/shared-components.js";
import { formatHistoryModalHtmlFragment } from "./view/play-game/history-components.js";
import { formatDebugStateModalHtmlFragment } from "./view/debug/state-copy.js";
import { formatLoadStateHtmlPage } from "./view/debug/load-state.js";
import { formatDebugSectionHtmlFragment } from "./view/debug/debug-section.js";
import { formatActiveGameHtmlSection, formatGamePageHtmlPage } from "./view/play-game/active-game-page.js";
import { GameState } from "./GameState.js";
import { setCommonSpanAttributes } from "./tracing_util.js";
import { DeckRetrievalRequest, RetrieveDeckPort } from "./port-deck-retrieval/types.js";
import { PersistStatePort, PERSISTED_GAME_STATE_VERSION, PersistedGameState } from "./port-persist-state/types.js";
import { trace } from "@opentelemetry/api";
import { getCardImageUrl } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(deckRetriever: RetrieveDeckPort, persistStatePort: PersistStatePort): express.Application {
  const app = express();

  // Configure EJS view engine
  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "..", "views"));

  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use(express.json({ limit: "10mb" }));

  // Middleware to extract browserTabId from request headers and add to tracing and locals
  app.use((req, res, next) => {
    const browserTabId = req.headers["x-browser-tab-id"];
    if (browserTabId && typeof browserTabId === "string") {
      setCommonSpanAttributes({ browserTabId });
      res.locals.browserTabId = browserTabId;
    }
    next();
  });
  
  // Helper function to validate state version for optimistic concurrency control
  function validateStateVersion(
    req: express.Request,
    game: GameState
  ): { valid: true } | { valid: false; errorHtml: string } {
    const expectedVersionStr = req.body["expected-version"];
    if (expectedVersionStr === undefined) {
      // No version provided - allow the operation (backward compatibility)
      return { valid: true };
    }

    const expectedVersion = parseInt(expectedVersionStr);
    const currentVersion = game.getStateVersion();

    if (expectedVersion !== currentVersion) {
      // Extract the events that happened since the client's version
      const allEvents = game.getEventLog().getEvents();
      const missedEvents = allEvents.slice(expectedVersion, currentVersion);

      const errorHtml = formatStaleStateErrorModal(expectedVersion, currentVersion, missedEvents, game);
      return { valid: false, errorHtml };
    }

    return { valid: true };
  }

  // Middleware: Load game from route params (:gameId)
  async function loadGameFromParams(req: express.Request, res: express.Response, next: express.NextFunction) {
    const gameId = parseInt(req.params.gameId);

    try {
      const persistedGame = await persistStatePort.retrieve(gameId);
      if (!persistedGame) {
        res.status(404).send(`<div>Game ${gameId} not found</div>`);
        return;
      }

      res.locals.game = GameState.fromPersistedGameState(persistedGame);
      res.locals.gameId = gameId;
      next();
    } catch (error) {
      console.error("Error loading game:", error);
      res.status(500).send(`<div>Error loading game ${gameId}</div>`);
    }
  }

  // Middleware: Load game from request body (game-id)
  async function loadGameFromBody(req: express.Request, res: express.Response, next: express.NextFunction) {
    const gameId = parseInt(req.body["game-id"]);

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

      res.locals.game = GameState.fromPersistedGameState(persistedGame);
      res.locals.gameId = gameId;
      next();
    } catch (error) {
      console.error("Error loading game:", error);
      res.status(500).send(
        formatErrorPageHtmlPage({
          icon: "⚠️",
          title: "Error Loading Game",
          message: `Could not load game <strong>${gameId}</strong>.`,
          details: "There may be a technical issue.",
        })
      );
    }
  }

  // Middleware: Require valid version for optimistic concurrency control
  function requireValidVersion(req: express.Request, res: express.Response, next: express.NextFunction) {
    const game = res.locals.game as GameState;
    const versionCheck = validateStateVersion(req, game);

    if (!versionCheck.valid) {
      res.status(409)
         .setHeader('HX-Retarget', '#modal-container')
         .setHeader('HX-Reswap', 'innerHTML')
         .send(versionCheck.errorHtml);
      return;
    }

    next();
  }

  // ============================================================================
  // STATIC PAGES (about the game) - Use EJS templates from views/
  // These are informational pages that describe what the app does and how to use it
  // ============================================================================

  // Returns whole page - home page
  app.get("/", (req, res) => {
    res.render("index");
  });

  // Returns whole page - documentation page
  app.get("/docs", (req, res) => {
    res.render("docs");
  });

  // Returns whole page - about page
  app.get("/about", (req, res) => {
    res.render("about");
  });

  app.use(express.static(path.join(__dirname, "..", "public")));
  app.use("/decks", express.static(path.join(__dirname, "..", "decks")));

  // ============================================================================
  // DYNAMIC PAGES (in the game) - Use TypeScript functions from src/view/
  // These pages display and manipulate game state: deck selection, deck review,
  // active gameplay, modals, and card actions. They use TypeScript template
  // literals for type safety and composition with game state.
  // ============================================================================

  // Returns whole page - deck selection page
  app.get("/choose-any-deck", async (req, res) => {
    try {
      const availableDecks = deckRetriever.listAvailableDecks();
      res.render("choose-any-deck", { availableDecks });
    } catch (error) {
      console.error("Error loading deck selection page:", error);
      res.status(500).send(`<div>
        <p>Error: Could not load the deck selection page</p>
        <p>Please try refreshing the page</p>
    </div>`);
    }
  });

  // Returns whole page - new homepage design
  app.get("/home-v2", async (req, res) => {
    try {
      const html = formatHomeV2HtmlPage();
      res.send(html);
    } catch (error) {
      console.error("Error loading home-v2:", error);
      res.status(500).send(`<div>
        <p>Error: Could not load the homepage</p>
        <p>Please try refreshing the page</p>
    </div>`);
    }
  });

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

  // Redirects to active game page
  app.post("/start-game", loadGameFromBody, requireValidVersion, async (req, res) => {
    const game = res.locals.game as GameState;
    const gameId = res.locals.gameId as number;
    const browserTabId = res.locals.browserTabId as string | undefined;

    try {
      game.startGame(browserTabId);
      await persistStatePort.save(game.toPersistedGameState());

      res.redirect(`/game/${gameId}`);
    } catch (error) {
      console.error("Error starting game:", error);
      res.status(500).send(
        formatErrorPageHtmlPage({
          icon: "🎲",
          title: "Game Start Error",
          message: `Could not start game <strong>${gameId}</strong>.`,
          details: "There may be a technical issue with the game data.",
        })
      );
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

  // Redirects to Choose Deck
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

      res.redirect("/choose-any-deck");
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

  // Returns modal fragment - individual card modal
  app.get("/card-modal/:gameId/:cardIndex", async (req, res) => {
    const gameId = parseInt(req.params.gameId);
    const cardIndex = parseInt(req.params.cardIndex);

    try {
      const persistedGame = await persistStatePort.retrieve(gameId);
      if (!persistedGame) {
        res.status(404).send(`<div>Game ${gameId} not found</div>`);
        return;
      }

      const game = GameState.fromPersistedGameState(persistedGame);

      // Validate state version for optimistic concurrency control
      const expectedVersionStr = req.query["expected-version"];
      if (expectedVersionStr) {
        const expectedVersion = parseInt(expectedVersionStr as string);
        const currentVersion = game.getStateVersion();

        if (expectedVersion !== currentVersion) {
          // Extract the events that happened since the client's version
          const allEvents = game.getEventLog().getEvents();
          const missedEvents = allEvents.slice(expectedVersion, currentVersion);

          const errorHtml = formatStaleStateErrorModal(expectedVersion, currentVersion, missedEvents, game);
          res.status(409)
             .setHeader('HX-Retarget', '#modal-container')
             .setHeader('HX-Reswap', 'innerHTML')
             .send(errorHtml);
          return;
        }
      }

      const gameCard = game.findCardByIndex(cardIndex);
      if (!gameCard) {
        res.status(404).send(`<div>Card ${cardIndex} not found</div>`);
        return;
      }

      const modalHtml = formatCardModalHtmlFragment(gameCard, gameId, game.getStateVersion());
      res.send(modalHtml);
    } catch (error) {
      console.error("Error loading card modal:", error);
      res.status(500).send(`<div>Error loading card details</div>`);
    }
  });

  // Returns empty response - closes modal
  app.get("/close-modal", (req, res) => {
    res.send("");
  });

  // Returns empty response - closes card modal
  app.get("/close-card-modal", (req, res) => {
    res.send("");
  });

  // Returns full page for loading game state
  app.get("/load-game-state", (req, res) => {
    const pageHtml = formatLoadStateHtmlPage();
    res.send(pageHtml);
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
        gameId: newGameId,
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

  app.get("/debug-section/:gameId", loadGameFromParams, async (req, res) => {
    const game = res.locals.game as GameState;
    const html = formatDebugSectionHtmlFragment(game.gameId, game.getStateVersion());
    res.send(html);
  });

  // Returns game section fragment - for HTMX updates
  app.get("/game-section/:gameId", async (req, res) => {
    const gameId = parseInt(req.params.gameId);
    try {
      const persistedGame = await persistStatePort.retrieve(gameId);
      if (!persistedGame) {
        res.status(404).send(`<div>Game ${gameId} not found</div>`);
        return;
      }
      const game = GameState.fromPersistedGameState(persistedGame);
      const html = formatActiveGameHtmlSection(game);
      res.send(html);
    } catch (error) {
      console.error("Error loading game section:", error);
      res.status(500).send(`<div>Error loading game section</div>`);
    }
  });

  // Card action endpoints
  // Returns active game fragment - updated game board
  app.post("/reveal-card/:gameId/:gameCardIndex", loadGameFromParams, requireValidVersion, async (req, res) => {
    const game = res.locals.game as GameState;
    const gameId = res.locals.gameId as number;
    const gameCardIndex = parseInt(req.params.gameCardIndex);
    const browserTabId = res.locals.browserTabId as string | undefined;

    try {
      game.revealByGameCardIndex(gameCardIndex, browserTabId);

      // Persist the updated state
      await persistStatePort.save(game.toPersistedGameState());

      const html = formatActiveGameHtmlSection(game);
      res.setHeader("HX-Trigger", "game-state-updated");
      res.send(html);
    } catch (error) {
      console.error("Error revealing card:", error);
      res.status(500).send(`<div>Error revealing card</div>`);
    }
  });

  // Returns active game fragment - updated game board
  app.post("/put-in-hand/:gameId/:gameCardIndex", loadGameFromParams, requireValidVersion, async (req, res) => {
    const game = res.locals.game as GameState;
    const gameId = res.locals.gameId as number;
    const gameCardIndex = parseInt(req.params.gameCardIndex);
    const browserTabId = res.locals.browserTabId as string | undefined;

    try {
      game.putInHandByGameCardIndex(gameCardIndex, browserTabId);

      await persistStatePort.save(game.toPersistedGameState());

      const html = formatActiveGameHtmlSection(game);
      res.setHeader("HX-Trigger", "game-state-updated");
      res.send(html);
    } catch (error) {
      console.error("Error putting card in hand:", error);
      res.status(500).send(`<div>Error putting card in hand</div>`);
    }
  });

  // Returns active game fragment - updated game board
  app.post("/put-down/:gameId/:gameCardIndex", loadGameFromParams, requireValidVersion, async (req, res) => {
    const game = res.locals.game as GameState;
    const gameId = res.locals.gameId as number;
    const gameCardIndex = parseInt(req.params.gameCardIndex);
    const browserTabId = res.locals.browserTabId as string | undefined;

    try {
      game.revealByGameCardIndex(gameCardIndex, browserTabId);

      // Persist the updated state
      await persistStatePort.save(game.toPersistedGameState());

      trace.getActiveSpan()?.setAttributes({
        "game.cardsInHand": game.listHand().length,
        "game.cardsRevealed": game.listRevealed().length,
      });

      const html = formatActiveGameHtmlSection(game);
      res.setHeader("HX-Trigger", "game-state-updated");
      res.send(html);
    } catch (error) {
      console.error("Error putting card down:", error);
      res.status(500).send(`<div>Error putting card down</div>`);
    }
  });

  // Returns active game fragment - updated game board
  app.post("/put-on-top/:gameId/:gameCardIndex", loadGameFromParams, requireValidVersion, async (req, res) => {
    const game = res.locals.game as GameState;
    const gameId = res.locals.gameId as number;
    const gameCardIndex = parseInt(req.params.gameCardIndex);
    const browserTabId = res.locals.browserTabId as string | undefined;

    try {
      game.putOnTopByGameCardIndex(gameCardIndex, browserTabId);

      await persistStatePort.save(game.toPersistedGameState());

      const html = formatActiveGameHtmlSection(game);
      res.setHeader("HX-Trigger", "game-state-updated");
      res.send(html);
    } catch (error) {
      console.error("Error putting card on top:", error);
      res.status(500).send(`<div>Error putting card on top</div>`);
    }
  });

  // Returns active game fragment - updated game board
  app.post("/put-on-bottom/:gameId/:gameCardIndex", loadGameFromParams, requireValidVersion, async (req, res) => {
    const game = res.locals.game as GameState;
    const gameId = res.locals.gameId as number;
    const gameCardIndex = parseInt(req.params.gameCardIndex);
    const browserTabId = res.locals.browserTabId as string | undefined;

    try {
      game.putOnBottomByGameCardIndex(gameCardIndex, browserTabId);

      await persistStatePort.save(game.toPersistedGameState());

      const html = formatActiveGameHtmlSection(game);
      res.setHeader("HX-Trigger", "game-state-updated");
      res.send(html);
    } catch (error) {
      console.error("Error putting card on bottom:", error);
      res.status(500).send(`<div>Error putting card on bottom</div>`);
    }
  });

  // Returns active game fragment - updated game board
  app.post("/draw/:gameId", loadGameFromParams, requireValidVersion, async (req, res) => {
    const game = res.locals.game as GameState;
    const gameId = res.locals.gameId as number;
    const browserTabId = res.locals.browserTabId as string | undefined;

    if (game.gameStatus() !== "Active") {
      res.status(400).send(`<div>Cannot draw: Game is not active</div>`);
      return;
    }

    try {
      game.draw(browserTabId);
      const persistedGameState = game.toPersistedGameState();
      trace.getActiveSpan()?.setAttributes({
        "game.gameStatus()": game.gameStatus(),
        "game.cardsInLibrary": game.listLibrary().length,
        "game.cardsInHand": game.listHand().length,
        "game.full_json": JSON.stringify(persistedGameState),
      });
      await persistStatePort.save(persistedGameState);

      const html = formatActiveGameHtmlSection(game);
      res.setHeader("HX-Trigger", "game-state-updated");
      res.send(html);
    } catch (error) {
      if (error instanceof Error && error.message === "Cannot draw: Library is empty") {
        const lossModal = formatLossModalHtmlFragment();
        res.setHeader("HX-Retarget", "#modal-container");
        res.setHeader("HX-Reswap", "innerHTML");
        res.send(lossModal);
      } else {
        console.error("Error drawing card:", error);
        res.status(500).send(`<div>Error: ${error instanceof Error ? error.message : "Could not draw card"}</div>`);
      }
    }
  });

  // Returns active game fragment - updated game board
  app.post("/play-card/:gameId/:gameCardIndex", async (req, res) => {
    const gameId = parseInt(req.params.gameId);
    const gameCardIndex = parseInt(req.params.gameCardIndex);
    const browserTabId = res.locals.browserTabId as string | undefined;

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

      // Validate state version for optimistic concurrency control
      const versionCheck = validateStateVersion(req, game);
      if (!versionCheck.valid) {
        res.status(409)
           .setHeader('HX-Retarget', '#modal-container')
           .setHeader('HX-Reswap', 'innerHTML')
           .send(versionCheck.errorHtml);
        return;
      }

      const whatHappened = game.playCard(gameCardIndex, browserTabId);
      const persistedGameState = game.toPersistedGameState();
      trace.getActiveSpan()?.setAttributes({
        "game.gameStatus()": game.gameStatus(),
        "game.cardsInLibrary": game.listLibrary().length,
        "game.cardsInHand": game.listHand().length,
        "game.full_json": JSON.stringify(persistedGameState),
      });

      await persistStatePort.save(persistedGameState);

      const html = formatActiveGameHtmlSection(game, whatHappened);
      res.setHeader("HX-Trigger", "game-state-updated");
      res.send(html);
    } catch (error) {
      console.error("Error playing card:", error);
      res.status(500).send(`<div>Error: ${error instanceof Error ? error.message : "Could not play card"}</div>`);
    }
  });

  // Returns active game fragment - updated game board
  app.post("/shuffle/:gameId", loadGameFromParams, requireValidVersion, async (req, res) => {
    const game = res.locals.game as GameState;
    const gameId = res.locals.gameId as number;
    const browserTabId = res.locals.browserTabId as string | undefined;

    try {
      const whatHappened = game.shuffle(browserTabId);
      await persistStatePort.save(game.toPersistedGameState());

      const html = formatActiveGameHtmlSection(game, whatHappened);
      res.setHeader("HX-Trigger", "game-state-updated");
      res.send(html);
    } catch (error) {
      console.error("Error shuffling library:", error);
      res.status(500).send(`<div>Error: ${error instanceof Error ? error.message : "Could not shuffle library"}</div>`);
    }
  });

  app.post("/move-hand-card/:gameId/:from/:to", loadGameFromParams, requireValidVersion, async (req, res) => {
    const game = res.locals.game as GameState;
    const gameId = res.locals.gameId as number;
    const from = parseInt(req.params.from);
    const to = parseInt(req.params.to);
    const browserTabId = res.locals.browserTabId as string | undefined;

    if (game.gameStatus() !== "Active") {
      res.status(400).send(`<div>Cannot move card: Game is not active</div>`);
      return;
    }

    try {
      const whatHappened = game.moveHandCard(from, to, browserTabId);
      await persistStatePort.save(game.toPersistedGameState());

      const html = formatActiveGameHtmlSection(game, whatHappened);
      res.setHeader("HX-Trigger", "game-state-updated");
      res.send(html);
    } catch (error) {
      console.error("Error moving hand card:", error);
      res.status(500).send(`<div>Error: ${error instanceof Error ? error.message : "Could not move hand card"}</div>`);
    }
  });

  app.post("/undo/:gameId/:gameEventIndex", loadGameFromParams, requireValidVersion, async (req, res) => {
    const game = res.locals.game as GameState;
    const gameId = res.locals.gameId as number;
    const gameEventIndex = parseInt(req.params.gameEventIndex);
    const browserTabId = res.locals.browserTabId as string | undefined;

    try {
      const updatedGame = game.undo(gameEventIndex, browserTabId);
      await persistStatePort.save(updatedGame.toPersistedGameState());

      const html = formatActiveGameHtmlSection(updatedGame);
      res.setHeader("HX-Trigger", "game-state-updated");
      res.send(html);
    } catch (error) {
      console.error("Error undoing event:", error);
      res.status(500).send(`<div>Error: ${error instanceof Error ? error.message : "Could not undo event"}</div>`);
    }
  });

  // Flip a commander card - Returns only the commander container
  app.post("/flip-card/:gameId/:gameCardIndex", loadGameFromParams, requireValidVersion, async (req, res) => {
    const game = res.locals.game as GameState;
    const gameId = res.locals.gameId as number;
    const gameCardIndex = parseInt(req.params.gameCardIndex);
    const browserTabId = res.locals.browserTabId as string | undefined;

    try {
      game.flipCard(gameCardIndex, browserTabId); // TODO: I don't need whatHappened, it's in the card state

      await persistStatePort.save(game.toPersistedGameState());

      // Get the flipped card
      const flippedCard = game.getCards().find((gc) => gc.gameCardIndex === gameCardIndex);
      console.log("current face: ", flippedCard?.currentFace);
      if (!flippedCard) {
        res.status(404).send(`<div>Card ${gameCardIndex} not found</div>`);
        return;
      }

      // Return the commander container
      const html = formatFlippingContainer(flippedCard, gameId);
      res.setHeader("HX-Trigger", "game-state-updated");
      res.send(html);
    } catch (error) {
      console.error("Error flipping card:", error);
      res.status(500).send(`<div>Error: ${error instanceof Error ? error.message : "Could not flip card"}</div>`);
    }
  });

  // Flip a card and return updated modal HTML
  app.post("/flip-card-modal/:gameId/:gameCardIndex", loadGameFromParams, requireValidVersion, async (req, res) => {
    const game = res.locals.game as GameState;
    const gameId = res.locals.gameId as number;
    const gameCardIndex = parseInt(req.params.gameCardIndex);
    const browserTabId = res.locals.browserTabId as string | undefined;

    try {
      game.flipCard(gameCardIndex, browserTabId);

      await persistStatePort.save(game.toPersistedGameState());

      // Get the flipped card
      const flippedCard = game.getCards().find((gc) => gc.gameCardIndex === gameCardIndex);
      if (!flippedCard) {
        res.status(404).send(`<div>Card ${gameCardIndex} not found</div>`);
        return;
      }

      // Trigger game-state-updated event to refresh the game container
      res.setHeader("HX-Trigger", "game-state-updated");

      // Return the updated modal HTML
      const modalHtml = formatCardModalHtmlFragment(flippedCard, gameId, game.getStateVersion());
      res.send(modalHtml);
    } catch (error) {
      console.error("Error flipping card in modal:", error);
      res.status(500).send(`<div>Error: ${error instanceof Error ? error.message : "Could not flip card"}</div>`);
    }
  });

  // Proxy endpoint for card images to avoid CORS issues
  app.get("/proxy-image", async (req, res) => {
    const cardId = req.query.cardId as string;
    const face = req.query.face as string;

    if (!cardId || typeof cardId !== "string" || cardId.length !== 36) {
      return res.status(400).send("Invalid card ID");
    }

    // Validate face parameter
    const cardFace: "front" | "back" = face === "front" || face === "back" ? face : "front";

    try {
      // Import getCardImageUrl function
      const imageUrl = getCardImageUrl(cardId, "png", cardFace);

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
