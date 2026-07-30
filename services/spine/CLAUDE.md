# CLAUDE.md — the Spine

Guidance for Claude Code when working in `services/spine/`. Fleet-level guidance
(owners, workflow, telemetry key sourcing) is in the repo-root `CLAUDE.md`.

This ship's seamap: `SEAMAP.md` (in this directory).

## What this is

Ruby on Rails 8 + SQLite. Tables, seats, one append-only event log per table;
ingestion validates against `contracts/` (repo root) and fails loudly.
Admin screen (a table's log, with Honeycomb trace links) at `/admin/tables`.

See `README.md` (in this directory) for more.

## Commands

All from `services/spine/`:

- `PORT=4600 ./run` — start locally (sources repo-root `.be` before `.env`,
  same telemetry rule as the Shuffler — see the root `CLAUDE.md` → Observability)
- `bin/rails test` — tests
- `./deploy.sh` — deploy to spine.jessitron.honeydemo.io

To run the whole fleet (Spine + Tabletop + Shuffler together), use `./run` from the
repo root — see the root `CLAUDE.md`.

Update this file when anything in it changes.
