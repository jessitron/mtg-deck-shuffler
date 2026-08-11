# Spine

The fleet's event hub: Tables, Seats, and one append-only event log per table.
Plain Ruby — Roda (routing only) + Sequel + SQLite + Minitest, no Rails. See
`SEAMAP.md` for the map, `../../.scratch/spine-roda-rewrite/spec.md` for why this is a
rewrite from Rails, and `../../notes/DESIGN-event-contract-v0.md` for the contract this
service enforces (schemas in `../../contracts/`).

**Current status: boot only.** `GET /up`, OTel wired at 100% sampling, an empty SQLite
DB connected. No tables/seats/events domain logic yet — see
`../../.scratch/spine-roda-rewrite/issues/` for what's next.

## Run locally

```sh
PORT=4600 ./run     # sources repo-root .be then .env (order matters for telemetry)
```

- Health: `GET /up`

## Tests

```sh
bin/test     # Minitest, via `rake test`
```

No mocks — fakes only (repo rule).

## Deploy

`./deploy.sh` doesn't exist yet for this stack — the Rails app's Docker/k8s setup was
deleted along with the rest of it. Nothing in production depends on the Spine yet, so
this is deliberately deferred until the app is functionally ready to wire in (see the
rewrite spec's Out of Scope).
