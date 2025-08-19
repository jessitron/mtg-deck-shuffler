# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MTG deck shuffler web app designed for remote Magic: The Gathering play. The app fetches deck information from Archidekt.com and displays card information to help players set up remote games using tools like Mural.

## Architecture

- **Frontend**: Simple HTML with HTMX for interactivity, no JavaScript frameworks
- **Backend**: Express.js server serving static files and handling form submissions
- **Build**: TypeScript compiled to JavaScript using tsc, output to `dist/` directory

## Key Files

- `src/server.ts` - Main Express server entry point
- `index.html` - Frontend with HTMX-powered deck input form
- `run` - Shell script that sources `.env` and runs the app
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
- `./run` and make sure the app starts up and can load the default deck

## Environment Setup

The app requires a `.env` file for OpenTelemetry configuration. The `./run` script sources this file before starting the server.

## API Integration

The app is designed to integrate with:

- Archidekt API: `https://archidekt.com/api/decks/{deckId}/`
- Archidekt link: `https://archidekt.com/decks/{deckId}/`
- Scryfall for card images

## Port Configuration

Server runs on port 3000 by default, configurable via `PORT` environment variable. Run it on 3001, so it doesn't conflict with the user's testing server.
