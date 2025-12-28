import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { formatErrorPageHtmlPage } from "./view/error-view.js";
import { createPrepViewHelpers } from "./view/common/prep-view-helpers.js";
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
import { PersistPrepPort, PersistedGamePrep } from "./port-persist-prep/types.js";
import { trace } from "@opentelemetry/api";
import { getCardImageUrl } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(deckRetriever: RetrieveDeckPort, persistStatePort: PersistStatePort, persistPrepPort: PersistPrepPort): express.Application {
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

  // Returns HTML fragment - precon deck selection tab
  app.get("/deck-selection-tabs/precon", async (req, res) => {
    try {
      const availableDecks = deckRetriever.listAvailableDecks();
      res.render("partials/deck-selection-precon", { availableDecks });
    } catch (error) {
      console.error("Error loading precon deck tab:", error);
      res.status(500).send(`<div>Error: Could not load precon deck selection</div>`);
    }
  });

  // Returns HTML fragment - Archidekt deck selection tab
  app.get("/deck-selection-tabs/archidekt", async (req, res) => {
    try {
      const availableDecks = deckRetriever.listAvailableDecks();
      res.render("partials/deck-selection-archidekt", { availableDecks });
    } catch (error) {
      console.error("Error loading Archidekt tab:", error);
      res.status(500).send(`<div>Error: Could not load Archidekt deck selection</div>`);
    }
  });

  // Redirects to game page on success, returns whole error page on failure
  app.post("/deck", async (req, res) => {
    const deckNumberInput: string = req.body["deck-number"];
    const deckSource: string = req.body["deck-source"];
    const preconFile: string = req.body["precon-deck"];

    // Parse deck ID from URL if it's an Archidekt URL, otherwise use as-is
    let deckNumber = deckNumberInput;
    if (deckSource === "archidekt" && deckNumberInput) {
      const urlMatch = deckNumberInput.match(/\/decks\/(\d+)/);
      if (urlMatch) {
        deckNumber = urlMatch[1];
      }
    }

    setCommonSpanAttributes({ archidektDeckId: deckNumber, deckSource });
    const deckRequest: DeckRetrievalRequest =
      deckSource === "archidekt" ? { deckSource: "archidekt", archidektDeckId: deckNumber } : { deckSource: "precon", localFile: preconFile };

    try {
      const deck = await deckRetriever.retrieveDeck(deckRequest);
      const prepId = persistPrepPort.newPrepId();
      const prep: PersistedGamePrep = {
        version: 1,
        prepId,
        deck,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await persistPrepPort.savePrep(prep);

      res.redirect(`/prepare/${prepId}`);
    } catch (error) {
      console.error("Error fetching deck:", error);
      res.status(500).send(
        formatErrorPageHtmlPage({
          icon: "🚫",
          title: "Deck Load Error",
          message: `Could not fetch deck <strong>${deckNumber || preconFile}</strong> from <strong>${deckSource}</strong>.`,
          details: "The deck may not exist, be private, or there may be a network issue.",
        })
      );
    }
  });

  // GET /prepare/:prepId - Show deck review page
  app.get("/prepare/:prepId", async (req, res) => {
    const prepId = parseInt(req.params.prepId, 10);

    try {
      const prep = await persistPrepPort.retrievePrep(prepId);
      if (!prep) {
        res.status(404).send(
          formatErrorPageHtmlPage({
            icon: "🎯",
            title: "Prep Not Found",
            message: `Game preparation <strong>${prepId}</strong> could not be found.`,
            details: "It may have been deleted or the link may be incorrect.",
          })
        );
        return;
      }

      // Create view helpers for EJS template
      const helpers = createPrepViewHelpers(prep);

      // Render EJS template
      res.render("prepare", {
        prep,
        ...helpers
      });
    } catch (error) {
      console.error("Error loading prep:", error);
      res.status(500).send(
        formatErrorPageHtmlPage({
          icon: "🚫",
          title: "Error Loading Preparation",
          message: `Could not load game preparation <strong>${prepId}</strong>.`,
          details: "There may be a database error.",
        })
      );
    }
  });

  // Redirects to active game page - creates game from prep
  app.post("/start-game", async (req, res) => {
    const prepId = parseInt(req.body["prep-id"], 10);
    const browserTabId = res.locals.browserTabId as string | undefined;

    try {
      // Load prep
      const prep = await persistPrepPort.retrievePrep(prepId);
      if (!prep) {
        res.status(404).send(
          formatErrorPageHtmlPage({
            icon: "🎯",
            title: "Prep Not Found",
            message: `Game preparation <strong>${prepId}</strong> could not be found.`,
            details: "It may have been deleted or the link may be incorrect.",
          })
        );
        return;
      }

      // Validate prep version for optimistic concurrency control
      const expectedVersionStr = req.body["expected-version"];
      if (expectedVersionStr !== undefined) {
        const expectedVersion = parseInt(expectedVersionStr, 10);
        if (expectedVersion !== prep.version) {
          res.status(409).send(
            formatErrorPageHtmlPage({
              icon: "⚠️",
              title: "Prep Version Mismatch",
              message: `The preparation has been modified. Expected version ${expectedVersion}, but current version is ${prep.version}.`,
              details: "Please reload the page and try again.",
            })
          );
          return;
        }
      }

      // Create new game from prep
      const gameId = persistStatePort.newGameId();
      const game = GameState.newGame(gameId, prep.prepId, prep.version, prep.deck);
      game.startGame(browserTabId);
      await persistStatePort.save(game.toPersistedGameState());

      res.redirect(`/game/${gameId}`);
    } catch (error) {
      console.error("Error starting game:", error);
      res.status(500).send(
        formatErrorPageHtmlPage({
          icon: "🎲",
          title: "Game Start Error",
          message: `Could not start game from preparation <strong>${prepId}</strong>.`,
          details: "There may be a technical issue with the game data.",
        })
      );
    }
  });

  // Returns active game page only
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

      // Only show active games; prep/review happens at /prepare/:prepId
      if (game.gameStatus() !== "Active") {
        res.status(400).send(
          formatErrorPageHtmlPage({
            icon: "⚠️",
            title: "Game Not Active",
            message: `Game <strong>${gameId}</strong> is not in an active state.`,
            details: "This game may have ended or not been started properly.",
          })
        );
        return;
      }

      const html = formatGamePageHtmlPage(game);
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

  // Redirects to new game page - creates new game from prep
  app.post("/restart-game", async (req, res) => {
    const gameId: number = parseInt(req.body["game-id"]);
    const browserTabId = res.locals.browserTabId as string | undefined;

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

      // Load the prep that was used to create this game
      const prep = await persistPrepPort.retrievePrep(persistedGame.prepId);
      if (!prep) {
        res.status(404).send(
          formatErrorPageHtmlPage({
            icon: "🎯",
            title: "Prep Not Found",
            message: `The game preparation (ID: ${persistedGame.prepId}) for this game could not be found.`,
            details: "The preparation may have been deleted.",
          })
        );
        return;
      }

      // Create new game from the same prep
      const newGameId = persistStatePort.newGameId();
      const newGame = GameState.newGame(newGameId, prep.prepId, prep.version, prep.deck);
      newGame.startGame(browserTabId);
      await persistStatePort.save(newGame.toPersistedGameState());

      res.redirect(`/game/${newGameId}`);
    } catch (error) {
      console.error("Error restarting game:", error);
      res.status(500).send(
        formatErrorPageHtmlPage({
          icon: "🔄",
          title: "Game Restart Error",
          message: `Could not restart game <strong>${gameId}</strong>.`,
          details: "There may be an issue with the game or prep data.",
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

      // Calculate navigation indices
      const prevCardIndex = game.findPrevCardInZone(cardIndex);
      const nextCardIndex = game.findNextCardInZone(cardIndex);

      // Calculate position information for display
      let currentPosition = 1;
      let totalCardsInZone = 1;
      const location = gameCard.location;

      if (location.type !== "Table") {
        let cardsInZone: readonly GameCard[];
        if (location.type === "Library") {
          cardsInZone = game.listLibrary();
        } else if (location.type === "Hand") {
          cardsInZone = game.listHand();
        } else if (location.type === "Revealed") {
          cardsInZone = game.listRevealed();
        } else if (location.type === "CommandZone") {
          cardsInZone = game.listCommandZone();
        } else {
          cardsInZone = [];
        }

        totalCardsInZone = cardsInZone.length;
        currentPosition = cardsInZone.findIndex(gc => gc.gameCardIndex === cardIndex) + 1;
      }

      const modalHtml = formatCardModalHtmlFragment(
        gameCard,
        gameId,
        game.getStateVersion(),
        prevCardIndex,
        nextCardIndex,
        currentPosition,
        totalCardsInZone
      );
      res.send(modalHtml);
    } catch (error) {
      console.error("Error loading card modal:", error);
      res.status(500).send(`<div>Error loading card details</div>`);
    }
  });

  // Returns modal fragment - card modal for prep page (before game starts)
  app.get("/prep-card-modal/:prepId/:cardIndex", async (req, res) => {
    const prepId = parseInt(req.params.prepId);
    const cardIndex = parseInt(req.params.cardIndex);

    try {
      const prep = await persistPrepPort.retrievePrep(prepId);
      if (!prep) {
        res.status(404).send(`<div>Prep ${prepId} not found</div>`);
        return;
      }

      // Find the card by index (commanders first, then library cards)
      const allCards = [...prep.deck.commanders, ...prep.deck.cards];
      const cardDef = allCards[cardIndex];
      if (!cardDef) {
        res.status(404).send(`<div>Card ${cardIndex} not found</div>`);
        return;
      }

      // Create a GameCard-like object for rendering
      const isCommander = cardIndex < prep.deck.commanders.length;
      const gameCard = {
        card: cardDef,
        isCommander,
        location: isCommander ? { type: "CommandZone" as const, position: cardIndex } : { type: "Library" as const, position: cardIndex - prep.deck.commanders.length },
        gameCardIndex: cardIndex,
        currentFace: "front" as const,
      };

      const imageUrl = getCardImageUrl(cardDef.scryfallId, "large", "front");
      const gathererUrl =
        cardDef.multiverseid === 0
          ? `https://gatherer.wizards.com/Pages/Search/Default.aspx?name=${encodeURIComponent(`"${cardDef.oracleCardName || cardDef.name}"`)}`
          : `https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=${cardDef.multiverseid}`;

      // Simple modal for prep page - just view card and link to Gatherer
      const utilityButtons = `<div class="card-modal-utility-buttons">
        <a href="${gathererUrl}" target="_blank" class="modal-action-button gatherer-button">See on Gatherer</a>
        <button class="modal-action-button copy-button"
                onclick="copyCardImageToClipboard(event, '${imageUrl}', '${cardDef.name}')">Copy</button>
      </div>`;

      const actionButtons = `<div class="card-modal-actions">
        ${utilityButtons}
      </div>`;

      const bodyContent = `<div class="card-modal-content">
        <div class="card-modal-image">
          <img src="${imageUrl}" alt="${cardDef.name}" class="modal-card-image" />
        </div>
        <div class="card-modal-info">
          <h3 class="card-modal-title">${cardDef.name}</h3>
          ${actionButtons}
        </div>
      </div>`;

      const modalHtml = `<div class="card-modal-overlay"
                   hx-get="/close-card-modal"
                   hx-target="#card-modal-container"
                   hx-swap="innerHTML"
                   hx-trigger="click[target==this], keyup[key=='Escape'] from:body"
                   tabindex="0">
        <div class="card-modal-dialog">
          <button class="card-modal-close"
                  hx-get="/close-card-modal"
                  hx-target="#card-modal-container"
                  hx-swap="innerHTML">&times;</button>
          <div class="card-modal-body">
            ${bodyContent}
          </div>
        </div>
      </div>`;

      res.send(modalHtml);
    } catch (error) {
      console.error("Error loading prep card modal:", error);
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
