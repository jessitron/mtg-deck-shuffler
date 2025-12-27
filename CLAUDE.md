# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## interacting with the user

- Use this additional RESPONSE_PREFIX: 🪄

## Project Overview

This is an MTG deck shuffler web app designed for remote Magic: The Gathering play. The app has a landing page that introduces the tool and explains how to use it with Mural/Miro and Discord for remote gameplay. The app fetches deck information from Archidekt.com and displays card information to help players set up remote games.

**Application Flow**: Home → Deck Selection → Deck Review → Play Game

## Architecture

- **Frontend**: Simple HTML with HTMX for interactivity, no JavaScript frameworks. There is some custom JS in the header for tracing; and there is some custom JS for interactivity that can't be implemented with HTMX. Where possible, the JS triggers on HTMX events.
- **Templating - Two Systems**:
  - **Static pages (about the game)**: EJS templates in `views/` for informational pages like home and docs. These pages describe what the app does and how to use it. Use `res.render("template-name")` to serve them.
  - **Dynamic pages (in the game)**: TypeScript functions in `src/view/` that return HTML strings via template literals. These pages display and manipulate game state (deck selection, deck review, active gameplay, modals). Use `res.send(formatSomethingHtmlPage(...))` to serve them.
  - **Why the split?**: Separates concerns between informational content (EJS for standard templating) and gameplay pages (TypeScript for type safety and composition when working with game state).
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
- `views/partials/` - Shared EJS components (header, footer, head)
- `public/site.css` - Site-wide page styles (used by all EJS pages)
- `public/home-v3-parallax.js` - Home page parallax scrolling effect
- `src/view/` - HTML formatting functions organized by screen:
  - `deck-selection/` - Deck loading/selection screen
  - `deck-review/` - Deck review screen before game starts
  - `play-game/` - Active game screen with cards in play
  - `common/` - Shared components and HTML layout
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

## API Integration

The app is designed to integrate with:

- Archidekt API: `https://archidekt.com/api/decks/{deckId}/`
- Archidekt link: `https://archidekt.com/decks/{deckId}/`
- Scryfall for card images

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
