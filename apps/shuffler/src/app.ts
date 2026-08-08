import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { formatErrorPageHtmlPage } from "./view/error-view.js";
import { createPrepViewHelpers } from "./view/common/prep-view-helpers.js";
import { formatLossModalHtmlFragment, formatStaleStateErrorModal, formatTableModalHtmlFragment, getModalCardActionsByLocation } from "./view/play-game/game-modals.js";
import { formatFlippingContainer } from "./view/common/shared-components.js";
import { formatHistoryModalHtmlFragment } from "./view/play-game/history-components.js";
import { formatDebugStateModalHtmlFragment } from "./view/debug/state-copy.js";
import { formatLoadStateHtmlPage } from "./view/debug/load-state.js";
import { formatActiveGameHtmlSection, formatGamePageHtmlPage } from "./view/play-game/active-game-page.js";
import { GameState, GameCard, TableInfo } from "./GameState.js";
import { randomUUID } from "node:crypto";
import { TabletopPort } from "./port-tabletop/types.js";
import { sendCardToTableFirst, sendSeatJoinedBestEffort, zoneHintForPlay } from "./port-tabletop/sendToTable.js";
import { formatTabletopSendErrorModal } from "./view/play-game/game-modals.js";
import { markCurrentSpanAsError, setCommonSpanAttributes, stampRouteParamsOnSpan } from "./tracing_util.js";
import { log } from "./log.js";
import { DeckRetrievalRequest, RetrieveDeckPort } from "./port-deck-retrieval/types.js";
import { PersistStatePort, PERSISTED_GAME_STATE_VERSION, PersistedGameState, IncompatibleStateVersionError } from "./port-persist-state/types.js";
import { PersistPrepPort, PersistedGamePrep, PERSISTED_GAME_PREP_VERSION, IncompatiblePrepVersionError } from "./port-persist-prep/types.js";
import { CardRepositoryPort } from "./port-card-repository/types.js";
import { trace } from "@opentelemetry/api";
import { getCardImageUrl, constructCardImageUrl } from "./types.js";
import { fetchScryfall } from "./scryfall-http.js";
import { resolveNavListNavigation, navListQueryParam } from "./navList.js";
import { applyGameCommand, CommandOutcome } from "./apply-game-command.js";
import { WhatHappened } from "./GameState.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(
  deckRetriever: RetrieveDeckPort,
  persistStatePort: PersistStatePort,
  persistPrepPort: PersistPrepPort,
  cardRepository: CardRepositoryPort,
  tabletopPort?: TabletopPort
): express.Application {
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

  // Stamp each matched route param onto the root server span as its own
  // attribute (http.route.param.gameId, etc.). The route template itself
  // (http.route, e.g. /game/:gameId) is set automatically by the Express
  // auto-instrumentation; this adds the high-cardinality param values alongside
  // it, on the same span, so you can break down by route and drill into a
  // specific id.
  //
  // Two timing subtleties:
  //  - req.params is only populated once routing matches, so we defer the writes
  //    to res.end (when params are known) rather than running them here.
  //  - We capture the span HERE (not in res.end): Express instrumentation emits
  //    no middleware spans (see tracing.ts), so the active span at this point is
  //    the root server span — the one carrying http.route — and it stays open
  //    through res.end. (At res.end the active span would instead be the
  //    request-handler child span.)
  app.use(function stampRouteParams(req, res, next) {
    const span = trace.getActiveSpan();
    const originalEnd = res.end.bind(res);
    res.end = function (...args: Parameters<typeof originalEnd>) {
      stampRouteParamsOnSpan(span, req.params);
      return originalEnd(...args);
    } as typeof res.end;
    next();
  });

  // Developer mode: an undocumented per-browser toggle. Entered via the secret
  // /dontdie URL (sets the cookie below); exited via the menu link to
  // /dontdie/off. When set, full pages render <body class="dev-mode"> and CSS
  // reveals otherwise-hidden debug affordances. No new dependency: we read the
  // cookie straight off the header rather than pulling in cookie-parser.
  const DEV_MODE_COOKIE = "devMode";
  app.use((req, res, next) => {
    const cookieHeader = req.headers.cookie ?? "";
    res.locals.devMode = cookieHeader
      .split(";")
      .some((c) => c.trim() === `${DEV_MODE_COOKIE}=1`);
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
    const gameIdParam = req.params.gameId;
    const gameId = Number(gameIdParam);
    const span = trace.getActiveSpan();

    if (!gameIdParam || !Number.isInteger(gameId)) {
      const errorMessage = "Missing or invalid game ID";
      markCurrentSpanAsError(errorMessage, {
        "error.message": errorMessage,
        "game.load.failure": "invalid_game_id",
        "game.game_id.param": gameIdParam ?? "",
        "game.game_id.valid": false,
        "game.game_id.missing": !gameIdParam,
        "game.game_id.integer": Number.isInteger(gameId),
      });
      res.status(400).send(`<div>${errorMessage}</div>`);
      return;
    }

    span?.setAttributes({
      "game.game_id": gameId,
      "game.game_id.param": gameIdParam,
      "game.game_id.valid": true,
    });

    try {
      const persistedGame = await persistStatePort.retrieve(gameId);
      if (!persistedGame) {
        const errorMessage = `Game ${gameId} not found`;
        markCurrentSpanAsError(errorMessage, {
          "error.message": errorMessage,
          "game.load.failure": "not_found",
          "game.game_id": gameId,
          "game.game_id.param": gameIdParam,
          "game.game_id.valid": true,
          "game.found": false,
        });
        res.status(404).send(`<div>${errorMessage}</div>`);
        return;
      }

      res.locals.game = await GameState.fromPersistedGameState(persistedGame, cardRepository);
      res.locals.gameId = gameId;
      next();
    } catch (error) {
      if (error instanceof IncompatibleStateVersionError) {
        markCurrentSpanAsError(error.message, {
          "error.message": error.message,
          "game.load.failure": "incompatible_state_version",
          "game.game_id": gameId,
          "game.game_id.param": gameIdParam,
          "game.game_id.valid": true,
          "game.state.version.compatible": false,
          "game.state.version.found": String(error.foundVersion),
          "game.state.version.expected": error.expectedVersion,
        });
        console.warn(`Game ${gameId} has incompatible version:`, error.message);
        res.status(410).send(
          formatErrorPageHtmlPage({
            icon: "🕰️",
            title: "Game Too Old to Load",
            message: `Game <strong>${gameId}</strong> was saved in an older, incompatible format.`,
            details: error.message,
          })
        );
        return;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      markCurrentSpanAsError(errorMessage, {
        "error.message": errorMessage,
        "game.load.failure": "unexpected_error",
        "game.game_id": gameId,
        "game.game_id.param": gameIdParam,
        "game.game_id.valid": true,
        "error.type": error instanceof Error ? error.name : typeof error,
      });
      console.error("Error loading game:", error);
      res.status(500).send(`<div>Error loading game ${gameId}</div>`);
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

  // Parses and validates the :gameId route param, 400ing (and stamping the
  // span) on failure. Shared by every route built on applyGameCommand, since
  // that function takes an already-valid numeric gameId.
  function parseGameIdParam(req: express.Request, res: express.Response): number | null {
    const gameIdParam = req.params.gameId;
    const gameId = Number(gameIdParam);

    if (!gameIdParam || !Number.isInteger(gameId)) {
      const errorMessage = "Missing or invalid game ID";
      markCurrentSpanAsError(errorMessage, {
        "error.message": errorMessage,
        "game.load.failure": "invalid_game_id",
        "game.game_id.param": gameIdParam ?? "",
        "game.game_id.valid": false,
        "game.game_id.missing": !gameIdParam,
        "game.game_id.integer": Number.isInteger(gameId),
      });
      res.status(400).send(`<div>${errorMessage}</div>`);
      return null;
    }

    trace.getActiveSpan()?.setAttributes({
      "game.game_id": gameId,
      "game.game_id.param": gameIdParam,
      "game.game_id.valid": true,
    });

    return gameId;
  }

  // Extracts the optimistic-concurrency version the client last saw, if any.
  // Absent means "skip the check" (backward compatibility), same as before.
  function expectedVersionFromRequest(req: express.Request): number | undefined {
    const expectedVersionStr = req.body["expected-version"];
    return expectedVersionStr === undefined ? undefined : parseInt(expectedVersionStr);
  }

  // Renders a CommandOutcome from applyGameCommand. Shared by every route
  // built on that protocol; each route supplies its own "not active" message
  // and its own success rendering (some send the whole game section, some a
  // narrower fragment; some pass whatHappened through for animation, some don't).
  function renderCommandOutcome(
    res: express.Response,
    gameId: number,
    outcome: CommandOutcome,
    notActiveMessage: string,
    renderApplied: (game: GameState, whatHappened: WhatHappened | undefined) => string
  ): void {
    switch (outcome.kind) {
      case "not-found":
        res.status(404).send(`<div>Game ${gameId} not found</div>`);
        return;
      case "incompatible-version":
        res.status(410).send(
          formatErrorPageHtmlPage({
            icon: "🕰️",
            title: "Game Too Old to Load",
            message: `Game <strong>${gameId}</strong> was saved in an older, incompatible format.`,
            details: outcome.error.message,
          })
        );
        return;
      case "version-conflict": {
        const errorHtml = formatStaleStateErrorModal(outcome.expectedVersion, outcome.currentVersion, outcome.missedEvents, outcome.game);
        res.status(409).setHeader("HX-Retarget", "#modal-container").setHeader("HX-Reswap", "innerHTML").send(errorHtml);
        return;
      }
      case "not-active":
        res.status(400).send(`<div>${notActiveMessage}</div>`);
        return;
      case "applied":
        res.setHeader("HX-Trigger", "game-state-updated");
        res.send(renderApplied(outcome.game, outcome.whatHappened));
        return;
    }
  }

  // ============================================================================
  // STATIC PAGES (about the game) - Use EJS templates from views/
  // These are informational pages that describe what the app does and how to use it
  // ============================================================================

  // Liveness/readiness target for the ALB and for kubelet. Deliberately the
  // cheapest route in the app — no template render, no persistence read — so
  // the probes don't do real work every few seconds. The sampler (see
  // telemetry-sampler.ts) keys on this path to keep 1% of the probe traces:
  // enough to confirm in Honeycomb that we're up, without drowning the dataset.
  app.get("/health", (req, res) => {
    res.type("text/plain").send("ok");
  });

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

  // Returns whole page - the design system gallery. Every specimen is rendered by
  // the app's own stylesheets, so the gallery can't drift from the app. Unlisted
  // in the nav on purpose: it's a working tool for design decisions, not a
  // destination for players. See owners/shuffler-looks-like-itself/.
  app.get("/design", (req, res) => {
    res.render("design");
  });

  // Returns whole page - game history page
  app.get("/history", async (req, res) => {
    try {
      const allGames = await persistStatePort.getAllGames();
      // Filter out games with few actions (likely abandoned/accidental)
      const gamesWithActions = allGames.filter(game => game.actionCount >= 10);
      res.render("history", { games: gamesWithActions });
    } catch (error) {
      console.error("Error loading game history:", error);
      res.status(500).send(
        formatErrorPageHtmlPage({
          icon: "📜",
          title: "Error Loading History",
          message: "Could not load game history.",
          details: String(error),
        })
      );
    }
  });

  app.use(express.static(path.join(__dirname, "..", "public")));
  app.use("/decks", express.static(path.join(__dirname, "..", "decks")));

  // The fleet's shared palette (@fleet/design-tokens) is served at /fleet so both
  // ships load the same bytes — see packages/design-tokens/tokens.css for why it's
  // shared rather than duplicated. The Tabletop imports it through Vite instead.
  //
  // Resolved through node_modules rather than by walking up from __dirname,
  // because the depth differs between the two layouts: dev runs from
  // apps/shuffler/dist, the container from /app/dist with the workspace flattened.
  // The workspace symlink is the one thing shaped the same in both — which is why
  // the Dockerfile must copy packages/ into the RUNTIME stage too. If it doesn't,
  // the symlink dangles, this 404s, and every page loses its colours in prod only.
  // verify-container-boot.sh is what catches that.
  app.use("/fleet", express.static(path.dirname(fileURLToPath(import.meta.resolve("@fleet/design-tokens/tokens.css")))));

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

      // Upsert all cards from the deck into the card repository
      const allCards = [...deck.cards, ...deck.commanders];
      await cardRepository.saveCards(allCards);

      // Sort cards alphabetically for the prep review screen
      const sortedDeck = {
        ...deck,
        cards: [...deck.cards].sort((a, b) => a.name.localeCompare(b.name)),
      };
      const prepId = persistPrepPort.newPrepId();
      const prep: PersistedGamePrep = {
        version: PERSISTED_GAME_PREP_VERSION,
        prepId,
        deck: sortedDeck,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await persistPrepPort.savePrep(prep);

      res.redirect(`/prepare/${prepId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      markCurrentSpanAsError(errorMessage, {
        "error.message": errorMessage,
        "error.type": error instanceof Error ? error.name : typeof error,
        "deck.retrieval.failure": true,
        "deck.source": deckSource,
        "deck.archidektId": deckNumber ?? "",
        "deck.precon_file": preconFile ?? "",
      });
      // The span now says what failed and for which deck; the log carries the
      // stack, which the span has no room for.
      log.error("deck retrieval failed", { "deck.source": deckSource }, error);
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

      if (prep.version !== PERSISTED_GAME_PREP_VERSION) {
        throw new IncompatiblePrepVersionError(prep.version, PERSISTED_GAME_PREP_VERSION);
      }

      // Create view helpers for EJS template
      const helpers = createPrepViewHelpers(prep);

      // Render EJS template
      res.render("prepare", {
        prep,
        ...helpers
      });
    } catch (error) {
      if (error instanceof IncompatiblePrepVersionError) {
        console.warn(`Prep ${prepId} has incompatible version:`, error.message);
        res.status(410).send(
          formatErrorPageHtmlPage({
            icon: "🕰️",
            title: "Preparation Too Old to Load",
            message: `Game preparation <strong>${prepId}</strong> was saved in an older, incompatible format.`,
            details: error.message,
          })
        );
        return;
      }
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

      // Reject preps saved in an incompatible format before doing anything with them
      if (prep.version !== PERSISTED_GAME_PREP_VERSION) {
        console.warn(`Prep ${prepId} has incompatible version:`, prep.version);
        res.status(410).send(
          formatErrorPageHtmlPage({
            icon: "🕰️",
            title: "Preparation Too Old to Load",
            message: `Game preparation <strong>${prepId}</strong> was saved in an older, incompatible format.`,
            details: "Please start a new preparation.",
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

      // Table mode (JES-127): optional table + player name from the prep form.
      // Player name is load-bearing at a table (it labels the battlefield row) —
      // default to "player" rather than block. The seat's short-GUID seatId is
      // minted here at join time (prep keeps it for rejoining).
      const tableNameInput = typeof req.body["table-name"] === "string" ? req.body["table-name"].trim() : "";
      const playerNameInput = typeof req.body["player-name"] === "string" ? req.body["player-name"].trim() : "";
      let tableInfo: TableInfo | undefined;
      if (tableNameInput) {
        tableInfo = {
          tableName: tableNameInput,
          playerName: playerNameInput || "player",
          seatId: prep.seatId ?? randomUUID().slice(0, 8),
        };
        // The Prep records all table info — that's what enables rejoining later.
        prep.tableName = tableInfo.tableName;
        prep.playerName = tableInfo.playerName;
        prep.seatId = tableInfo.seatId;
        prep.updatedAt = new Date();
        await persistPrepPort.savePrep(prep);
      }

      // Create new game from prep
      const gameId = persistStatePort.newGameId();
      const game = GameState.newGame(gameId, prep.prepId, prep.version, prep.deck, undefined, tableInfo);
      game.startGame(browserTabId);
      await persistStatePort.save(game.toPersistedGameState());

      // JES-140: announce the seat joining its table so the Tabletop draws
      // the player area before any card is played. Best-effort — see sendToTable.ts.
      if (tableInfo) {
        await sendSeatJoinedBestEffort(tabletopPort, tableInfo.tableName, tableInfo.seatId, tableInfo.playerName);
      }

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

      const game = await GameState.fromPersistedGameState(persistedGame, cardRepository);

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

      const html = formatGamePageHtmlPage(game, {}, res.locals.devMode);
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

      // Restart carries the table info forward (JES-127): prefer what the game
      // itself recorded, fall back to the prep's record.
      const carriedTableName = persistedGame.tableName ?? prep.tableName;
      const tableInfo: TableInfo | undefined = carriedTableName
        ? {
            tableName: carriedTableName,
            playerName: persistedGame.playerName ?? prep.playerName ?? "player",
            seatId: persistedGame.seatId ?? prep.seatId ?? randomUUID().slice(0, 8),
          }
        : undefined;

      // Create new game from the same prep
      const newGameId = persistStatePort.newGameId();
      const newGame = GameState.newGame(newGameId, prep.prepId, prep.version, prep.deck, undefined, tableInfo);
      newGame.startGame(browserTabId);
      await persistStatePort.save(newGame.toPersistedGameState());

      // JES-140: re-announce the seat (idempotent — a physical no-op if the
      // Tabletop process still has this seat's player area from before restart).
      if (tableInfo) {
        await sendSeatJoinedBestEffort(tabletopPort, tableInfo.tableName, tableInfo.seatId, tableInfo.playerName);
      }

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

      const game = await GameState.fromPersistedGameState(persistedGame, cardRepository);
      const expectedVersion = game.getStateVersion();
      const libraryCards = game.listLibrary();

      // Build card modal URL template with expected version
      const cardModalUrlTemplate = `/card-modal/${gameId}/{cardIndex}?expected-version=${expectedVersion}`;

      const groupBy = req.query.groupBy as string | undefined;

      // Map to simple card objects for the template. cardTypes already holds the
      // union of every face's types, so two-faced cards appear in all their groups.
      const cards = libraryCards.map(gc => ({
        name: gc.card.name,
        gameCardIndex: gc.gameCardIndex,
        cardTypes: gc.card.cardTypes,
        colorIdentity: gc.card.colorIdentity
      }));

      res.render("partials/library-modal", {
        cards,
        cardModalUrlTemplate,
        groupBy,
        gameId,
        prepId: undefined,
        expectedVersion
      });
    } catch (error) {
      console.error("Error loading library modal:", error);
      res.status(500).send(`<div>Error loading library</div>`);
    }
  });

  // Returns modal fragment - table contents modal
  app.get("/table-modal/:gameId", async (req, res) => {
    const gameId = parseInt(req.params.gameId);

    try {
      // TODO: can this be middleware?
      const persistedGame = await persistStatePort.retrieve(gameId);
      if (!persistedGame) {
        res.status(404).send(`<div>Game ${gameId} not found</div>`);
        return;
      }

      const game = await GameState.fromPersistedGameState(persistedGame, cardRepository);
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

      const game = await GameState.fromPersistedGameState(persistedGame, cardRepository);

      // Validate state version for optimistic concurrency control
      // TODO: can this be middleware?
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

      // Calculate navigation indices — use navList if provided, else zone order
      const navListParam = req.query.navList as string | undefined;
      const navListNav = resolveNavListNavigation(navListParam, cardIndex);

      let prevCardIndex: number | null;
      let nextCardIndex: number | null;
      let currentPosition = 1;
      let totalCardsInZone = 1;

      if (navListNav) {
        prevCardIndex = navListNav.prevCardIndex;
        nextCardIndex = navListNav.nextCardIndex;
        currentPosition = navListNav.currentPosition;
        totalCardsInZone = navListNav.totalCardsInZone;
      } else {
        prevCardIndex = game.findPrevCardInZone(cardIndex);
        nextCardIndex = game.findNextCardInZone(cardIndex);
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
      }

      const expectedVersion = game.getStateVersion();
      const imageUrl = getCardImageUrl(gameCard.card, "large", gameCard.currentFace);
      const gathererUrl =
        gameCard.card.multiverseid
          ? `https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=${gameCard.card.multiverseid}`
          : `https://gatherer.wizards.com/Pages/Search/Default.aspx?name=${encodeURIComponent(`"${gameCard.card.oracleCardName || gameCard.card.name}"`)}`;

      // Build utility buttons HTML
      let utilityButtonsHtml = `<div class="card-modal-utility-buttons">
        <a href="${gathererUrl}" target="_blank" class="modal-action-button gatherer-button">See on Gatherer</a>
        <button class="modal-action-button copy-button"
                onclick="copyCardImageToClipboard(event, '${imageUrl}', '${gameCard.card.name}')">Copy</button>`;

      if (gameCard.card.twoFaced) {
        const flipVals: Record<string, string | number> = { "expected-version": expectedVersion };
        if (navListParam) flipVals["navList"] = navListParam;
        utilityButtonsHtml += `
        <button class="modal-action-button flip-button"
                hx-post="/flip-card-modal/${gameId}/${gameCard.gameCardIndex}"
                hx-vals='${JSON.stringify(flipVals)}'
                hx-target="#card-modal-container"
                hx-swap="innerHTML"
                title="Flip card to see other side">Flip</button>`;
      }

      utilityButtonsHtml += `</div>`;

      // Build location-specific action buttons HTML
      const locationActions = getModalCardActionsByLocation(gameCard, gameId, expectedVersion, !!game.tableName);
      const locationActionsHtml = locationActions ? `<div class="card-modal-location-actions">${locationActions}</div>` : "";

      // Build navigation URLs, preserving navList if present
      const navListSuffix = navListQueryParam(navListParam);
      const prevNavUrl = prevCardIndex !== null ? `/card-modal/${gameId}/${prevCardIndex}?expected-version=${expectedVersion}${navListSuffix}` : "";
      const nextNavUrl = nextCardIndex !== null ? `/card-modal/${gameId}/${nextCardIndex}?expected-version=${expectedVersion}${navListSuffix}` : "";

      res.render("partials/card-modal", {
        card: gameCard.card,
        imageUrl,
        gathererUrl,
        currentFace: gameCard.currentFace,
        prevCardIndex,
        nextCardIndex,
        prevNavUrl,
        nextNavUrl,
        currentPosition,
        totalCardsInZone,
        utilityButtonsHtml,
        locationActionsHtml,
      });
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

      // Determine navigation — use navList if provided, else zone order
      const navListParam = req.query.navList as string | undefined;
      const navListNav = resolveNavListNavigation(navListParam, cardIndex);

      let prevCardIndex: number | null;
      let nextCardIndex: number | null;
      let currentPosition: number;
      let totalCardsInZone: number;

      if (navListNav) {
        prevCardIndex = navListNav.prevCardIndex;
        nextCardIndex = navListNav.nextCardIndex;
        currentPosition = navListNav.currentPosition;
        totalCardsInZone = navListNav.totalCardsInZone;
      } else {
        const numCommanders = prep.deck.commanders.length;
        const isCommander = cardIndex < numCommanders;

        if (isCommander) {
          // Navigate within commanders
          totalCardsInZone = numCommanders;
          currentPosition = cardIndex + 1;
          prevCardIndex = cardIndex > 0 ? cardIndex - 1 : null;
          nextCardIndex = cardIndex < numCommanders - 1 ? cardIndex + 1 : null;
        } else {
          // Navigate within library cards
          const libraryIndex = cardIndex - numCommanders;
          totalCardsInZone = prep.deck.cards.length;
          currentPosition = libraryIndex + 1;
          prevCardIndex = libraryIndex > 0 ? cardIndex - 1 : null;
          nextCardIndex = libraryIndex < prep.deck.cards.length - 1 ? cardIndex + 1 : null;
        }
      }

      // Support flipping two-faced cards via query parameter
      const faceParam = req.query.face as string | undefined;
      const currentFace: "front" | "back" = faceParam === "back" ? "back" : "front";

      const imageUrl = getCardImageUrl(cardDef, "large", currentFace);
      const gathererUrl =
        cardDef.multiverseid
          ? `https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=${cardDef.multiverseid}`
          : `https://gatherer.wizards.com/Pages/Search/Default.aspx?name=${encodeURIComponent(`"${cardDef.oracleCardName || cardDef.name}"`)}`;

      // Build utility buttons HTML (no expectedVersion for prep page)
      let utilityButtonsHtml = `<div class="card-modal-utility-buttons">
        <a href="${gathererUrl}" target="_blank" class="modal-action-button gatherer-button">See on Gatherer</a>
        <button class="modal-action-button copy-button"
                onclick="copyCardImageToClipboard(event, '${imageUrl}', '${cardDef.name}')">Copy</button>`;

      if (cardDef.twoFaced) {
        const newFace = currentFace === "front" ? "back" : "front";
        const flipNavList = navListParam ? `&navList=${navListParam}` : "";
        utilityButtonsHtml += `
        <button class="modal-action-button flip-button"
                hx-get="/prep-card-modal/${prepId}/${cardIndex}?face=${newFace}${flipNavList}"
                hx-target="#card-modal-container"
                hx-swap="innerHTML"
                title="Flip card to see other side">Flip</button>`;
      }

      utilityButtonsHtml += `</div>`;

      // Build navigation URLs, preserving navList if present
      const navListSuffix = navListQueryParam(navListParam);
      const prevNavUrl = prevCardIndex !== null ? `/prep-card-modal/${prepId}/${prevCardIndex}${navListSuffix ? '?' + navListSuffix.slice(1) : ''}` : "";
      const nextNavUrl = nextCardIndex !== null ? `/prep-card-modal/${prepId}/${nextCardIndex}${navListSuffix ? '?' + navListSuffix.slice(1) : ''}` : "";

      res.render("partials/card-modal", {
        card: cardDef,
        imageUrl,
        gathererUrl,
        currentFace,
        prevCardIndex,
        nextCardIndex,
        prevNavUrl,
        nextNavUrl,
        currentPosition,
        totalCardsInZone,
        utilityButtonsHtml,
        locationActionsHtml: "", // No location actions for prep page
      });
    } catch (error) {
      console.error("Error loading prep card modal:", error);
      res.status(500).send(`<div>Error loading card details</div>`);
    }
  });

  // Returns card fragment - flips a two-faced card on the prepare screen. There is no game
  // yet, so this is stateless: the face to show comes from ?face= rather than from persisted
  // state, and nothing is saved. Returns the whole card container, not just the flip
  // container, because the container's modal URL is what carries the face to the card modal.
  app.get("/prep-flip-card/:prepId/:cardIndex", async (req, res) => {
    const prepId = parseInt(req.params.prepId);
    const cardIndex = parseInt(req.params.cardIndex);

    try {
      const prep = await persistPrepPort.retrievePrep(prepId);
      if (!prep) {
        res.status(404).send(`<div>Prep ${prepId} not found</div>`);
        return;
      }

      // Same card indexing as /prep-card-modal: commanders first, then library cards
      const { commanders, libraryCards, renderCommanderCard } = createPrepViewHelpers(prep);
      const gameCard = [...commanders, ...libraryCards].find((gc) => gc.gameCardIndex === cardIndex);
      if (!gameCard) {
        res.status(404).send(`<div>Card ${cardIndex} not found</div>`);
        return;
      }
      if (!gameCard.card.twoFaced) {
        res.status(400).send(`<div>${gameCard.card.name} has only one face</div>`);
        return;
      }

      const face: "front" | "back" = req.query.face === "back" ? "back" : "front";
      res.send(renderCommanderCard({ ...gameCard, currentFace: face }));
    } catch (error) {
      console.error("Error flipping prep card:", error);
      res.status(500).send(`<div>Error: ${error instanceof Error ? error.message : "Could not flip card"}</div>`);
    }
  });

  // Returns modal fragment - library contents modal for prep page (before game starts)
  app.get("/prep-library-modal/:prepId", async (req, res) => {
    const prepId = parseInt(req.params.prepId);

    try {
      const prep = await persistPrepPort.retrievePrep(prepId);
      if (!prep) {
        res.status(404).send(`<div>Prep ${prepId} not found</div>`);
        return;
      }

      // Create library cards list with prep-specific modal links
      const { libraryCards } = createPrepViewHelpers(prep);

      const groupBy = req.query.groupBy as string | undefined;

      // Build card modal URL template (no expected version for prep page)
      const cardModalUrlTemplate = `/prep-card-modal/${prepId}/{cardIndex}`;

      // Map to simple card objects for the template. cardTypes already holds the
      // union of every face's types, so two-faced cards appear in all their groups.
      const cards = libraryCards.map(gc => ({
        name: gc.card.name,
        gameCardIndex: gc.gameCardIndex,
        cardTypes: gc.card.cardTypes,
        colorIdentity: gc.card.colorIdentity
      }));

      res.render("partials/library-modal", {
        cards,
        cardModalUrlTemplate,
        groupBy,
        gameId: undefined,
        prepId,
        expectedVersion: undefined
      });
    } catch (error) {
      console.error("Error loading prep library modal:", error);
      res.status(500).send(`<div>Error loading library</div>`);
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
      const game = await GameState.fromPersistedGameState(persistedGame, cardRepository);
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

  // Returns game section fragment - for HTMX updates
  app.get("/game-section/:gameId", async (req, res) => {
    const gameId = parseInt(req.params.gameId);
    try {
      const persistedGame = await persistStatePort.retrieve(gameId);
      if (!persistedGame) {
        res.status(404).send(`<div>Game ${gameId} not found</div>`);
        return;
      }
      const game = await GameState.fromPersistedGameState(persistedGame, cardRepository);
      const html = formatActiveGameHtmlSection(game);
      res.send(html);
    } catch (error) {
      console.error("Error loading game section:", error);
      res.status(500).send(`<div>Error loading game section</div>`);
    }
  });

  // Card action endpoints
  // Returns active game fragment - updated game board
  app.post("/reveal-card/:gameId/:gameCardIndex", async (req, res) => {
    const gameId = parseGameIdParam(req, res);
    if (gameId === null) return;
    const gameCardIndex = parseInt(req.params.gameCardIndex);
    const browserTabId = res.locals.browserTabId as string | undefined;

    try {
      const outcome = await applyGameCommand({ persistStatePort, cardRepository }, gameId, expectedVersionFromRequest(req), (game) => {
        game.moveByGameCardIndex(gameCardIndex, "Revealed", browserTabId);
      });

      renderCommandOutcome(res, gameId, outcome, "Cannot reveal card: Game is not active", (game) => formatActiveGameHtmlSection(game));
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
      game.moveByGameCardIndex(gameCardIndex, "Hand", browserTabId);

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
  app.post("/put-on-top/:gameId/:gameCardIndex", loadGameFromParams, requireValidVersion, async (req, res) => {
    const game = res.locals.game as GameState;
    const gameId = res.locals.gameId as number;
    const gameCardIndex = parseInt(req.params.gameCardIndex);
    const browserTabId = res.locals.browserTabId as string | undefined;

    try {
      game.moveByGameCardIndex(gameCardIndex, "LibraryTop", browserTabId);

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
      game.moveByGameCardIndex(gameCardIndex, "LibraryBottom", browserTabId);

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

      const game = await GameState.fromPersistedGameState(persistedGame, cardRepository);

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

      // Send-then-commit (JES-127, B3): at a table, the tabletop gets the card
      // FIRST; only on success does the game state change. On failure the play
      // is blocked and the card stays in hand — a play that silently missed the
      // tabletop is worse than one that says it failed.
      const cardToPlay = game.findCardByIndex(gameCardIndex);
      if (game.tableName && cardToPlay && (cardToPlay.location.type === "Hand" || cardToPlay.location.type === "Revealed")) {
        const zoneHint = zoneHintForPlay(cardToPlay);
        trace.getActiveSpan()?.setAttributes({
          "table.name": game.tableName,
          "card.instance_id": cardToPlay.cardInstanceId ?? "missing",
          "zone.hint": zoneHint,
        });
        try {
          await sendCardToTableFirst(tabletopPort, game, cardToPlay, zoneHint);
        } catch (error) {
          console.error("Tabletop did not accept the card; blocking the play:", error);
          markCurrentSpanAsError(`Tabletop send failed: ${error instanceof Error ? error.message : String(error)}`);
          res
            .status(502)
            .setHeader("HX-Retarget", "#modal-container")
            .setHeader("HX-Reswap", "innerHTML")
            .send(formatTabletopSendErrorModal("play", cardToPlay.card.name, game.tableName));
          return;
        }
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

  // Returns active game fragment - discard: identical to play except the verb
  // (JES-127, B4). The card lands in TableLocation; at a table it is sent
  // FIRST with zoneHint "graveyard" (send-then-commit, same as /play-card).
  app.post("/discard-card/:gameId/:gameCardIndex", async (req, res) => {
    const gameId = parseInt(req.params.gameId);
    const gameCardIndex = parseInt(req.params.gameCardIndex);
    const browserTabId = res.locals.browserTabId as string | undefined;

    try {
      const persistedGame = await persistStatePort.retrieve(gameId);
      if (!persistedGame) {
        res.status(404).send(`<div>Game ${gameId} not found</div>`);
        return;
      }

      const game = await GameState.fromPersistedGameState(persistedGame, cardRepository);

      if (game.gameStatus() !== "Active") {
        res.status(400).send(`<div>Cannot discard card: Game is not active</div>`);
        return;
      }

      const versionCheck = validateStateVersion(req, game);
      if (!versionCheck.valid) {
        res.status(409)
           .setHeader('HX-Retarget', '#modal-container')
           .setHeader('HX-Reswap', 'innerHTML')
           .send(versionCheck.errorHtml);
        return;
      }

      const cardToDiscard = game.findCardByIndex(gameCardIndex);
      if (game.tableName && cardToDiscard && cardToDiscard.location.type === "Hand") {
        trace.getActiveSpan()?.setAttributes({
          "table.name": game.tableName,
          "card.instance_id": cardToDiscard.cardInstanceId ?? "missing",
          "zone.hint": "graveyard",
        });
        try {
          await sendCardToTableFirst(tabletopPort, game, cardToDiscard, "graveyard");
        } catch (error) {
          console.error("Tabletop did not accept the card; blocking the discard:", error);
          markCurrentSpanAsError(`Tabletop send failed: ${error instanceof Error ? error.message : String(error)}`);
          res
            .status(502)
            .setHeader("HX-Retarget", "#modal-container")
            .setHeader("HX-Reswap", "innerHTML")
            .send(formatTabletopSendErrorModal("discard", cardToDiscard.card.name, game.tableName));
          return;
        }
      }

      const whatHappened = game.discardCard(gameCardIndex, browserTabId);
      await persistStatePort.save(game.toPersistedGameState());

      const html = formatActiveGameHtmlSection(game, whatHappened);
      res.setHeader("HX-Trigger", "game-state-updated");
      res.send(html);
    } catch (error) {
      console.error("Error discarding card:", error);
      res.status(500).send(`<div>Error: ${error instanceof Error ? error.message : "Could not discard card"}</div>`);
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

  // Returns active game fragment - mulligan: hand back to library, shuffle, redraw
  app.post("/mulligan/:gameId", loadGameFromParams, requireValidVersion, async (req, res) => {
    const game = res.locals.game as GameState;
    const browserTabId = res.locals.browserTabId as string | undefined;

    if (game.gameStatus() !== "Active") {
      res.status(400).send(`<div>Cannot mulligan: Game is not active</div>`);
      return;
    }

    try {
      const whatHappened = game.mulligan(browserTabId);
      await persistStatePort.save(game.toPersistedGameState());

      const html = formatActiveGameHtmlSection(game, whatHappened);
      res.setHeader("HX-Trigger", "game-state-updated");
      res.send(html);
    } catch (error) {
      console.error("Error taking mulligan:", error);
      res.status(500).send(`<div>Error: ${error instanceof Error ? error.message : "Could not mulligan"}</div>`);
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
      const html = formatFlippingContainer(flippedCard, { page: "game", gameId });
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

      // Calculate navigation indices — use navList if provided, else zone order
      const navListParam = req.body.navList as string | undefined;
      const navListNav = resolveNavListNavigation(navListParam, gameCardIndex);

      let prevCardIndex: number | null;
      let nextCardIndex: number | null;
      let currentPosition = 1;
      let totalCardsInZone = 1;

      if (navListNav) {
        prevCardIndex = navListNav.prevCardIndex;
        nextCardIndex = navListNav.nextCardIndex;
        currentPosition = navListNav.currentPosition;
        totalCardsInZone = navListNav.totalCardsInZone;
      } else {
        prevCardIndex = game.findPrevCardInZone(gameCardIndex);
        nextCardIndex = game.findNextCardInZone(gameCardIndex);
        const location = flippedCard.location;

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
          currentPosition = cardsInZone.findIndex(gc => gc.gameCardIndex === gameCardIndex) + 1;
        }
      }

      const expectedVersion = game.getStateVersion();
      const imageUrl = getCardImageUrl(flippedCard.card, "large", flippedCard.currentFace);
      const gathererUrl =
        flippedCard.card.multiverseid
          ? `https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=${flippedCard.card.multiverseid}`
          : `https://gatherer.wizards.com/Pages/Search/Default.aspx?name=${encodeURIComponent(`"${flippedCard.card.oracleCardName || flippedCard.card.name}"`)}`;

      // Build utility buttons HTML
      let utilityButtonsHtml = `<div class="card-modal-utility-buttons">
        <a href="${gathererUrl}" target="_blank" class="modal-action-button gatherer-button">See on Gatherer</a>
        <button class="modal-action-button copy-button"
                onclick="copyCardImageToClipboard(event, '${imageUrl}', '${flippedCard.card.name}')">Copy</button>`;

      if (flippedCard.card.twoFaced) {
        const flipVals: Record<string, string | number> = { "expected-version": expectedVersion };
        if (navListParam) flipVals["navList"] = navListParam;
        utilityButtonsHtml += `
        <button class="modal-action-button flip-button"
                hx-post="/flip-card-modal/${gameId}/${flippedCard.gameCardIndex}"
                hx-vals='${JSON.stringify(flipVals)}'
                hx-target="#card-modal-container"
                hx-swap="innerHTML"
                title="Flip card to see other side">Flip</button>`;
      }

      utilityButtonsHtml += `</div>`;

      // Build location-specific action buttons HTML
      const locationActions = getModalCardActionsByLocation(flippedCard, gameId, expectedVersion, !!game.tableName);
      const locationActionsHtml = locationActions ? `<div class="card-modal-location-actions">${locationActions}</div>` : "";

      // Build navigation URLs, preserving navList if present
      const navListSuffix = navListQueryParam(navListParam);
      const prevNavUrl = prevCardIndex !== null ? `/card-modal/${gameId}/${prevCardIndex}?expected-version=${expectedVersion}${navListSuffix}` : "";
      const nextNavUrl = nextCardIndex !== null ? `/card-modal/${gameId}/${nextCardIndex}?expected-version=${expectedVersion}${navListSuffix}` : "";

      res.render("partials/card-modal", {
        card: flippedCard.card,
        imageUrl,
        gathererUrl,
        currentFace: flippedCard.currentFace,
        prevCardIndex,
        nextCardIndex,
        prevNavUrl,
        nextNavUrl,
        currentPosition,
        totalCardsInZone,
        utilityButtonsHtml,
        locationActionsHtml,
      });
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
      // Prefer the card's stored Scryfall URL (carries the version tag fresh
      // cards need); fall back to constructing it if the card isn't cached.
      const card = await cardRepository.getCard(cardId);
      const imageUrl = card ? getCardImageUrl(card, "png", cardFace) : constructCardImageUrl(cardId, "png", cardFace);

      const response = await fetchScryfall(imageUrl);
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

  // Developer mode entrance (undocumented). Sets a long-lived cookie and sends
  // you back where you came from. The exit link in the game menu hits /off.
  app.get("/dontdie", (req, res) => {
    res.cookie(DEV_MODE_COOKIE, "1", { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: true, sameSite: "lax" });
    res.redirect(req.get("referer") || "/");
  });

  app.get("/dontdie/off", (req, res) => {
    res.clearCookie(DEV_MODE_COOKIE);
    res.redirect(req.get("referer") || "/");
  });

  // 404 handler - must be last
  app.get("*", (req, res) => {
    res.status(404).sendFile(path.join(__dirname, "..", "public", "404.html"));
  });

  return app;
}
