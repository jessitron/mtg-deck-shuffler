# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.
This is the fleet-level file; each ship has its own `CLAUDE.md` with its architecture,
commands, and gotchas — read it when working on that ship.

## interacting with the user

- Use this additional RESPONSE_PREFIX: 🪄

## Seamap

This repo's seamap — the chart (North Star, Mountains, Safe Harbor) plus pointers to where the
live work is recorded — lives in `SEAMAP.md`. That's the fleet-level map; each major component has
its own seamap (`apps/shuffler/SEAMAP.md`, `apps/tabletop/SEAMAP.md`, `services/spine/SEAMAP.md`).
Orient, capture, and log proactively; use `drop-buoy` to capture work without derailing.

Work lives in three places, and only the last one varies per repo:

- **The chart** — `SEAMAP.md`. North Star, Mountains, Safe Harbor. Mountains are never tickets.
- **The inbox** — `TODO.md` at the repo root. Raw captures, pre-decision; `drop-buoy` writes here
  and so does Jess. Everything in it is untriaged by definition.
- **The tracker** — `docs/agents/issue-tracker.md` names it: committed markdown under
  `.scratch/<feature>/`, one file per spec and per ticket, each carrying a `Mountain:` line.
  That file is written by `/setup-matt-pocock-skills` and read by both his engineering skills
  and the seamap skills; **read it, never write it.**

An inbox item becomes real work via `/triage`, or `/to-spec` + `/to-tickets`; strike the line
through with a `promoted:` pointer when it goes.

Linear is no longer the tracker for this repo — issues moved to `.scratch/` because a file
round-trip beats an API call. The old Linear project still holds content; wind it down with
`scripts/snapshot-linear.sh [project] [outfile]`, which archives it to greppable markdown
(default `notes/linear-archive.md`). Read-only and re-runnable; needs `LINEAR_API_KEY` in `.be`.

The larger vision — Tabletop, Spine, Interpreter — is in `notes/DESIGN-the-table-vision.md`.

## Agent skills

### Issue tracker

Issues and specs live as committed markdown under `.scratch/<feature>/`; every spec and ticket
carries a `Mountain:` line naming which of `SEAMAP.md`'s Mountains it serves.
See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical roles, unrenamed, recorded as a `Status:` line in each issue file.
See `docs/agents/triage-labels.md`.

### Domain docs

Multi-context: shared vocabulary in `notes/GLOSSARY.md`, per-ship `CONTEXT.md`, and a
translations table in `CONTEXT-MAP.md` for terms that differ between ships.
See `docs/agents/domain.md`.

## Repo Layout

This is a polyglot monorepo (npm workspaces). The fleet level holds `notes/`,
`.claude/`, `owners/`, `scripts/`, `SEAMAP.md`, and the root `package.json`/`package-lock.json`.
`scripts/` is for shell helpers shared by the ships' own scripts — `preflight-aws.sh`
(`check_aws_credentials`) and `deploy-marker.sh`, both used by all three `deploy.sh`.
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
- **Two keys, two environments.** `HONEYCOMB_API_KEY` is the **`local`** ingest key (access: `createDatasets` only). `HONEYCOMB_MARKER_KEY`, also in `.be`, is a **`mtg-deck-shuffler`** (prod) key with Markers access — used only by `scripts/deploy-marker.sh`. Don't cross them: the ingest key cannot write markers, and marking the wrong environment succeeds silently, which is why the marker script checks the key's environment via `/1/auth` before posting.
- **Deploys leave a marker.** All three `deploy.sh` call `scripts/deploy-marker.sh <ship>` *after* a successful rollout (type `deploy`, message `deploy <ship> <short-sha>`, linking the GitHub commit), and each tags the commit `deploy-<ship>-<timestamp>` locally. The marker call is best-effort (`|| true`) — the deploy has already landed, so a marker problem must never read as a failed deploy.

- **Recording that something happened**: put it on the span as **attributes** — always the
  first choice, and free in Honeycomb. When there's no live span to hang it on (startup,
  callbacks, timers, uncaught browser errors), use that ship's logger: `src/log.ts` in the
  Shuffler, `src/server/log.ts` in the Tabletop, `logError()` in the Tabletop's browser
  wrapper. The Spine has no logs pipeline yet (JES-137). **Never `span.addEvent`** — a
  callback outlives the span that scheduled it, and writing to an ended span throws.

Ship-specific telemetry details (sampling, datasets, probe endpoints) are in each
ship's `CLAUDE.md`. Before touching telemetry wiring, consult the fleet-is-observable
owner (`owners/fleet-is-observable/`).

## Documentation

Design directives, features, vocabulary, and code structure in `notes/`. Keep updated with changes.

`notes/AGENT-NOTES.md` collects gotchas learned while working here — non-obvious "oh,
*that's* why" findings (why the Shuffler's `./run` doesn't source `.be`, why its Docker
build context is the repo root, and so on). Read it when something surprises you; append
to it when something surprises you and wasn't written down.

Update this file when anything in it changes.

## Owners

Owners are standing guardians for things that must keep holding — a **feature** that must keep
serving its users, or a **capability** that must keep working (invariants are capabilities that
aren't externally visible). Each owner is a knowledge base directory in **`owners/<slug>/`** plus
three animating skills — `<slug>-context`, `<slug>-review`, `<slug>-update` — symlinked into
`.claude/skills/`. **`owners/INDEX.md`** lists every owner with a one-line "consult me when…"
trigger; scan it when planning any change. Owners never close. Create new ones with the
`seamapping:create-owner` skill (it judges whether one is warranted first).

## Task Implementation Process

For each task, follow this workflow:

1. **Research**: Look at the task and do any research needed
2. **Consult owners**: Read `owners/INDEX.md` (one line each). For every owner whose "consult me when…" trigger the task could plausibly touch, invoke its `-context` skill (via the Skill tool) with a brief summary of the task. Note any concerns or relevant context they raise.
3. **Clarify**: Ask questions one at a time if needed
4. **Plan**: Design the implementation approach
5. **Review with owners**: For each owner that flagged potential interactions in step 2, invoke its `-review` skill with your plan. Adjust the plan based on their feedback.
6. **Verify First**: Decide how to verify functionality and write the test before implementing:
   - **User-visible changes**: Playwright test (browser verification)
   - **Internal logic**: Unit test
   - Run the test and confirm it fails
7. **Implement**: Build the functionality
8. **Verify Again**: Run the test and see it pass (or fix the implementation)
9. **Update owners**: For any owner whose files were touched or whose concerns were relevant, invoke its `-update` skill with a summary of what changed.
10. **Refactor**: Consider refactoring for clarity
11. **Celebrate**: Print a trumpet in ASCII art
