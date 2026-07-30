# CLAUDE.md — the Tabletop

Guidance for Claude Code when working in `apps/tabletop/`. Fleet-level guidance
(owners, workflow, telemetry key sourcing) is in the repo-root `CLAUDE.md`.

This ship's seamap: `SEAMAP.md` (in this directory).

## What this is

Vite + React + tldraw synced canvas with an Express/ws sync server.
`/t/:tableName` is a shared board; the card-arrival API
(`POST /api/tables/:tableName/cards`, SCAFFOLDING for the Spine's future feed)
places cards from the Shuffler.

See `README.md` (in this directory) for Modes and SCAFFOLDING callouts.

## Commands

All from `apps/tabletop/`:

- `./run` — start locally (port 5180)
- `npx vitest run` — tests
- `./verify.sh` — Playwright verification
- `./deploy.sh` — deploy to table.jessitron.honeydemo.io

To run the whole fleet (Spine + Tabletop + Shuffler together), use `./run` from the
repo root — see the root `CLAUDE.md`.

## Observability

Fleet-level Honeycomb setup is in the root `CLAUDE.md`; the browser side is in
`notes/AGENT-NOTES.md` (spans go to a collector, not the server). Server side:

- **Logging**: `src/server/log.ts` — `log.info/warn/error(message, attributes, error?)`.
  Each record goes to stdout and to Honeycomb, carrying the trace/span id of the active
  span. **Reach for a span attribute first**; a log is for when there's no span to hang it
  on. Wired up by `logRecordProcessors` in `src/server/tracing.ts`; tested in
  `test/log.test.ts`.
- **Never `span.addEvent`.** This ship is where that rule came from: `rooms.ts` calls it
  from tldraw's throttled `pruneSessions` callback, which has no ambient span, so prod logs
  fill with "Operation attempted on ended Span" and the events are dropped. `log.ts` exists
  to fix that (JES-136).
- **`log.ts` is duplicated from the Shuffler deliberately** — no shared telemetry package,
  by choice. The copies are on different OTel version lines (this ship 0.221, the Shuffler
  0.219) with **incompatible constructor signatures**; don't copy telemetry lines between
  ships without checking. See `notes/AGENT-NOTES.md`.

## Deploy gotcha: tldraw license

**Deploying needs `TLDRAW_LICENSE_KEY` in the repo-root `.be`** — tldraw ≥ 4 blanks
the canvas 5s after load on any HTTPS non-loopback host, and localhost can't
reproduce it. See README → Licensing and `notes/AGENT-NOTES.md`.

Update this file when anything in it changes.
