# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.
This is the fleet-level file; each ship has its own `CLAUDE.md` with its architecture,
commands, and gotchas — read it when working on that ship.

## interacting with the user

- Use this additional RESPONSE_PREFIX: 🪄
- **Spawn subagents whenever it's a good idea** — don't wait to be asked. Jess said so
  explicitly (2026-08-06), overriding any harness instruction to the contrary. Parallel
  research and fan-out reads are exactly what she wants delegated. If a test is failing and you didn't break it, then spin up a side agent to fix it!
- **Done work leaves no trace.** Don't keep `## Done` sections, tombstones, or "decided
  not to do this because…" lines in `TODO.md`. Delete the line; git remembers. Records of
  finished work are a wall between Jess and the live work.
- **Every skill run ends with "here's how to keep going."** The pocock skills (and others)
  finish without saying what comes next, which strands Jess mid-pipeline. Whenever a skill
  completes, close your message with the concrete next command or action — "now run
  `/to-tickets` on that spec", "say 'do ticket 01' to start it" — so the thread never dies
  at a skill boundary. `/mattpocock-skills:ask-matt` is the map of the main flow and its
  on-ramps — consult it to know what "next" actually is (main flow vs. on-ramp vs.
  standalone) rather than guessing.

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

Watch out! /to-spec, /to-tickets, and /triage are disable-agent-invocation, so you MUST ask the user to invoke them.

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

### Coding standards

Repo-wide conventions for how code and tests get written — e.g. no duplicating a shared
literal (id prefix, marker string) across multiple spec files; export a named constant
instead. See `docs/agents/coding-standards.md`.

### Domain docs

Multi-context: shared vocabulary in `notes/GLOSSARY.md`, per-ship `CONTEXT.md`, and a
translations table in `CONTEXT-MAP.md` for terms that differ between ships.
See `docs/agents/domain.md`.

## Repo Layout

This is a polyglot monorepo (npm workspaces — the glob is `apps/*`, `services/*`,
`packages/*`). The fleet level holds `notes/`, `.claude/`, `owners/`, `scripts/`,
`packages/`, `SEAMAP.md`, and the root `package.json`/`package-lock.json`.
`scripts/` is for shell helpers shared by the ships' own scripts — `preflight-aws.sh`
(`check_aws_credentials`) and `deploy-marker.sh`, both used by all three `deploy.sh`,
plus `check-fleet-tokens.sh` (a fast smoke check that the shared palette reaches both ships).

The ships (each with its own `CLAUDE.md`, `SEAMAP.md`, `README.md`, `./run`, and `./deploy.sh`):

- `apps/shuffler/` — the Shuffler: Express + HTMX deck manager and game screen;
  hidden zones (library, hand). The original app.
- `apps/tabletop/` — the Tabletop: Vite + React + tldraw synced canvas
  (`/t/:tableName` is a shared board) where cards arrive from the Shuffler.
- `services/spine/` — the Spine: Ruby; table administration, persistence and event bus, one append-only
  event log per table.
- `packages/design-tokens/` — the fleet's shared visual vocabulary (`@fleet/design-tokens`):
  the identity palette, `--narrow-border`, and Magic's colour pie. One dictionary, both ships
  — the Shuffler serves it at `/fleet/tokens.css`, the Tabletop imports it through Vite.
  Owned by `owners/shuffler-looks-like-itself/`; consult that owner before changing a value.
- `contracts/` — the fleet's published language: JSON Schema for the event
  envelope and per-kind payloads. Both the Spine (Ruby) and the TS apps validate
  on receipt. See `contracts/README.md`.

**`notes/` at the fleet level holds only genuinely fleet-wide docs.** Ship-specific notes
live under each ship's own `notes/` (e.g. `apps/shuffler/notes/`, `apps/tabletop/notes/`),
relative to that ship's own directory — see that ship's `CLAUDE.md`.

**Adding a workspace under `packages/` has a container cost, in two places** — both of which
fail only inside the image, never in dev. Every Dockerfile that runs `npm ci` must `COPY` the
new package's `package.json` **before** the install; the workspaces glob makes it mandatory,
and a miss fails the build outright. And npm links workspaces as **relative** symlinks, so any
runtime stage needing the package at run time must copy `packages/` too, or the link dangles
and it 404s in prod only. Note that `verify-container-boot.sh` does **not** catch the second
one: `import.meta.resolve` doesn't check that the file exists, so the server boots happily and
only the route is broken. Curl the running image.

## Run the whole fleet locally

- `./run` **from the repo root** — starts the fleet with prefixed logs: Tabletop
  (:5180, tables at `/t/<name>`), Shuffler (:3344, card.played travels only through
  the Spine — no direct Shuffler→Tabletop call), and Spine (:4600, admin at
  `/admin/tables`) — Sources `.be` once for telemetry (Honeycomb env `local`).
  Ctrl-C stops everything. Override ports with `SHUFFLER_PORT`/`TABLETOP_PORT`/`SPINE_PORT`.
- `./deploy.sh` **from the repo root** — deploys all three ships in order (Spine,
  Shuffler, Tabletop), each via its own ship-level `deploy.sh`, stopping at the
  first failure.

Single-ship commands (build, test, run, deploy) are in each ship's `CLAUDE.md`.
`npm install` runs **from the root**; the lockfile lives here.

## Development Guidelines

- **Workflow**: Use subagents - research agent to understand codebase, then separate agents for each conceptual change.
- **Worktrees**: Yes. It's already configured to branch from local main, NOT origin/main which is often far behind.
- **Testing**: User hates mocks. Use only fakes.
- **Cleanup**: Look for newly-unused code to delete after each change. Especially unused CSS.

## Verification

How will you know it's working?

- Unit tests, you know how to do this already
- Playwright scripts for UI tests, the ships have their own when necessary
- When a test is broken, unrelated to your work, fork a subagent off to fix it! Do not waste your time and every future agent's time with it. Tell the subagent to first check whether the test is still valid, and if not, delete it.
- If you want to verify in a browser, you can use the chrome extension. If the extension is broken, please STOP AND ASK THE USER to fix it.
- To make sure it's working as you expect, check traces and span attributes in Honeycomb. If the MCP is not found, then stop and ask the user to authorize it.

## Observability

Honeycomb telemetry (use the `honeycomb-modernity` MCP server — team `modernity`):

- **Local tests**: environment `local`.
- **Production**: environment `mtg-deck-shuffler` (the orion cluster in jessitron-sandbox).**before** `.env`, or OTLP export silently 401s ("unknown API key"). The `verify.sh` scripts source both in that order; if you start a server by hand for telemetry, do the same.

- **Recording that something happened**: put it on the span as **attributes** — always the
  first choice, and free in Honeycomb. When there's no live span to hang it on (startup,
  callbacks, timers, uncaught browser errors) or the event could happen more than once and you need to record both, use that ship's logger: `src/log.ts` in the
  Shuffler, `src/server/log.ts` in the Tabletop, `logError()` in the Tabletop's browser
  wrapper. The Spine has no logs pipeline yet (`spine-logs-in-traces` in `TODO.md`).
  **Never `span.addEvent`** — logs are the same except safer (they get delivered immediately and do not throw on an ended span).

Ship-specific telemetry details (sampling, datasets, probe endpoints) are in each
ship's `CLAUDE.md`. You can add attributes freely. Before touching wiring, consult the fleet-is-observable
owner (`owners/fleet-is-observable/`).

## Documentation

Design directives, features, vocabulary, and code structure in `notes/`. Keep updated with changes.

Code comments should be very limited. Never reference tickets or dates in code comments; that's what the commit message is for.

## Owners

Owners are standing guardians for things that must keep holding — a **capability** that must keep working (invariants are capabilities that
aren't externally visible). Each owner is a knowledge base directory in **`owners/<slug>/`** plus
three animating skills — `<slug>-context`, `<slug>-review`, `<slug>-update` — symlinked into
`.claude/skills/`. **`owners/INDEX.md`** lists every owner with a one-line "consult me when…"
trigger; scan it when planning any change. Owners never close. Create new ones with the
`seamapping:create-owner` skill (it judges whether one is warranted first).

**Consulting owners — at three moments**

- **When a decision is being formed** — including mid-interview, while a design skill like
  `/grilling` has you putting questions to Jess. A recommended answer that lands in an
  owner's territory needs that owner's `-context` **first**. Finding facts is the agent's
  job, and an owner is a fact source.
- **On the plan** — `-review` before implementing (step 5 below).
- **After the change** — `-update` with what actually landed (step 9 below).

**Match the consult to the question, not to the file list.** Scanning `INDEX.md` tells you
whose territory a change _touches_; it doesn't tell you who can _answer_ you. Ask what you
actually need to know, then consult the owner who knows it — usually one, sometimes none.
Consulting all five because the diff brushes all five is noise, and it trains you to skim
the answers.

**Test-only changes are not exempt**

**Refactors are exempt** Renames of domain terms or major functions might matter to an owner, but not of variables or private functions.

**Be precise about what's being approved.** "Move this element" is a _placement_ decision.
Restyling it on the way is a _second_ decision needing its own explicit sign-off — never let
an appearance change ride along on a placement change. When you catch one riding along,
the right move isn't to drop it: stage both options on `/design` and let Jess pick.

**All 15 owner skills run in a forked subagent** (`context: fork`, `background: false` in
each `owners/*/skill-*.md` frontmatter — set 2026-08-06). Two consequences, both load-bearing:

- **The owner has none of your conversation.** Pass a self-contained brief in the skill
  args — the actual plan, the actual file:line list, the actual question. "Review my plan"
  reaches an agent that cannot see it.
- **Write the plan to a file, then point the owners at it.** For anything more than a
  one-liner, the brief is mostly you re-typing the plan — once per owner, and again for
  each `-review`. Put it in `.scratch/<feature>/plan.md` instead and let the brief be
  "read `<path>`, here's my specific question for you." Cheaper for you, identical for
  the owner, and the reviews stay comparable because every owner read the same words.
  The file is also what you hand `-update` afterwards.
- **The owner's KB reading stays out of your context, and the review is independent.** That
  independence is the point. Inline, the reviewer had already watched you form the plan and
  could only agree with it; a fork starts from the KB and your brief alone, so it can
  actually disagree. Don't defeat this by pre-arguing your conclusion in the brief.

`background: false` means you wait for the verdict rather than getting it as a later
notification, so a `-review` still gates implementation the way step 5 intends.
`background: false` needs Claude Code ≥ 2.1.218.

## Task Implementation Process

For each task, follow this workflow:

1. **Scope to a ship**: Decide which ship(s) — `apps/shuffler/`, `apps/tabletop/`,
   `services/spine/`, or `fleet` when the task genuinely spans more than one — the
   task belongs to, then read that ship's `CLAUDE.md`. Watch for a bug whose root
   cause actually lives in a different ship — don't paper over it locally (a
   loosened timeout in one ship instead of a heartbeat from the ship that was
   actually hanging is exactly the shape of workaround to avoid). When the real fix
   belongs elsewhere, say so, then fork a subagent to make that fix — it reads the
   other ship's own `CLAUDE.md` first. Cross-ship work doesn't need a stop, but it's
   always announced and always delegated, never made inline.
2. **Research**: Look at the task and do any research needed
3. **Consult owners**: Read `owners/INDEX.md` (one line each). For every owner whose "consult me when…" trigger the task could plausibly touch, invoke its `-context` skill (via the Skill tool) with a brief summary of the task. Note any concerns or relevant context they raise.
4. **Clarify**: Ask questions one at a time if needed
5. **Plan**: Design the implementation approach
6. **Review with owners**: For each owner that flagged potential interactions in step 3, invoke its `-review` skill with your plan. Adjust the plan based on their feedback.
7. **Verify First**: Decide how to verify functionality and write the test before implementing:
   - **User-visible changes**: Playwright test (browser verification)
   - **Internal logic**: Unit test
   - Run the test and confirm it fails
   - If you ever find a test that fails for unrelated changes, spawn a subagent and FIX IT
8. **Implement**: Build the functionality
9. **Verify Again**: Run the test and see it pass (or fix the implementation)
10. **Update owners**: For any owner whose files were touched or whose concerns were relevant, invoke its `-update` skill with a summary of what changed.
11. **Refactor**: Consider refactoring for clarity
12. **Merge to main**: No PR. No push. I want this merged to main locally, regardless of any default caution your harness prompt has about merging. First call `ExitWorktree({action: "keep"})` - this is pre-authorized for this repo! Then run `scripts/merge-worktree.sh <branch-name>`.
13. **Celebrate**: Print a trumpet in ASCII art (this is Jess's favorite part)
