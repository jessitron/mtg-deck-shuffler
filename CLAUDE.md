# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## interacting with the user

- Use this additional RESPONSE_PREFIX: 🪄

## Project Overview

This is an MTG deck shuffler web app designed for remote Magic: The Gathering play. The app has a landing page that introduces the tool and explains how to use it with Mural/Miro and Discord for remote gameplay. The app can load preconstructed Commander Decks from MTGJSON or fetch custom decks from Archidekt.com, displaying card information to help players set up remote games.

**Application Flow**: Home → Deck Selection → Deck Review → Play Game

## Architecture

- **Frontend**: Simple HTML with HTMX for interactivity, no JavaScript frameworks. There is some custom JS in the header for tracing; and there is some custom JS for interactivity that can't be implemented with HTMX. Where possible, the JS triggers on HTMX events.
- **Templating - Two Systems**:
  - **Informational and pre-game pages**: EJS templates in `views/` for informational pages (home, docs, about) and pre-game pages (deck-selection, prepare). These pages describe the app or help set up games. Use `res.render("template-name")` to serve them.
  - **Active gameplay pages**: TypeScript functions in `src/view/` that return HTML strings via template literals. These pages display and manipulate active game state (play game, modals). Use `res.send(formatSomethingHtmlPage(...))` to serve them.
  - **Why the split?**: Separates concerns between pre-game setup (EJS with site styling) and active gameplay (TypeScript for type safety and dynamic state composition).
- **Backend**: Express.js server serving static files and handling form submissions
- **Build**: TypeScript compiled to JavaScript using tsc, output to `dist/` directory

## Development Guidelines

- **Workflow**: Use subagents for most work:
  - Start with a research agent to understand the codebase and locate relevant code
  - Use separate code-change agents for each conceptual change
  - This allows for better parallelization and more focused changes
- **Testing**: the user hates mocks. Use only fakes.
- **Testing**: Never hard-code Deck objects; use the generators in `test/generators.ts`.
- **Testing**: Never hard-code PersistedGameState objects (except when testing PersistStatePort implementations); instantiate a GameState with a generated Deck, then call its methods to change it.
- **Cleanup**: after each change, as a task, look for newly-unused code to delete.

## UI Style guidelines

- Corners are square, except where they're physically round like on Magic cards or playmats.
- the latest styling is in public/site.css

## Key Files

- `src/app.ts` - Core application logic with Express routes and middleware (main application file)
- `src/server.ts` - Server initialization, dependency creation, and startup
- `views/index.ejs` - Home page template (uses EJS templating)
- `views/docs.ejs` - Documentation page template (uses EJS templating)
- `views/prepare.ejs` - Deck review/game preparation page (uses EJS templating)
- `views/partials/` - Shared EJS components (header, footer, head)
- `public/site.css` - Site-wide page styles (used by all EJS pages)
- `public/prepare.css` - Styles for the prepare/deck review page
- `public/home-v3-parallax.js` - Home page parallax scrolling effect
- `src/view/` - HTML formatting functions organized by screen:
  - `play-game/` - Active game screen with cards in play
  - `common/` - Shared components, HTML layout, and view helpers
  - `debug/` - Debug utilities for state inspection
  - `error-view.ts` - Error page formatting
- `run` - Shell script that sources `.env` and runs the app
- `package.json` - Node.js project configuration
- `tsconfig.json` - TypeScript configuration targeting ES2022

## Development Commands

- **Build**: `npm run build` - Compiles TypeScript to `dist/`
- **Clean**: `npm run clean` - Removes `dist/` directory
- **Start**: `npm start` - Builds and runs the server from `dist/`
- **Run locally**: `./run` - Sources `.env` file and starts the app (preferred)
- **Fetch precons**: `npm run precons:fetch-mtgjson -- --convert` - Download all Commander Decks from MTGJSON
- **Download deck**: `npm run deck:download -- <deckId>` - Download a specific deck from Archidekt

## Testing

To verify changes, you can

- `npm run build`
- `npm run test` (this only tests some functions)
- `npm run test:snapshot` (run HTML output snapshot tests - see below)
- `./run` and make sure the app starts up and can load the default deck

### Snapshot Testing

- No HTML changes intended: Agent should run snapshot tests to verify no changes occurred
- Intended HTML changes: Only user should run snapshot tests to review and approve changes

## Environment Setup

The app requires a `.env` file for OpenTelemetry configuration. The `./run` script sources this file before starting the server.

### Persistence Configuration

The app uses **SQLite by default** for game state persistence, creating a `data.db` file in the project root.

- **SQLite (default)**: Persistent storage across server restarts
- **In-memory**: Set `PORT_PERSIST_STATE=in-memory` for testing/development - data is lost when server stops

## Data Sources

The app integrates with:

- **MTGJSON**: `https://mtgjson.com/api/v5/AllDeckFiles.tar.gz` - Preconstructed Commander Decks with accurate release dates (recommended)
- **Archidekt API**: `https://archidekt.com/api/decks/{deckId}/` - Custom deck imports
- **Scryfall**: Card images via Scryfall ID

### Deck Adapters

- `src/port-deck-retrieval/mtgjsonAdapter/` - Converts MTGJSON precon format to internal Deck format
- `src/port-deck-retrieval/archidektAdapter/` - Converts Archidekt API format to internal Deck format
- `src/port-deck-retrieval/localFileAdapter/` - Reads precon deck files from `decks/` directory

## Port Configuration

Server runs on port 3000 by default, configurable via `PORT` environment variable. Run it with `PORT=3001 ./run`, so it doesn't conflict with the user's testing server.

## Observability

The app sends telemetry data to Honeycomb for monitoring and debugging:

- **Environment**: `librarytron-local`
- **Dataset**: `mtg-deck-shuffler`
- **Note**: This environment also contains production traces from other applications

## Documentation

Design directives, features, vocabulary, and code structure are described in files in the notes/ directory. Keep these up to date as you change things.

Update this file when anything in it changes.
