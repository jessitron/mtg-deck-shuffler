# CLAUDE.md — the Spine

Guidance for Claude Code when working in `services/spine/`. Fleet-level guidance
(owners, workflow, telemetry key sourcing) is in the repo-root `CLAUDE.md`.

This ship's seamap: `SEAMAP.md` (in this directory).

**All paths in this file are relative to `services/spine/`**, except `contracts/`, which
is explicitly called out as repo-root below.

**Stay in this ship.** Don't edit files outside `services/spine/` (`contracts/` is fair
game when a contract change is the explicit point of the task). If finishing the task
needs a change in the Shuffler or the Tabletop, stop and say so instead of reaching across
— that's a cross-ship task, and it deserves its own look at both ships' `CLAUDE.md`s.

## What this is

Plain Ruby: Roda for routing (no Rails-style MVC), Sequel for persistence (not
ActiveRecord), SQLite, Minitest. Rewritten from a Rails 8 app for the reasons in
`.scratch/spine-roda-rewrite/spec.md` (repo root) — Jess wants to learn plain Ruby, and
Rails' magic was in the way of seeing where things actually happen.

`GET /up` for health, OTel wired at 100% sampling. `POST /join` (`{name, playerName}` →
`{tableId, seatNumber}`) creates a table on an unseen name and always takes a seat —
domain logic lives in `models/table.rb` (`Table`, `Seat`, `Event`, all `Sequel::Model`),
schema in `config/db.rb`. `POST /tables/:table_id/events` is the generic ingestion
endpoint: contract-validated against `contracts/` via `lib/event_contract.rb`
(json_schemer, envelope v3), dedups on the sender's event id, assigns `seq`/`acceptedAt`
server-side. SSE outbound delivery and the admin screen land in later tickets — see
`.scratch/spine-roda-rewrite/issues/`.

See `README.md` (in this directory) for more.

## Commands

All from `services/spine/`:

- `PORT=4600 ./run` — start locally (sources repo-root `.be` before `.env`,
  same telemetry rule as the Shuffler — see the root `CLAUDE.md` → Observability)
- `bin/test` — tests (Minitest, via `rake test`)
- `./deploy.sh` — deploy to spine.jessitron.honeydemo.io (not yet rebuilt for this
  stack — see the rewrite spec's Out of Scope)

To run the whole fleet (Spine + Tabletop + Shuffler together), use `./run` from the
repo root — see the root `CLAUDE.md`.

## Observability

Fleet-level Honeycomb setup is in the root `CLAUDE.md`. Spine specifics:

- **Sampling**: 100%, no down-sampling. The old `BackgroundChatterSampler`
  (`TelemetrySampler::BackgroundChatterSampler`, 1% of `/up` health-check traffic) was
  deliberately not ported — it's documented as broken, and the rewrite spec explicitly
  says start at 100% and revisit once start/stop behavior is confirmed clean.
- **Wiring**: `config/telemetry.rb`, required first thing in `app.rb`. Uses
  `OpenTelemetry::SDK.configure` with `opentelemetry-exporter-otlp` (env-var driven,
  same `OTEL_EXPORTER_OTLP_*` vars as the other ships) and
  `opentelemetry-instrumentation-rack`.
- **Rack instrumentation needs an explicit `use`.** Unlike Rails (which has a railtie
  hook), Roda/Rack has no auto-injection point — the instrumentation gem only
  *registers* itself; the app still has to mount its middleware. `app.rb` does this via
  `use(*OpenTelemetry::Instrumentation::Rack::Instrumentation.instance.middleware_args)`.
  Skip this and requests boot fine but produce zero spans — no error, just silence. If a
  future OTel-instrumented gem shows the same "installed successfully, no spans"
  symptom, check whether it's Rack-style (needs manual `use`) vs Rails-style (auto).
- **`traceparent` never rides in the envelope** (contract v3, ticket 04). Inbound, the
  Rack instrumentation extracts it from the HTTP header automatically — no code needed
  for `POST /tables/:table_id/events` to continue a sender's trace. The persisted
  `Event` row has no trace column at all: trace context is observability-only and
  expires (~60d), so it's deliberately not durable. This means an event minted before
  someone's watching its table's SSE stream (ticket 05) has no way to link back to the
  trace that created it — accepted tradeoff, not a bug (see
  `.scratch/spine-roda-rewrite/spec.md`, "Trace context — envelope contract change").

Update this file when anything in it changes.
