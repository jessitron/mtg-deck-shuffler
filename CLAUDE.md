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

### Test Types

This project uses two types of tests:
- **Unit tests**: Test individual functions and components (use only fakes, never mocks)
- **Snapshot tests**: Golden master testing for HTML output verification

### Running Tests

- `npm run build` - Compile TypeScript
- `npm test` - Run all tests
- `npm test <specific-test-file>` - Run a specific test
- `./run` - Start the app to verify it loads the default deck

### Snapshot Testing Guidelines

**When to use snapshot tests:**
- For HTML formatting functions in `src/view/`
- To detect unintended changes during refactoring
- To review intended changes before committing

**Snapshot test workflow:**
1. **After making changes**: Run `npm test` to see if any HTML output changed
2. **Review differences**: The test output shows exactly what changed
3. **If changes are intentional**: Delete the snapshot file and re-run the test to create a new one
4. **If changes are unintentional**: Fix your code to match the expected output

**Example: Working with formatHomepageHtml snapshot**
```bash
# Make changes to load-deck-view.ts
npm test test/view/formatHomepageHtml.snapshot.test.ts

# If output changed and you want to accept the changes:
rm test/view/snapshots/formatHomepageHtml.html
npm test test/view/formatHomepageHtml.snapshot.test.ts

# Review the new snapshot file, then commit both code and snapshot
git add . && git commit -m "Update homepage layout - claude"
```

**Creating new snapshot tests:**
Follow the pattern in `test/view/formatHomepageHtml.snapshot.test.ts`:
- Create realistic fake data (no mocks)
- Use descriptive test names
- Store snapshots in `test/view/snapshots/`
- Provide clear error messages with diff output

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
