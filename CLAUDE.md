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

- `npm run build` - Compile TypeScript
- `npm run clean` - Remove `dist/`
- `npm start` - Build and run
- `PORT=3344 ./run` - Run with `.env` (preferred)
- `npm run precons:fetch-mtgjson -- --convert` - Download MTGJSON Commander Decks
- `npm run deck:download -- <deckId>` - Download Archidekt deck

## Testing

Verify changes with:

- `npm run build`
- `npm run test`
- `PORT=3344 ./run` - Verify app starts, click through to what you changed

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

## Task Implementation Process

For each task, follow this workflow:

1. **Research**: Look at the task and do any research needed
2. **Clarify**: Ask questions one at a time if needed
3. **Verify First**: Decide how to verify functionality and write the test before implementing:
   - **User-visible changes**: Playwright test (browser verification)
   - **Internal logic**: Unit test
   - Run the test and confirm it fails
4. **Implement**: Build the functionality
5. **Verify Again**: Run the test and see it pass (or fix the implementation)
6. **Refactor**: Consider refactoring for clarity
7. **Celebrate**: Print a trumpet in ASCII art
