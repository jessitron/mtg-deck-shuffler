# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## interacting with the user

- Use this additional RESPONSE_PREFIX: 🪄

## Seamap

This repo's seamap — the chart (North Star, Mountains, Safe Harbor) and the tracking adapter —
lives in `SEAMAP.md`. That's the fleet-level map; each major component has its own seamap
(`apps/shuffler/SEAMAP.md`, `apps/tabletop/SEAMAP.md`, `services/spine/SEAMAP.md`).
Orient, capture, and log proactively; use `drop-buoy` to capture work without derailing.

The larger vision — Tabletop, Spine, Interpreter — is in `notes/DESIGN-the-table-vision.md`.

## Repo Layout

This is a polyglot monorepo (npm workspaces). The fleet level holds `notes/`,
`.claude/`, `SEAMAP.md`, and the root `package.json`/`package-lock.json`. The ships:

- `apps/shuffler/` — the Shuffler (all the code described below)
- `apps/tabletop/` — not built yet, seamap only
- `services/spine/` — not built yet, seamap only

**Convention: every Shuffler path in this file and in `notes/` is relative to
`apps/shuffler/`.** So `src/app.ts` means `apps/shuffler/src/app.ts`. Shuffler
commands (`./run`, `./verify.sh`, `./deploy.sh`, `npm start`) are run **from
`apps/shuffler/`**; `npm run build` and `npm test` also work from the root, where
they pass through to the workspace.

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

## Development Guidelines

- **Workflow**: Use subagents - research agent to understand codebase, then separate agents for each conceptual change.
- **Testing**: User hates mocks. Use only fakes. Use generators in `test/generators.ts` for Deck objects. For PersistedGameState, instantiate GameState with generated Deck and call methods.
- **Cleanup**: Look for newly-unused code to delete after each change. Especially unused CSS.

## UI Style

- Square corners except on physical round elements (cards, playmats)
- Latest styling in `public/site.css`
- The site pages (/, /choose-any-deck) have different styles from the play pages (/prepare, /game)

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

- `public/site.css` (site-wide), `styles.css` (game and prepare), `game.css`, `prepare.css`, `deck-selection.css`, `docs.css`

## Development Commands

**Build & Run:** (from `apps/shuffler/`, except where noted)

- `npm run build` - Compile TypeScript (also works from the root)
- `npm run clean` - Remove `dist/` (also works from the root)
- `npm start` - Build and run
- `PORT=3344 ./run` - Run with `.env` (preferred). Must be from `apps/shuffler/`
- `npm install` - Run this **from the root**; the lockfile lives there

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

## Data Sources & Adapters

- **MTGJSON**: `https://mtgjson.com/api/v5/AllDeckFiles.tar.gz` (precons with release dates)
- **Archidekt API**: `https://archidekt.com/api/decks/{deckId}/` (custom decks)
- **Scryfall**: image URLs fetched at ingestion via `POST /cards/collection` and stored on the card (`imageUris`/`backImageUris`). `getCardImageUrl()` prefers the stored URL and falls back to `constructCardImageUrl()` (bare CDN path) — the bare path 404s for freshly-released cards, which is why we store the versioned URLs.

**Adapters** in `src/port-deck-retrieval/`:

- `mtgjsonAdapter/` - MTGJSON → internal format
- `archidektAdapter/` - Archidekt → internal format (enriches with Scryfall images when given an images port)
- `localFileAdapter/` - Read `decks/` files
- `compositeAdapters/` - Combine adapters with fallback

**Card images** in `src/port-card-images/` (`CardImagesPort`): `ScryfallCardImagesGateway` (batched, throttled, 429-retrying), `FakeCardImagesGateway`, and `enrichDeckWithImages()`. Wired into the Archidekt adapter at runtime (`server.ts`) and into the deck scripts.

## Port Configuration

Use `PORT=3344 ./run` to avoid conflict with user's testing server on the default port.

## Observability

Honeycomb telemetry (use the `honeycomb-modernity` MCP server — team `modernity`):

- **Local tests**: environment `local`, dataset `mtg-deck-shuffler` (web/browser spans go to `mtg-deck-shuffler-web`).
- **Production**: environment `mtg-deck-shuffler` (the orion cluster in jessitron-sandbox).
- **API key sourcing**: `apps/shuffler/.env` sets `OTEL_EXPORTER_OTLP_HEADERS="x-honeycomb-team=$HONEYCOMB_API_KEY"`, interpolated **at source time**. `HONEYCOMB_API_KEY` lives in `.be` **at the repo root** (sourced on `cd` into the repo). So `.be` must be sourced **before** `.env`, or OTLP export silently 401s ("unknown API key"). `verify.sh` sources both in that order (it looks for `.be` in its own dir, then the git toplevel); if you start the server by hand for telemetry, do the same.

## Documentation

Design directives, features, vocabulary, and code structure in `notes/`. Keep updated with changes.

`notes/AGENT-NOTES.md` collects gotchas learned while working here — non-obvious "oh,
*that's* why" findings (why `./run` doesn't source `.be`, why the Docker build context is
the repo root, and so on). Read it when something surprises you; append to it when
something surprises you and wasn't written down.

Update this file when anything in it changes.

## Feature Owners

Feature owners are agent skills that maintain deep knowledge about specific features. They live in `notes/features/<name>/` with skills linked from `.claude/skills/`. Each feature owner has three skills: `-context`, `-review`, and `-update`.

See `notes/features/HOW-TO-CREATE-A-FEATURE-OWNER.md` for creating new ones.

## Task Implementation Process

For each task, follow this workflow:

1. **Research**: Look at the task and do any research needed
2. **Consult feature owners**: List directories in `notes/features/*/`. For each feature owner found, invoke its `-context` skill (via the Skill tool) with a brief summary of the task. Note any concerns or relevant context they raise.
3. **Clarify**: Ask questions one at a time if needed
4. **Plan**: Design the implementation approach
5. **Review with feature owners**: For each feature owner that flagged potential interactions in step 2, invoke its `-review` skill with your plan. Adjust the plan based on their feedback.
6. **Verify First**: Decide how to verify functionality and write the test before implementing:
   - **User-visible changes**: Playwright test (browser verification)
   - **Internal logic**: Unit test
   - Run the test and confirm it fails
7. **Implement**: Build the functionality
8. **Verify Again**: Run the test and see it pass (or fix the implementation)
9. **Update feature owners**: For any feature owner whose files were touched or whose concerns were relevant, invoke its `-update` skill with a summary of what changed.
10. **Refactor**: Consider refactoring for clarity
11. **Celebrate**: Print a trumpet in ASCII art
