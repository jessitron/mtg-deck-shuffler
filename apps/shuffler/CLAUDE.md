# CLAUDE.md — the Shuffler

Guidance for Claude Code when working in `apps/shuffler/`. Fleet-level guidance
(owners, workflow, telemetry key sourcing) is in the repo-root `CLAUDE.md`.

**All paths in this file — and every Shuffler path in `notes/` — are relative to
`apps/shuffler/`.** So `src/app.ts` means `apps/shuffler/src/app.ts`. Commands
(`./run`, `./verify.sh`, `./deploy.sh`, `npm start`) are run **from `apps/shuffler/`**;
`npm run build` and `npm test` also work from the repo root, where they pass through
to the workspace.

This ship's seamap: `SEAMAP.md` (in this directory).

## Project Overview

MTG deck shuffler web app for remote Magic play. Loads precon Commander Decks from MTGJSON or custom decks from Archidekt, displaying card info for remote gameplay via Mural/Miro and Discord.

**Application Flow**: Home → Deck Selection → Deck Review → Play Game

## Architecture

- **Frontend**: HTML with HTMX for interactivity. Custom JS for tracing and HTMX-incompatible interactions.
- **Templating**: Two systems:
  - **EJS templates** (`views/`): Informational and pre-game pages. Use `res.render("template-name")`.
  - **TypeScript functions** (`src/view/`): Active gameplay pages returning HTML strings. Use `res.send(formatSomethingHtmlPage(...))`.
- **Backend**: Express.js server
- **Build**: TypeScript → JavaScript in `dist/`

## Testing Guidelines

- Use generators in `test/generators.ts` for Deck objects. For PersistedGameState, instantiate GameState with generated Deck and call methods.
- (Fleet-wide rule, repeated here because it matters: no mocks, only fakes.)

## UI Style

**Before adding or changing any UI, consult the design owner** —
`owners/shuffler-looks-like-itself/` and its `-context` / `-review` / `-update` skills.
Look at **`/design`** first: the component gallery renders every component using the
app's own stylesheets, so it can't drift from the app. Add a specimen there in the same
commit that adds a component.

The short version:

- **Square corners except on physical round elements** (cards, playmats, `.page-container`,
  count discs)
- **Never write a raw hex.** Use a token from `public/styles.css` `:root`. Material and
  Bootstrap defaults already in the CSS are drift, not precedent — don't copy them
- **Orbitron for chrome, Ovo for content** (card names are content). Risque only on site
  pages. No fourth typeface
- **Every interactive element gets a visible `:focus-visible` state**
- **Every button presses the same way** (JES-155 choice 1): `.pushable-flat` in
  `public/styles.css` — `translateY(-4px)` at rest, `-6px` on hover (springy, 250ms),
  `-2px` on press (34ms snap), plus a matching box-shadow bevel. No `outset`/`inset`
  borders for press feedback. Colors stay per-site (own fill, own darker shadow color) —
  don't reach for `.pushable-flat`'s default dark-pink on a component that isn't the CTA
- The card is the layout unit: **200 × 278**
- The site pages (/, /choose-any-deck) have different styles from the play pages
  (/prepare, /game)
- `playmat.css` is shared by game and prepare; `game.css` and `prepare.css` are
  page-specific; `site.css` is the site pages; `styles.css` holds the tokens. Watch for the
  modal, flip, and library-list blocks, which are currently duplicated across files

## Key Files

**Application Core**:

- `src/app.ts` - Express routes and middleware
- `src/server.ts` - Server initialization and dependency creation
- `run` - Shell script that sources `.env` and runs the app. Jess uses this

- `Dockerfile` - Multi-stage build; its build **context is the repo root** (npm workspaces keeps the lockfile there)
- `deploy.sh` - Build, push to ECR, apply `k8s/`. Run from `apps/shuffler/`

**Views** (EJS templates):

- `views/index.ejs`, `docs.ejs`, `about.ejs`, `choose-any-deck.ejs`, `prepare.ejs`
- `views/partials/` - Shared components (header, footer, head, deck-selection-precon, deck-selection-archidekt)

**Views** (TypeScript):

- `src/view/play-game/` - Active game screen components
- `src/view/common/` - Shared components and layout
- `src/view/debug/` - Debug utilities
- `src/view/error-view.ts` - Error page

**Styles**:

- `public/site.css` (site-wide), `styles.css` (tokens + global), `playmat.css` (shared by game and prepare), `game.css`, `prepare.css`, `deck-selection.css`, `docs.css`
- `/design` → `views/design.ejs` — the component gallery (see UI Style above).
  `public/design-candidates.css` holds proposals not yet adopted; `public/design-gallery.css`
  is gallery chrome only and must never be copied into the app

## Development Commands

**Build & Run:** (from `apps/shuffler/`, except where noted)

- `npm run build` - Compile TypeScript (also works from the root)
- `npm run clean` - Remove `dist/` (also works from the root)
- `npm start` - Build and run
- `PORT=3344 ./run` - Run with `.env` (preferred). Must be from `apps/shuffler/`
- `npm install` - Run this **from the root**; the lockfile lives there

Use `PORT=3344` to avoid conflict with Jess's testing server on the default port.
To run the whole fleet (Spine + Tabletop + Shuffler together), use `./run` from the
repo root — see the root `CLAUDE.md`.

**Deck Management Scripts:**

- `npm run precons:fetch-mtgjson -- --convert` - Download and convert all MTGJSON Commander precon decks to `decks/` directory
  - Default: **replaces all** existing deck files (rewrites every file, including a fresh `provenance.retrievedDate` — a noisy diff)
  - Add `--skip-existing` to convert only newly-released precons and leave existing files untouched (clean diff — use this when just picking up new precons)
  - Downloads from https://mtgjson.com/api/v5/AllDeckFiles.tar.gz, plus AllIdentifiers.json for two-faced back-face lookups (stream-parsed, since it exceeds Node's max string length)
  - Converts to internal format (`cardTypes`, `twoFaced`, etc.) and fetches Scryfall image URLs (`imageUris`/`backImageUris`) via `port-card-images/`
- `npm run deck:download -- <deckId>` - Download a specific Archidekt deck by ID
  - Example: `npm run deck:download -- 14669648`
  - Saves to `decks/deck-<deckId>.json` in internal format (includes Scryfall image URLs)
- `npm run decks:backfill-images [-- <file>...]` - Add/refresh Scryfall `imageUris` on existing `decks/*.json` **without** re-downloading from MTGJSON/Archidekt
  - Clean, additive diff (only adds image-URL fields; no `retrievedDate` churn), unlike the full `precons:fetch-mtgjson` rewrite
  - Defaults to all decks; pass filenames to target specific ones. Throttled + retries on Scryfall 429s. Use this to pick up image URLs for freshly-released cards.
- `npm run decks:backfill-set-names` - Rewrite the `set` field in `precon-mtgjson-*.json` from set codes to full set names (e.g. `SLD` → `Secret Lair Drop`) using Scryfall's `/sets`
  - The displayed set text comes from the commander's `set` (deck tiles). MTGJSON gives only codes; Archidekt decks already store names. This aligns the precons. Clean diff (only `set` lines). Idempotent and Archidekt decks are left untouched.
  - The MTGJSON adapter also takes set names now, so `precons:fetch-mtgjson -- --convert` produces names directly going forward.
- `npm run card:inspect -- <deckId> <nameSubstring>` - Dump raw Archidekt `oracleCard` data for matching cards
  - Example: `npm run card:inspect -- 23735063 Studious`
  - Useful for diagnosing layout/faces issues (e.g. why a single-faced card is treated as two-faced)

## Testing

Verify changes with (from `apps/shuffler/`):

- `npm run build`
- `npm run test`
- `PORT=3344 ./run` - Verify app starts, click through to what you changed
- `./verify.sh` - Playwright verification (builds, starts on 3001, runs the specs)

## Environment & Persistence

Requires `apps/shuffler/.env` for OpenTelemetry config. SQLite persistence by default — `data.db` is created in the server's cwd, so `apps/shuffler/data.db`. Set `PORT_PERSIST_STATE=in-memory` for ephemeral state.

Changing the shape of anything persisted (a `CardDefinition` field, `Deck`, `PersistedGameState`, `PersistedGamePrep`)? Follow `notes/DESIGN-persistence-versioning.md` — it covers which of the version constants to bump and how to fail loudly on old data.

## Table Mode (Tabletop integration, JES-127)

Games can join a table on the Tabletop (`apps/tabletop`). Prep screen takes optional
table name + player name; the Shuffler mints a short-GUID `seatId` at join and records
all three on BOTH `PersistedGamePrep` and `PersistedGameState` (optional fields, no
version bumps). `/restart-game` carries them forward.

- **Routes**: `POST /play-card/:gameId/:gameCardIndex` and `POST /discard-card/:gameId/:gameCardIndex`
  are **send-then-commit** in table mode: send to the tabletop FIRST via
  `src/port-tabletop/` (`HttpTabletopGateway`; `FakeTabletopGateway` for tests); only on
  success mutate + persist. Failure → 502 error modal, card stays in hand. Solo mode
  (no table): clipboard flow, untouched. Zone hints: land→battlefield, nonland→stack,
  discard→graveyard.
- **`seat.joined` (JES-140)**: `/start-game` and `/restart-game` call
  `sendSeatJoinedBestEffort()` (`src/port-tabletop/sendToTable.ts`) right after `tableInfo`
  is built, so the Tabletop draws the seat's player area (playmat, library, graveyard,
  exile) before any card is played. Unlike `sendCardToTableFirst`, this is **best-effort**:
  a Tabletop that's unreachable at Shuffle Up must not block starting the game — failure is
  a span attribute + `log.warn`, not a thrown error. The Tabletop's own `ensurePlayerArea`
  is idempotent and re-runs defensively on first card arrival, so a missed `seat.joined`
  self-heals.
- **Env**: `TABLETOP_URL` (server-to-server sends; default `http://localhost:5180`,
  prod `http://mtg-tabletop-service`), `TABLETOP_PUBLIC_URL` (browser "at table" link;
  default `https://table.jessitron.honeydemo.io`), `SHUFFLER_PUBLIC_URL` (JES-140 — lets
  the Tabletop hotlink the standard card-back image as an absolute URL; default
  `https://mtg.jessitron.honeydemo.io`).
- **Identity**: each GameCard gets a `cardInstanceId` GUID (minted in `newGame`,
  mint-on-load for old saves). `gameCardIndex` NEVER crosses the Shuffler's boundary
  (decodable secret — see `src/port-tabletop/types.ts`, JES-128).
- **Two-app verification**: `test/verification/verify-tabletop-integration.spec.ts`
  spawns the tabletop from `apps/tabletop/dist` (build it first) on port 5180.

## Data Sources & Adapters

- **MTGJSON**: `https://mtgjson.com/api/v5/AllDeckFiles.tar.gz` (precons with release dates)
- **Archidekt API**: `https://archidekt.com/api/decks/{deckId}/` (custom decks)
- **Scryfall**: image URLs fetched at ingestion via `POST /cards/collection` and stored on the card (`imageUris`/`backImageUris`). `getCardImageUrl()` prefers the stored URL and falls back to `constructCardImageUrl()` (bare CDN path) — the bare path 404s for freshly-released cards, which is why we store the versioned URLs.
  - **Always call Scryfall through `fetchScryfall()` (`src/scryfall-http.ts`), never bare `fetch`.** Node's default `User-Agent: node` gets a **400** from Scryfall's Cloudflare front end — the API *and* the image CDN. The 400 looks like our bug even though the URL is fine; see `notes/AGENT-NOTES.md`.
  - `test/verification/verify-proxy-image.sh` checks `/proxy-image` against the live CDN (both faces). Needs network, so it's a script rather than a jest test.

**Adapters** in `src/port-deck-retrieval/`:

- `mtgjsonAdapter/` - MTGJSON → internal format
- `archidektAdapter/` - Archidekt → internal format (enriches with Scryfall images when given an images port)
- `localFileAdapter/` - Read `decks/` files
- `compositeAdapters/` - Combine adapters with fallback

**Card images** in `src/port-card-images/` (`CardImagesPort`): `ScryfallCardImagesGateway` (batched, throttled, 429-retrying), `FakeCardImagesGateway`, and `enrichDeckWithImages()`. Wired into the Archidekt adapter at runtime (`server.ts`) and into the deck scripts.

## Observability

Fleet-level Honeycomb setup (environments, MCP server, `.be`-before-`.env` key
sourcing) is in the root `CLAUDE.md`. Shuffler specifics:

- **Sampling**: `src/telemetry-sampler.ts` keeps 1% of "background chatter" — health-check
  probes (by user agent, and the `/health` route) and static assets (by file extension) —
  and 100% of everything else. Kept at 1% rather than dropped so you can still confirm from
  traces that the app is up and serving. Unit tested in `test/telemetry-sampler.test.ts`;
  see `notes/AGENT-NOTES.md` for why that test exists.
- **Express middleware spans are off** (`ignoreLayersType`), so a normal trace is the root
  server span plus `request handler - <route>`, not eight spans of parser middleware.
- **`/health`** is the probe endpoint (k8s liveness/readiness and the ALB) — deliberately
  the cheapest route in the app.
- **Datasets**: server spans go to `mtg-deck-shuffler`; web/browser spans go to
  `mtg-deck-shuffler-web`.
- **Logging**: `src/log.ts` — `log.info/warn/error(message, attributes, error?)`. Each
  record goes to stdout and to Honeycomb, carrying the trace/span id of the active span.
  **Reach for a span attribute first**; a log is for when there's no span to hang it on
  (startup, shutdown, callbacks, timers). Never `span.addEvent`. Wired up by
  `logRecordProcessors` in `src/tracing.ts`; tested in `test/log.test.ts`.
- **Logs are not sampled.** A LogRecord doesn't inherit its span's sampling decision and we
  don't want it to — if the health check starts failing we want every log explaining why,
  not the 1% the sampler kept. What keeps volume affordable is not logging on the hot path.
- **`src/scripts/*` keeps `console.*` on purpose.** Those are CLI tools, not the server;
  their output belongs on the terminal. Don't sweep them into `log.ts`.
- **`log.ts` is duplicated in the Tabletop deliberately** — there is no shared telemetry
  package and we chose not to create one (the workspaces glob is `apps/*`/`services/*`, and
  a shared package is a new build surface for two Dockerfiles). The two copies are also on
  different OTel version lines with genuinely incompatible APIs; see `notes/AGENT-NOTES.md`.
  Don't "helpfully" extract them.

Update this file when anything in it changes.
