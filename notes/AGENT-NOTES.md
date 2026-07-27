# Agent Notes

Gotchas learned the hard way while working in this repo. Append as you learn; delete
entries that stop being true. Things that belong in `CLAUDE.md` (standing instructions,
commands, layout) go there instead — this file is for the "oh, *that's* why" findings.

## Don't source `.be` from `./run`

`.be` at the repo root exports `HONEYCOMB_API_KEY` — but it also runs
`kubectl config use-context orion`. Sourcing it has a **side effect on your kubectl
context**, which is fine on `cd` (Jess's shell hook) and fine in `verify.sh`, but wrong
for every ordinary app start. So `./run` deliberately does *not* source it. If telemetry
401s from a hand-started server, source `.be` in your shell first, then `.env`.

_2026-07-27, during the monorepo restructure._

## npm workspaces put the lockfile at the root, which moves the Docker build context

`package-lock.json` lives at the repo root, so `npm ci` cannot run against
`apps/shuffler/` alone. The Docker **build context is the repo root** even though the
Dockerfile lives in `apps/shuffler/` (`docker build -f Dockerfile ../..`). The runtime
stage flattens the workspace back to `/app`, so the image, `run-in-docker`, the WORKDIR,
and the k8s manifests are all unchanged from before the restructure. If you ever see
`npm ci` fail in the image with a missing lockfile, this is why.

_2026-07-27._

## Two agents can be in this working tree at once

Untracked directories may appear mid-session that are not yours (`services/spine/...`
showed up while the restructure was in flight — a different chat window). **Never
`git add -A` blindly.** Stage the files you touched by name, or check `git status`
against your own change list before committing.

_2026-07-27._

## The deck-selection page is `/choose-any-deck`

Not `/choose`. Routes are declared in `src/app.ts`; the site pages are `/`, `/docs`,
`/about`, `/history`, `/choose-any-deck`, and the play pages are `/prepare/:prepId` and
`/game/:gameId`. Curling `/choose` gets you a 404 that looks like a regression and isn't.

_2026-07-27._

## Tabletop gotchas (apps/tabletop)

- **tldraw is pinned exactly** (5.2.5 line, no caret): `room.updateStore` (server-side
  shape injection) is a young API, verified in `test/updateStore.test.ts`. Don't let a
  routine dependency bump float it.
- **Ports**: dev/prod server 5180, `verify.sh` runs its own on 5183. The Shuffler's
  tests use 3344/3001, the Spine 4600 — keep them distinct.
- **Rooms are in-memory**: restarting the server (or redeploying — `Recreate`, one
  replica) wipes every board. Not a bug in v0; durable reconstruction is a tracked buoy.
- **Browser spans don't go to the server**: they go to a collector. In prod that's
  same-origin `/v1/traces`, ALB-routed to the `mtg-tabletop-collector` deployment;
  locally `otel-collector-local.yaml` or the `local`-env key fallback. If browser spans
  vanish, check `BROWSER_OTLP_TRACES_URL` before suspecting the web SDK.
- **Card shapes carry no trace context**: correlation is by `card.instance_id` span
  attribute (traces follow requests; cards persist). Don't add a traceparent to
  `shape.meta`.

_2026-07-27, Tabletop v0._
