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

Ruby on Rails 8 + SQLite. Tables, seats, one append-only event log per table;
ingestion validates against `contracts/` (repo root) and fails loudly.
Admin screen (a table's log, with Honeycomb trace links) at `/admin/tables`.

See `README.md` (in this directory) for more.

## Commands

All from `services/spine/`:

- `PORT=4600 ./run` — start locally (sources repo-root `.be` before `.env`,
  same telemetry rule as the Shuffler — see the root `CLAUDE.md` → Observability)
- `bin/rails test` — tests
- `./deploy.sh` — deploy to spine.jessitron.honeydemo.io

To run the whole fleet (Spine + Tabletop + Shuffler together), use `./run` from the
repo root — see the root `CLAUDE.md`.

## Observability

Fleet-level Honeycomb setup is in the root `CLAUDE.md`. Spine specifics:

- **Sampling**: `lib/telemetry_sampler.rb` (`TelemetrySampler::BackgroundChatterSampler`)
  keeps 1% of `/up` health-check traffic (k8s liveness/readiness — see `k8s/deployment.yaml`)
  and 100% of everything else — ported from the Shuffler's
  `apps/shuffler/src/telemetry-sampler.ts`. Wired in
  `config/initializers/opentelemetry.rb` via `OpenTelemetry.tracer_provider.sampler =`
  right after `OpenTelemetry::SDK.configure` runs — the SDK's Configurator has no
  in-block sampler option for a custom `Sampler` object; `TracerProvider#sampler` is a
  plain `attr_accessor`, so setting it once `OpenTelemetry.tracer_provider` exists is the
  supported way in. Unit tested in `test/lib/telemetry_sampler_test.rb`.

Update this file when anything in it changes.
