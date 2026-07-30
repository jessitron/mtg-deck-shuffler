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

## Deploy gotcha: tldraw license

**Deploying needs `TLDRAW_LICENSE_KEY` in the repo-root `.be`** — tldraw ≥ 4 blanks
the canvas 5s after load on any HTTPS non-loopback host, and localhost can't
reproduce it. See README → Licensing and `notes/AGENT-NOTES.md`.

Update this file when anything in it changes.
