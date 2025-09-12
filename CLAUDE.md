# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MTG deck shuffler web app designed for remote Magic: The Gathering play. The app fetches deck information from Archidekt.com and displays card information to help players set up remote games using tools like Mural.

## Architecture

- **Frontend**: Simple HTML with HTMX for interactivity, no JavaScript frameworks. There is some custom JS in the header for tracing; and there is some custom JS for interactivity that can't be implemented with HTMX. Where possible, the JS triggers on HTMX events.
- **Backend**: Express.js server serving static files and handling form submissions
- **Build**: TypeScript compiled to JavaScript using tsc, output to `dist/` directory

## Development Guidelines

- Testing: the user hates mocks. Use only fakes.
- Cleanup: after each change, ask, is there some newly-unused code that I can delete?

## Key Files

- `src/app.ts` - Core application logic with Express routes and middleware (main application file)
- `src/server.ts` - Server initialization, dependency creation, and startup
- `src/view/` - HTML formatting functions organized by screen:
  - `load-deck-view.ts` - Deck loading/selection screen
  - `review-deck-view.ts` - Deck review screen before game starts
  - `active-game-view.ts` - Active game screen with cards in play
- `public/index.html` - Frontend with HTMX-powered deck input form
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
