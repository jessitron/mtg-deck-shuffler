# Spine

The fleet's event hub: Tables, Seats, and one append-only event log per table.
Ruby on Rails + SQLite. See `SEAMAP.md` for the map and
`../../notes/DESIGN-event-contract-v0.md` for the contract this service enforces
(schemas in `../../contracts/`).

## Run locally

```sh
PORT=4600 ./run     # sources repo-root .be then .env (order matters for telemetry)
```

- Admin screen: http://localhost:4600/admin/tables — a table's log, human-readably,
  each event linking to its Honeycomb trace.
- Health: `GET /up`

## API (v0)

- `POST /tables` `{ "name": "...", "creator": "..." }` — Spine mints the tableId,
  appends `table.created`. 409 if an active table already has that name.
- `GET /tables/lookup?name=...` — join by name: returns `{ tableId, name, seats }`.
- `POST /tables/:table_id/seats` `{ "seat": 1..4, "playerName": "..." }` — take a
  seat; Spine mints the seatId, appends `seat.taken`.
- `POST /tables/:table_id/events` — ingest a contract event (envelope v1).
  Validated against `contracts/` on receipt; unknown name/version fails loudly
  (422). Duplicate sender `id` is elided (returns the already-accepted event).
  Spine assigns `seq` and `acceptedAt`; senders must not.

## Tests

```sh
bin/rails test
```

No mocks — fakes only (repo rule). Domain tests cover the log invariants
(append-only, per-table monotonic seq, dedup, loud schema failure); integration
tests cover ingestion and the admin screen.

## Deploy

`./deploy.sh` — mirrors the Shuffler's: ECR + EKS, manifests in `k8s/`,
hostname spine.jessitron.honeydemo.io, SQLite on a PVC at /data.
