# PLAN: Monorepo restructure (Phase 0 of the Table Vision)

_Handoff plan, written 2026-07-27, for an agent executing this without the design
conversation in context. Read `notes/DESIGN-the-table-vision.md` (the why) and the
root `SEAMAP.md` (the fleet map) first. This plan moves the Shuffler into
`apps/shuffler/` and sets up npm workspaces. It does NOT build the Tabletop or Spine._

## Goal

This repo becomes a polyglot monorepo. The existing app (the Shuffler) moves intact
into `apps/shuffler/`; the repo root becomes fleet-level. When done, everything the
Shuffler could do before, it still does: build, tests, Playwright verification,
local `./run`, Docker build, and EKS deploy (Safe Harbor requires the app stays
deployable).

## Target layout

```
/                      # fleet level
  SEAMAP.md            # fleet map (already exists)
  CLAUDE.md            # update path references (see below)
  README.md            # update: this is now a monorepo
  package.json         # NEW: workspaces root, pass-through scripts
  notes/               # stays at root (spans components)
  .claude/             # stays at root
  apps/
    shuffler/          # SEAMAP.md already there; everything below moves in
      package.json, package-lock.json, tsconfig.json
      jest.config.js, playwright.config.ts
      src/  test/  views/  public/  decks/
      run  run-in-docker  verify.sh  verify-container-boot.sh
      Dockerfile  deploy.sh  cleanup-deployment.sh  k8s/
      tracing.js       # probably vestigial — see gotcha 4
    tabletop/          # SEAMAP.md only (ship not built yet)
  services/
    spine/             # SEAMAP.md only (ship not built yet)
```

Generated/local junk does not move; it gets regenerated or ignored: `dist/`,
`node_modules/`, `test-results/`, `tmp/`, `data.db`, `data.db.old`.

`AGENTS.md` at root: read it; if it duplicates CLAUDE.md pointers, update its paths
the same way.

## Constraints

- **One coherent commit per step**, on main, tagged `- claude` per the user's
  conventions. The app must build and pass tests at every commit.
- Use `git mv` for tracked files so history follows.
- Untracked local files (`.env`, `.be` if present, `data.db`) are NOT in git —
  handle per gotcha 3, and never commit them.
- Do not redesign anything. This is a move, not a refactor. Resist cleanup
  temptations except where a path literally breaks.

## Steps

### Step 1: Move the app

- `mkdir -p apps/shuffler` (SEAMAP.md is already in it), `git mv` the directories and
  files listed in the target layout into `apps/shuffler/`.
- Create the new root `package.json`:
  - `"private": true`, `"workspaces": ["apps/*"]`
  - Pass-through scripts so root-level muscle memory works, e.g.
    `"build": "npm run build --workspace apps/shuffler"`, same for `test`,
    `clean`, `start`, and the deck scripts (`deck:download`,
    `decks:backfill-images`, `decks:backfill-set-names`, `precons:fetch-mtgjson`,
    `card:inspect`).
- The app's own `package.json` keeps its name `mtg-deck-shuffler` and all scripts
  unchanged.
- `rm -rf node_modules dist` at root, `npm install` from root (workspaces hoists;
  `better-sqlite3` is native — confirm it rebuilds).
- Check `.gitignore`: entries like `dist/`, `data.db`, `tmp/`, `test-results/`
  may be root-anchored; make them match both root and `apps/shuffler/`.
- Verify: `npm run build` and `npm test` from root AND from `apps/shuffler/`.
- Commit.

### Step 2: Scripts and local run

- `run`: sources `.env` from cwd — works if run from `apps/shuffler/` once `.env`
  is there (gotcha 3). Keep it that way; the convention becomes "run the shuffler
  from its own directory."
- `verify.sh`: sources `.be` then `.env` from cwd (ORDER MATTERS — see gotcha 2),
  runs the server and `npx playwright test`. Works from `apps/shuffler/` unchanged
  once local files are in place; confirm `playwright.config.ts` has no root-relative
  paths.
- `verify-container-boot.sh` and `cleanup-deployment.sh`: read them, fix any paths.
- Verify: `PORT=3344 ./run` from `apps/shuffler/` — app starts, click through
  home → choose → prepare → game. Then `./verify.sh` passes.
- Commit (if any script changes were needed).

### Step 3: Docker and deploy

- `Dockerfile` now lives in `apps/shuffler/` and its COPY paths (`src/`, `views/`,
  `public/`, `decks/`, `run-in-docker`, `package*.json`, `tsconfig.json`) are all
  app-relative — so building **with `apps/shuffler/` as the build context** needs no
  Dockerfile edits: `docker build` runs from `apps/shuffler/`.
  - One wrinkle: `npm ci` inside the container against the app's `package.json` —
    with workspaces, the authoritative `package-lock.json` may live at the ROOT.
    Options: (a) keep a lockfile in `apps/shuffler/` if npm allows the split, or
    (b) COPY the root lockfile into the image build. Investigate, pick the simplest
    thing that gives reproducible `npm ci`, and document the choice in the
    Dockerfile comment.
- `deploy.sh` (now in `apps/shuffler/`): it sources `.env`, runs `npm run clean` /
  `npm run build`, `docker build ... .` and `kubectl apply -f k8s/...` — all
  correct relative to `apps/shuffler/` as cwd. It also runs `git rev-parse` and
  `git tag`, which work fine from a subdirectory.
- `k8s/` manifests: no path assumptions expected (they reference images and
  cluster resources), but read them to confirm.
- Verify: `docker build --platform=linux/arm64` succeeds from `apps/shuffler/`;
  `./verify-container-boot.sh` (or equivalent) passes. Do NOT run an actual EKS
  deploy unless Jess asks — but leave `deploy.sh` demonstrably runnable.
- Commit.

### Step 4: Docs and pointers

- Root `CLAUDE.md`: Key Files, Development Commands, Testing sections all reference
  root-relative paths (`src/app.ts`, `views/`, `public/site.css`, `./run`). Update
  to `apps/shuffler/`-relative, or state the convention once: "Shuffler paths are
  relative to `apps/shuffler/`." Also update "Use `PORT=3344 ./run`" instructions
  to mention cwd.
- Consider an `apps/shuffler/CLAUDE.md` for shuffler-specific guidance, keeping the
  root CLAUDE.md fleet-level — nice-to-have, Jess's call, skip if unsure.
- Root `README.md`: describe the monorepo and the fleet; point into the ships.
- `notes/`: sweep for path references that break (e.g. `notes/DEPLOYMENT.md` says
  the app is at repo root; feature-owner docs under `notes/features/` reference
  `src/...`). Either update paths or add a convention note at the top of
  `notes/README`-ish docs. `.claude/skills/*` are symlinks into `notes/features/`
  — confirm the symlinks still resolve (they're root-relative, should be fine).
- Update `notes/DEPLOYMENT.md` for the new build context.
- Remove the "(The component directories are being born...)" parenthetical from the
  root `SEAMAP.md` and the "code still lives at the repo root" note from
  `apps/shuffler/SEAMAP.md` — after this restructure they're no longer true.
- Commit.

## Gotchas (learned from reading the actual files)

1. **`start` script runs `node --import ./dist/tracing.js dist/server.js`** — that's
   the COMPILED `src/tracing.ts`. Fine after the move; nothing to change.
2. **`.be` before `.env`, always.** `.env` sets
   `OTEL_EXPORTER_OTLP_HEADERS="x-honeycomb-team=$HONEYCOMB_API_KEY"` which
   interpolates AT SOURCE TIME; the key is defined in `.be`. Wrong order = telemetry
   silently 401s. `verify.sh` already does this correctly — preserve it.
3. **Untracked local files must be moved by hand** (plain `mv`, not `git mv`):
   `.env` → `apps/shuffler/.env`, and `data.db` if Jess wants to keep current local
   game state (otherwise it regenerates). `.be` is sourced on `cd` into the repo dir
   (a shell hook outside this repo) — check whether `.be` lives at root; if so,
   LEAVE it at root and confirm `verify.sh`'s `[ -f .be ]` fallback still finds what
   it needs (the shell hook may have already exported the key on cd; if not, source
   `../../.be`). Tell Jess what you did with these files — she uses multiple
   computers and will need to repeat it on the others.
4. **Root `tracing.js` is probably vestigial** (there's `src/tracing.ts`, and
   `npm start` uses the dist version). Check for references (`grep -r tracing.js`
   in scripts, Dockerfile, k8s configmap); if truly unused, delete it in its own
   small commit and say so.
5. **`data.db` is created in the server's cwd.** After the move, running from
   `apps/shuffler/` puts it there. The k8s PVC mounts it inside the container —
   check `k8s/deployment.yaml` volume mount path against the container's WORKDIR;
   the Dockerfile WORKDIR stays `/app`, so nothing should change, but confirm.
6. **Port 3344 for manual testing** (Jess's testing server may hold the default
   3333). `verify.sh` uses 3001.

## Verification checklist (Safe Harbor)

From `apps/shuffler/` unless noted:

- [ ] `npm run build` clean
- [ ] `npm test` green (also green when run from the root)
- [ ] `./verify.sh` green (Playwright)
- [ ] `PORT=3344 ./run` — click through home → choose a deck → prepare → play a few
      cards
- [ ] `docker build` succeeds; container boots (`verify-container-boot.sh`)
- [ ] `git log` tells the story in coherent steps; no stray generated files committed
- [ ] Docs updated: CLAUDE.md, README.md, DEPLOYMENT.md, seamap parentheticals
      removed

## Out of scope (do not do)

- Building anything in `apps/tabletop/` or `services/spine/` beyond the SEAMAP.md
  files already there.
- Creating `contracts/`.
- Renaming the app, its routes, or its domain language.
- Refactoring code, CSS cleanup, dependency upgrades.
- An actual EKS deploy (leave it runnable; Jess triggers real deploys).
