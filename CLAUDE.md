# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## interacting with the user

- Use this additional RESPONSE_PREFIX: 🪄

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
- **Cleanup**: Look for newly-unused code to delete after each change.

## UI Style

- Square corners except on physical round elements (cards, playmats)
- Latest styling in `public/site.css`

## Key Files

**Application Core**:

- `src/app.ts` - Express routes and middleware
- `src/server.ts` - Server initialization and dependency creation
- `run` - Shell script that sources `.env` and runs the app

**Views** (EJS templates):

- `views/index.ejs`, `docs.ejs`, `about.ejs`, `choose-any-deck.ejs`, `prepare.ejs`
- `views/partials/` - Shared components (header, footer, head, deck-selection-precon, deck-selection-archidekt)

**Views** (TypeScript):

- `src/view/play-game/` - Active game screen components
- `src/view/common/` - Shared components and layout
- `src/view/debug/` - Debug utilities
- `src/view/error-view.ts` - Error page

**Styles**:

- `public/site.css` (site-wide), `styles.css` (game), `game.css`, `prepare.css`, `deck-selection.css`, `docs.css`

**Scripts**:

- `public/home-v3-parallax.js`, `deck-selection.js`

## Development Commands

**Build & Run:**

- `npm run build` - Compile TypeScript
- `npm run clean` - Remove `dist/`
- `npm start` - Build and run
- `PORT=3344 ./run` - Run with `.env` (preferred)

**Deck Management Scripts:**

- `npm run precons:fetch-mtgjson -- --convert` - Download and convert all MTGJSON Commander precon decks to `decks/` directory
  - Use `--force` to overwrite existing files
  - Downloads from https://mtgjson.com/api/v5/AllDeckFiles.tar.gz
  - Converts to internal format with enriched card data (manaCost, cmc, oracleText)
- `npm run deck:download -- <deckId>` - Download a specific Archidekt deck by ID
  - Example: `npm run deck:download -- 14669648`
  - Saves to `decks/deck-<deckId>.json` in internal format

## Testing

Verify changes with:

- `npm run build`
- `npm run test`
- `PORT=3344 ./run` - Verify app starts, click through to what you changed

## Test Data for Browser Testing

For features that need existing games/preps in the database (e.g. testing modals, game UI):

1. Start the app: `PORT=3344 ./run`
2. Run `npm run seed` — creates a prep and a game (with 7 cards drawn) via browser automation
3. Check `test/TEST-DATA.md` for the resulting IDs and direct URLs

If `test/TEST-DATA.md` doesn't exist or the IDs in it 404, re-run `npm run seed`.
The file is .gitignored since IDs depend on local DB state.

## Environment & Persistence

Requires `.env` for OpenTelemetry config. SQLite persistence by default (`data.db`). Set `PORT_PERSIST_STATE=in-memory` for ephemeral state.

## Data Sources & Adapters

- **MTGJSON**: `https://mtgjson.com/api/v5/AllDeckFiles.tar.gz` (precons with release dates)
- **Archidekt API**: `https://archidekt.com/api/decks/{deckId}/` (custom decks)
- **Scryfall**: Card images via Scryfall ID

**Adapters** in `src/port-deck-retrieval/`:

- `mtgjsonAdapter/` - MTGJSON → internal format
- `archidektAdapter/` - Archidekt → internal format
- `localFileAdapter/` - Read `decks/` files
- `compositeAdapters/` - Combine adapters with fallback

## Port Configuration

Use `PORT=3344 ./run` to avoid conflict with user's testing server on the default port.

## Observability

Honeycomb telemetry: environment `librarytron-local`, dataset `mtg-deck-shuffler` (shared with other production apps).

## Documentation

Design directives, features, vocabulary, and code structure in `notes/`. Keep updated with changes.

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
