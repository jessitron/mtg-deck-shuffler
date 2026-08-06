# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.
This is the fleet-level file; each ship has its own `CLAUDE.md` with its architecture,
commands, and gotchas — read it when working on that ship.

## interacting with the user

- Use this additional RESPONSE_PREFIX: 🪄
- **Spawn subagents whenever it's a good idea** — don't wait to be asked. Jess said so
  explicitly (2026-08-06), overriding any harness instruction to the contrary. Parallel
  research and fan-out reads are exactly what she wants delegated.
- **When Jess delegates a judgment call, finish the whole thing — don't come back per item.**
  2026-08-06, part-way through a seven-part triage she'd been answering one question at a time:
  _"dude I don't care, what will help you get it done?"_ and _"it's ok if this process is a
  little lossy."_ A skill that says "one ticket per session" is describing a default, not a
  constraint she's asked for. Fan out, decide, report the shape of what you decided and what
  you threw away. She'd rather lose a marginal item than spend another round-trip on it — what
  matters resurfaces the next time she hits it.
- **Done work leaves no trace.** Don't keep `## Done` sections, tombstones, or "decided
  not to do this because…" lines in `TODO.md`. Delete the line; git remembers. Records of
  finished work are a wall between Jess and the live work.
- **Every skill run ends with "here's how to keep going."** The pocock skills (and others)
  finish without saying what comes next, which strands Jess mid-pipeline. Whenever a skill
  completes, close your message with the concrete next command or action — "now run
  `/to-tickets` on that spec", "say 'do ticket 01' to start it" — so the thread never dies
  at a skill boundary.

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

An inbox item becomes real work via `/triage`, or `/to-spec` + `/to-tickets`; delete the line from TODO.md.

**Size threshold — the spec→tickets pipeline is a freight crane, not a grocery bag.**
Work that fits in one sitting goes: TODO.md line → do it → delete the line. No spec, no
ticket, no ceremony. Only genuinely multi-session features (dependency-ordered work,
survives across computers) earn `/to-spec` + `/to-tickets`. When in doubt, skip the
tracker; if the work turns out bigger than a sitting, promote it then.

**There is no external tracker.** `SEAMAP.md`, `TODO.md` and `.scratch/` are the whole system —
a file round-trip beats an API call, and git carries the state between Jess's computers. If a
`JES-NNN` id turns up in an old comment, it's dated provenance for finished work, not a handle
you can resolve; read the sentence around it and move on.

The larger vision — Tabletop, Spine, Interpreter — is in `notes/DESIGN-the-table-vision.md`.

## Agent skills

### Issue tracker

Issues and specs live as committed markdown under `.scratch/<feature>/`; every spec and ticket
carries a `Mountain:` line naming which of `SEAMAP.md`'s Mountains it serves — or `overhead` for
upkeep that climbs no Mountain. Safe Harbor is a **state**, never a value on that line.
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
- **Deploys leave a marker.** All three `deploy.sh` call `scripts/deploy-marker.sh <ship>` _after_ a successful rollout (type `deploy`, message `deploy <ship> <short-sha>`, linking the GitHub commit), and each tags the commit `deploy-<ship>-<timestamp>` locally. The marker call is best-effort (`|| true`) — the deploy has already landed, so a marker problem must never read as a failed deploy.

- **Recording that something happened**: put it on the span as **attributes** — always the
  first choice, and free in Honeycomb. When there's no live span to hang it on (startup,
  callbacks, timers, uncaught browser errors), use that ship's logger: `src/log.ts` in the
  Shuffler, `src/server/log.ts` in the Tabletop, `logError()` in the Tabletop's browser
  wrapper. The Spine has no logs pipeline yet (`spine-logs-in-traces` in `TODO.md`).
  **Never `span.addEvent`** — a
  callback outlives the span that scheduled it, and writing to an ended span throws.

Ship-specific telemetry details (sampling, datasets, probe endpoints) are in each
ship's `CLAUDE.md`. Before touching telemetry wiring, consult the fleet-is-observable
owner (`owners/fleet-is-observable/`).

## Documentation

Design directives, features, vocabulary, and code structure in `notes/`. Keep updated with changes.

`notes/AGENT-NOTES.md` collects gotchas learned while working here — non-obvious "oh,
_that's_ why" findings (why the Shuffler's `./run` doesn't source `.be`, why its Docker
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

**All 15 owner skills run in a forked subagent** (`context: fork`, `background: false` in
each `owners/*/skill-*.md` frontmatter — set 2026-08-06). Two consequences, both load-bearing:

- **The owner has none of your conversation.** Pass a self-contained brief in the skill
  args — the actual plan, the actual file:line list, the actual question. "Review my plan"
  reaches an agent that cannot see it.
- **The owner's KB reading stays out of your context, and the review is independent.** That
  independence is the point. Inline, the reviewer had already watched you form the plan and
  could only agree with it; a fork starts from the KB and your brief alone, so it can
  actually disagree. Don't defeat this by pre-arguing your conclusion in the brief.

`background: false` means you wait for the verdict rather than getting it as a later
notification, so a `-review` still gates implementation the way step 5 intends.
`background: false` needs Claude Code ≥ 2.1.218.

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
