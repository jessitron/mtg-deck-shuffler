# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.
This is the fleet-level file; each ship has its own `CLAUDE.md` with its architecture,
commands, and gotchas — read it when working on that ship.

## interacting with the user

- Use this additional RESPONSE_PREFIX: 🪄

## Seamap

This repo's seamap — the chart (North Star, Mountains, Safe Harbor) and the tracking adapter —
lives in `SEAMAP.md`. That's the fleet-level map; each major component has its own seamap
(`apps/shuffler/SEAMAP.md`, `apps/tabletop/SEAMAP.md`, `services/spine/SEAMAP.md`).
Orient, capture, and log proactively; use `drop-buoy` to capture work without derailing.

The larger vision — Tabletop, Spine, Interpreter — is in `notes/DESIGN-the-table-vision.md`.

## Repo Layout

This is a polyglot monorepo (npm workspaces). The fleet level holds `notes/`,
`.claude/`, `owners/`, `SEAMAP.md`, and the root `package.json`/`package-lock.json`.
The ships (each with its own `CLAUDE.md`, `SEAMAP.md`, `README.md`, `./run`, and `./deploy.sh`):

- `apps/shuffler/` — the Shuffler: Express + HTMX deck manager and game screen;
  hidden zones (library, hand). The original app.
- `apps/tabletop/` — the Tabletop: Vite + React + tldraw synced canvas
  (`/t/:tableName` is a shared board) where cards arrive from the Shuffler.
- `services/spine/` — the Spine: Rails 8 + SQLite; tables, seats, one append-only
  event log per table, validated against `contracts/`.
- `contracts/` — the fleet's published language: JSON Schema for the event
  envelope and per-kind payloads. Both the Spine (Ruby) and the TS apps validate
  on receipt and fail loudly on unknown name/version. See `contracts/README.md`
  and `notes/DESIGN-event-contract-v0.md`.

**Convention: every Shuffler path in `notes/` is relative to `apps/shuffler/`.**
So `src/app.ts` means `apps/shuffler/src/app.ts`.

## Run the whole fleet locally

- `./run` **from the repo root** — starts all three services with prefixed logs:
  Spine (:4600, admin at `/admin/tables`), Tabletop (:5180, tables at `/t/<name>`),
  Shuffler (:3344, wired to the local Tabletop via `TABLETOP_URL`). Sources `.be`
  once for telemetry (Honeycomb env `local`). Ctrl-C stops everything. Override
  ports with `SHUFFLER_PORT`/`TABLETOP_PORT`/`SPINE_PORT`.

Single-ship commands (build, test, run, deploy) are in each ship's `CLAUDE.md`.
`npm install` runs **from the root**; the lockfile lives here.

## Development Guidelines

- **Workflow**: Use subagents - research agent to understand codebase, then separate agents for each conceptual change.
- **Testing**: User hates mocks. Use only fakes.
- **Cleanup**: Look for newly-unused code to delete after each change. Especially unused CSS.

## Observability

Honeycomb telemetry (use the `honeycomb-modernity` MCP server — team `modernity`):

- **Local tests**: environment `local`.
- **Production**: environment `mtg-deck-shuffler` (the orion cluster in jessitron-sandbox).
- **API key sourcing**: each ship's `.env` sets `OTEL_EXPORTER_OTLP_HEADERS="x-honeycomb-team=$HONEYCOMB_API_KEY"`, interpolated **at source time**. `HONEYCOMB_API_KEY` lives in `.be` **at the repo root** (sourced on `cd` into the repo). So `.be` must be sourced **before** `.env`, or OTLP export silently 401s ("unknown API key"). The `verify.sh` scripts source both in that order; if you start a server by hand for telemetry, do the same.

Ship-specific telemetry details (sampling, datasets, probe endpoints) are in each
ship's `CLAUDE.md`. Before touching telemetry wiring, consult
`owners/fleet-is-observable.md`.

## Documentation

Design directives, features, vocabulary, and code structure in `notes/`. Keep updated with changes.

`notes/AGENT-NOTES.md` collects gotchas learned while working here — non-obvious "oh,
*that's* why" findings (why the Shuffler's `./run` doesn't source `.be`, why its Docker
build context is the repo root, and so on). Read it when something surprises you; append
to it when something surprises you and wasn't written down.

Update this file when anything in it changes.

## Feature Owners

Feature owners are agent skills that maintain deep knowledge about specific features. They live in `notes/features/<name>/` with skills linked from `.claude/skills/`. Each feature owner has three skills: `-context`, `-review`, and `-update`.

See `notes/features/HOW-TO-CREATE-A-FEATURE-OWNER.md` for creating new ones.

## Capability & Invariant Owners

A second, complementary kind of owner: standing guardians for a **capability** that must keep
working or an **invariant** that must stay true, fleet-wide rather than per-feature. These are plain
markdown knowledge bases (no skills) in **`owners/`**, one file each, indexed in
**`owners/INDEX.md`** with a one-line "consult me when…" trigger. Scan that index when planning any
change and open the files whose triggers match. Created with the
`seamapping:create-capability-owner` skill.

## Task Implementation Process

For each task, follow this workflow:

1. **Research**: Look at the task and do any research needed
2. **Consult feature owners**: List directories in `notes/features/*/`. For each feature owner found, invoke its `-context` skill (via the Skill tool) with a brief summary of the task. Note any concerns or relevant context they raise.
2b. **Consult capability/invariant owners**: Read `owners/INDEX.md` (one line each). For every "consult me when…" trigger the task could plausibly touch, read that owner's file and honor its invariants and watch points. These have no skills — they're documents.
3. **Clarify**: Ask questions one at a time if needed
4. **Plan**: Design the implementation approach
5. **Review with feature owners**: For each feature owner that flagged potential interactions in step 2, invoke its `-review` skill with your plan. Adjust the plan based on their feedback.
6. **Verify First**: Decide how to verify functionality and write the test before implementing:
   - **User-visible changes**: Playwright test (browser verification)
   - **Internal logic**: Unit test
   - Run the test and confirm it fails
7. **Implement**: Build the functionality
8. **Verify Again**: Run the test and see it pass (or fix the implementation)
9. **Update feature owners**: For any feature owner whose files were touched or whose concerns were relevant, invoke its `-update` skill with a summary of what changed.
10. **Refactor**: Consider refactoring for clarity
11. **Celebrate**: Print a trumpet in ASCII art
