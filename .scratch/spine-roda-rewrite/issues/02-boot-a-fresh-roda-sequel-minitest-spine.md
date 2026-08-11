# 02 — Boot a fresh Roda + Sequel + Minitest Spine, telemetry wired

Mountain: spine-tells-the-story
Ship: spine
Status: done

**What to build:** A new `services/spine` app exists — Roda for routing (routing only,
no Rails-style MVC), Sequel for persistence, SQLite (unchanged), Minitest for tests. It
starts locally via `PORT=4600 ./run` (sourcing repo-root `.be` before `.env`, same rule
as the other ships), connects to an empty SQLite database, and every request emits an
OTel trace to Honeycomb at 100% sampling — no `BackgroundChatterSampler`-style
down-sampling ported over. No `ApplicationJob`-equivalent. No domain logic (tables,
seats, events) yet — that starts in ticket 03. The root `./run` script now starts this
app instead of skipping Spine.

**Blocked by:** 01

- [ ] `services/spine` is a Roda + Sequel + SQLite + Minitest app (no Rails)
- [ ] `PORT=4600 ./run` from `services/spine/` starts the app against an empty SQLite DB
- [ ] The root `./run` starts this Spine alongside the Shuffler and Tabletop (no more
      skip-Spine log line from ticket 01)
- [ ] A request against the running app produces a trace in Honeycomb (environment
      `local`), sampled at 100%
- [ ] `bin/rails test`'s Minitest-equivalent test command runs (even if just a smoke
      test) and passes
