# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MTG deck shuffler web app designed for remote Magic: The Gathering play. The app fetches deck information from Archidekt.com and displays card information to help players set up remote games using tools like Mural.

## Architecture

- **Frontend**: Simple HTML with HTMX for interactivity, no JavaScript frameworks
- **Backend**: Express.js server serving static files and handling form submissions
- **Build**: TypeScript compiled to JavaScript using tsc, output to `dist/` directory

## Key Files

- `server.ts` - Main Express server entry point
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

## OpenTelemetry & Observability

This application is instrumented with OpenTelemetry and sends telemetry data to Honeycomb:

- **Initialization**: `src/tracing.ts` initializes the OpenTelemetry SDK with automatic instrumentation
- **Configuration**: Environment variables in `.env` configure the OTLP exporter for Honeycomb
- **Dataset**: Telemetry data appears in the `mtg-deck-shuffler` dataset in the `mtg-deck-shuffler-local` environment
- **Startup**: Tracing is automatically loaded before the main application via `-r` flag in npm scripts

### Environment Variables Required:

```
HONEYCOMB_API_KEY=your-api-key
OTEL_SERVICE_NAME="mtg-deck-shuffler"
OTEL_EXPORTER_OTLP_PROTOCOL="http/protobuf"
OTEL_EXPORTER_OTLP_ENDPOINT="https://api.honeycomb.io:443"
OTEL_EXPORTER_OTLP_HEADERS="x-honeycomb-team=$HONEYCOMB_API_KEY"
OTEL_LOG_LEVEL="info"
```

### Observability Features:

- HTTP request/response tracing (incoming and outgoing)
- External API call instrumentation (Archidekt API)
- Network-level operation tracking (TCP/TLS connections)
- Distributed tracing across service boundaries

## API Integration

The app is designed to integrate with:

- Archidekt API: `https://archidekt.com/api/decks/{deckId}/`
- Archidekt link: `https://archidekt.com/decks/{deckId}/`
- Scryfall for card images (referenced in README goals)

## Port Configuration

Server runs on port 3000 by default, configurable via `PORT` environment variable.
