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
(json_schemer, envelope v1), dedups on the sender's event id, assigns `seq`/`acceptedAt`
server-side. `GET /tables/:table_id/events/stream` is the outbound side: one SSE stream
per table, fed by `lib/table_broadcaster.rb` (a plain-Ruby pub/sub object every
`Table#append_event!`/`#mint_event!` publishes to after its transaction commits) and
formatted into `data:` frames by `lib/sse_stream.rb`. `GET /admin/tables` and
`GET /admin/tables/:id` are the developer's window into the log: plain ERB views
(`views/admin/tables/*.html.erb`, rendered by `lib/admin_view.rb` — no Tilt/Rails
render plugin, just `ERB.new(...).result(binding)`), no framework helpers. The show
page's page load renders the log as it stands, then a plain `<script>` block opens an
`EventSource` on that table's SSE stream (dogfooding ticket 05's delivery mechanism)
and appends new rows as they arrive, building each row's Honeycomb trace link
client-side from that message's `event.traceparent` — see Observability below.

See `README.md` (in this directory) for more.

## Commands

All from `services/spine/`:

- `PORT=4600 ./run` — start locally (sources repo-root `.be` before `.env`,
  same telemetry rule as the Shuffler — see the root `CLAUDE.md` → Observability)
- `bin/test` — tests (Minitest, via `rake test`)
- `./deploy.sh` — deploy to `mtg.jessitron.honeydemo.io/spine`, behind the same ALB
  as the Shuffler (`apps/shuffler/k8s/ingress.yaml`), not its own subdomain. Builds
  `Dockerfile` (context is the repo root — needs `contracts/`), applies `k8s/`
  (`deployment.yaml`, `pvc.yaml` — 2Gi gp3, `ReadWriteOnce`, mounted at `/data`
  as `SPINE_DB_PATH` — `service.yaml`, `ingress.yaml`), waits for rollout, posts a
  Honeycomb deploy marker. See "Base path" below for why `/spine` needed an app change,
  not just an ingress rule.
- `bin/pull-prod-db [destination]` — copy the live `/data/spine.db` down from the
  running prod pod via `kubectl cp` (a snapshot, not a live connection — see the
  script's comment on why a mid-write copy is still safe to read). Default
  destination is `spine-prod-<timestamp>.db` in the current directory.

## Base path (`SPINE_BASE_PATH`)

AWS ALB ingress can't strip a path prefix (no rewrite-target support the way
nginx-ingress has), so serving the Spine at `mtg.jessitron.honeydemo.io/spine`
meant the app itself has to answer under that prefix — both the external ALB
request and the Shuffler's in-cluster `SPINE_URL` call, since a request to
`spine-service` never goes through the ALB at all. `app.rb` reads
`SPINE_BASE_PATH` (unset locally, `/spine` in prod — `k8s/configmap.yaml`) and
wraps the whole route table in `r.on(prefix)` when it's set; `dispatch(r)`
holds the actual routes so both cases (`base_path.empty?` vs not) reach the
same route definitions. The admin views (`views/admin/tables/*.html.erb`) take
`@base_path` as a local and prefix every hardcoded link, the SSE `streamUrl`,
and the `<script src="...hny.js">` tag — anything rendered as an absolute
path breaks once real traffic arrives with a prefix the browser doesn't know
to add back. `services/spine/k8s/ingress.yaml`'s `group.order: "1"` (paired
with `apps/shuffler/k8s/ingress.yaml`'s `group.order: "1000"`) makes sure
`/spine` is evaluated before the Shuffler's catch-all `/` — ALB doesn't
auto-sort merged-group rules by path specificity, so this must be explicit.

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
- **`traceparent` rides on the envelope itself, as an optional field** (`contracts/envelope.v1.json`
  — reset from v3 on `schema-schemes`, 2026-08-16). Inbound, the Rack instrumentation
  still extracts a header-carried `traceparent` automatically — no code needed for
  `POST /tables/:table_id/events` to continue a sender's trace — but a sender may also
  put it in the body, which matters once events travel a path with no header at all
  (the outbound SSE stream, or a future batched `sendEvent`). It's optional and never
  validated for correctness: tracing is best-effort and must never be the reason an
  event is rejected. The persisted `Event` row still has no trace column at all —
  `Event#as_envelope` never includes `traceparent` — trace context is
  observability-only and expires (~60d), so it's deliberately not durable. This means
  an event minted before someone's watching its table's SSE stream (ticket 05) has no
  way to link back to the trace that created it — accepted tradeoff, not a bug (see
  `.scratch/spine-roda-rewrite/spec.md`, "Trace context — envelope contract change").
- **Outbound, trace context is inlined onto the broadcast envelope, fresh each time.**
  `GET /tables/:table_id/events/stream` delivers `{event: {...«envelope fields»,
  traceparent}}` — no separate wrapper. `Table#broadcast` (private, `models/table.rb`)
  captures the *appending* request's trace context via `OpenTelemetry.propagation.inject`
  at the moment the event is created, deferred via `DB.after_commit`, and merges it onto
  `event.as_envelope` — so a subscriber's own spans can link back to whichever trace
  actually produced the event, and a rolled-back append never reaches a subscriber at
  all.
- **The admin show page builds trace links client-side, not server-side.** The `Event`
  row has no trace column (see above), so a page-load render of existing rows has
  nothing to link from — only rows arriving live over the SSE stream carry
  `event.traceparent`, and only those get a "trace" link, built in the browser by
  `views/admin/tables/show.html.erb`'s inline script (`traceparent.split("-")[1]` is
  the trace id; team/env slugs come from `HONEYCOMB_TEAM_SLUG`/`HONEYCOMB_ENV_SLUG`,
  defaulting to `modernity`/`local`, injected into the page at render time). Rows
  already in the log when the page opened render with an empty trace cell — expected,
  not a bug, per the rewrite spec's "Trace context — envelope contract change".

Update this file when anything in it changes.
