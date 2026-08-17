# Spine

The fleet's event hub: Tables, Seats, and one append-only event log per table.
Plain Ruby — Roda (routing only) + Sequel + SQLite + Minitest, no Rails. See
`SEAMAP.md` for the map, `../../.scratch/spine-roda-rewrite/spec.md` for why this is a
rewrite from Rails, and `../../notes/DESIGN-event-contract-v0.md` for the contract this
service enforces (schemas in `../../contracts/`).

**Current status:** `GET /up`; idempotent, fully administered `POST /join`; contract-
validated event ingestion (`POST /tables/:table_id/events`); live outbound delivery over
SSE (`GET /tables/:table_id/events/stream`); and `/admin/tables` for reading the log.
Joining records both seat identity and decoration in the Spine, then best-effort notifies
the Tabletop without risking the committed join.

## Run locally

```sh
PORT=4600 ./run     # sources repo-root .be then .env (order matters for telemetry)
```

The root fleet runner supplies `TABLETOP_URL` (server-to-server notification) and
`TABLETOP_PUBLIC_URL` (the returned table link). Standalone runs default the public link
to `http://localhost:5180`; without `TABLETOP_URL`, joins still commit but notification is
recorded as `missing_config` on the request span.

- Health: `GET /up`
- Live event feed: `GET /tables/:table_id/events/stream` (Server-Sent Events, one
  stream per table)

## Tests

```sh
bin/test     # Minitest, via `rake test`
```

No mocks — fakes only (repo rule).

## Deploy

Run `./deploy.sh` from this directory. It builds the Roda service, applies `k8s/`, waits
for rollout, and records a deploy marker.
