# Spine

The fleet's event hub: Tables, Seats, and one append-only event log per table.
Plain Ruby — Roda (routing only) + Sequel + SQLite + Minitest, no Rails. See
`SEAMAP.md` for the map, `../../.scratch/spine-roda-rewrite/spec.md` for why this is a
rewrite from Rails, and `../../notes/DESIGN-event-contract-v0.md` for the contract this
service enforces (schemas in `../../contracts/`).

**Current status:** `GET /up`, OTel wired at 100% sampling, join-by-name
(`POST /join`), contract-validated event ingestion (`POST /tables/:table_id/events`),
and live outbound delivery over SSE (`GET /tables/:table_id/events/stream`). No admin
screen yet — see `../../.scratch/spine-roda-rewrite/issues/` for what's next.

## Run locally

```sh
PORT=4600 ./run     # sources repo-root .be then .env (order matters for telemetry)
```

- Health: `GET /up`
- Live event feed: `GET /tables/:table_id/events/stream` (Server-Sent Events, one
  stream per table)

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
