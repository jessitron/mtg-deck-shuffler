# CLAUDE.md — the Spine

Guidance for Claude Code when working in `services/spine/`. Fleet-level guidance
(owners, workflow, telemetry key sourcing) is in the repo-root `CLAUDE.md`.

This ship's seamap: `SEAMAP.md` (in this directory). Architecture, boundaries and
invariants live in the domain map, `../../notes/fleet-domain-map.html`.

**All paths in this file are relative to `services/spine/`**, except `contracts/`, which
is explicitly called out as repo-root below.

**Don't work around a problem that actually belongs in another ship.** If a bug's root
cause lives in the Shuffler or the Tabletop, fix it there — don't paper over it locally
(e.g. loosening a timeout in the Tabletop instead of having this ship send a heartbeat,
which is what actually happened once). Cross-ship work doesn't need a stop-and-ask: say
you're crossing into that ship, then fork a subagent to make the fix there — it should read
that ship's own `CLAUDE.md` before touching anything. Never make another ship's edit inline
yourself, and never settle for a symptomatic fix here when the real fix is elsewhere.

## What this is

Plain Ruby: Roda for routing (no Rails-style MVC), Sequel for persistence (not
ActiveRecord), SQLite, Minitest. Rewritten from a Rails 8 app: Jess wants to learn plain
Ruby, and Rails' magic was in the way of seeing where things happen.

What `/join` and event ingestion promise (join idempotency, Game→Seat at the border,
dedup, `seq`/`acceptedAt`) is on the domain map; here is where it lives in code.
`GET /up` is health. `POST /join`: `lib/join_contract.rb` validates the request against
`contracts/requests/join.v1.json` (a violation is a 400) through the event schema loader
(`EventContract.schema_at`); the join span carries `join.request_id`. The
`seats.join_request_id` column was `game_id`; `config/db.rb` renames it (and its unique
index) on startup, keeping existing seats. After the response, `lib/tabletop_notifier.rb`
best-effort POSTs `seat.joined` to the Tabletop; delivery failure never rolls back the
join. Domain logic lives in `models/table.rb` (`Table`, `Seat`, `Event`, all
`Sequel::Model`), schema and additive startup migrations in `config/db.rb`.
`POST /tables/:table_id/events` ingests through `lib/event_contract.rb` (json_schemer).
`GET /tables/:table_id/events/stream` is the outbound side: one SSE stream
per table, fed by `lib/table_broadcaster.rb` (a plain-Ruby pub/sub object every
`Table#append_event!`/`#mint_event!` publishes to after its transaction commits) and
formatted into `data:` frames by `lib/sse_stream.rb`. **The stream sends a `: heartbeat\n\n`
comment frame immediately on connect, then again every `HEARTBEAT_INTERVAL_SECONDS` (15s)
while nothing's been published** (`SseStream#each`, via `Queue#pop(timeout:)` — a real message
short-circuits the wait, same as before). Two reasons this exists, both discovered chasing a
"Tabletop doesn't load immediately" bug (2026-08-19): Puma doesn't flush a streamed response's
headers until its body's `each` yields a first chunk, so without the immediate heartbeat a fresh
table with nothing played yet never sent so much as headers; and with no periodic signal at all,
a quiet-but-healthy table is indistinguishable from a hung connection to anyone downstream. Both
`EventSource` (the admin page, below) and the Tabletop's hand-rolled parser
(`apps/tabletop/src/server/spineSubscriber.ts`) already ignore comment lines, so this needed no
client-side parsing change — only the Tabletop's fetch timeouts, which had been disabled outright
before heartbeats existed, went back to being bounded. **Every open SSE stream pins one Puma thread for its whole life** (`SseStream#each`
blocks on `Queue#pop`, a real thread wait, not an event loop), so `config/puma.rb`
sets `threads 8, 64` explicitly — Puma 8/MRI's undeclared default is
`max_threads: 5`, which a single 4-player table (4 Shuffler subscriptions + 1
Tabletop subscription) already reaches, starving `GET /spine/up` of a thread to
run on. That thread starvation, not the shutdown hang below, was the trigger
for a past `ECONNREFUSED` storm (readiness failures pull the pod's endpoint,
which is what produces `ECONNREFUSED` downstream). The pool is raised, not
capped — nothing yet refuses stream #N+1 (`spine-stream-cap-503` in `TODO.md`).

**On shutdown, `config/puma.rb`'s `after_stopped` hook closes every open SSE
stream before Puma waits for in-flight requests to finish** — without it, a
held-open stream never finishes on its own, Puma's graceful shutdown hangs
forever, and Kubernetes `SIGKILL`s the pod. The hook runs inside
Puma's SIGTERM trap itself, where `Mutex#synchronize` is illegal, so it defers
the actual `TableBroadcaster#close_all` call to a `Thread.new` rather than
calling it directly. Both `run` and `Dockerfile`'s `CMD` pass
`-C config/puma.rb` to `bundle exec puma` — keep both in sync if this changes.
A change here can't be trusted from unit tests alone (the crash only
reproduces inside Puma's real signal trap); verify by starting the app for
real, opening an SSE stream, and sending it `SIGTERM`.

`GET /admin/tables` and
`GET /admin/tables/:id` are the developer's window into the log: plain ERB views
(`views/admin/tables/*.html.erb`, rendered by `lib/admin_view.rb` — no Tilt/Rails
render plugin, just `ERB.new(...).result(binding)`), no framework helpers. The show
page's page load renders the log as it stands, then a plain `<script>` block opens an
`EventSource` on that table's SSE stream (dogfooding the delivery mechanism)
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
- Wipe the prod database (a clean break — every table's log is gone):
  `kubectl exec deploy/spine -- sh -c 'rm -f /data/spine.db /data/spine.db-wal /data/spine.db-shm'`
  then `kubectl rollout restart deploy/spine`. Not during a rollout: the `Recreate`
  strategy leaves a gap with no container, and exec fails with `container not found ("spine")`.

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

## Tabletop notification

- `TABLETOP_URL` is the server-to-server base URL used after `/join` commits. Missing,
  invalid, unreachable, timed-out, and non-2xx destinations are all best-effort failures
  recorded on the live join span; the response still succeeds.
- `TABLETOP_PUBLIC_URL` builds `/join`'s returned `/t/<table-slug>` link. Standalone local
  runs default to `http://localhost:5180`; the root fleet runner and production set it.
- Production values live in `k8s/configmap.yaml`; the public URL deliberately uses HTTP
  because the Tabletop ALB has no 443 listener.
- The table id is the `<name-slug>-<8-hex-random>` slug and the Tabletop URL (see the
  domain map). Minted by `TableSlug.mint` (`lib/table_slug.rb`); `table_url` (`app.rb`)
  and `TabletopNotifier#event_uri` only escape `table.id` into a path. `name` keeps its
  own unique constraint (`config/db.rb`), so the `NameTaken` retry in `join_table` covers
  an id collision too — one can only happen alongside a name collision, which raises
  first. `table_url` appends `?seat=<seatId>` so the URL handed to the Shuffler names the
  joining player's seat.

## Observability

Fleet-level Honeycomb setup is in the root `CLAUDE.md`. Spine specifics:

- **Sampling**: `KeepItDownSampler` keeps 1% of production `/spine/up` probes and 100% of
  everything else.
- **Open SSE stream count is a span attribute, not a metric.** `OTEL_METRICS_EXPORTER` is
  unset (`"none"`), and the stream's own request span only exports when the stream *ends*
  (Rack::Events `on_finish`), so open streams were invisible in Honeycomb by construction —
  the `ECONNREFUSED` incident had to be diagnosed from the Tabletop's side instead. `app.rb`'s `route do |r|` block now stamps
  `spine.open_streams` (from `TableBroadcaster#open_stream_count`) on every request span
  before dispatch, so any request made while streams are open carries the count — cheapest
  possible visibility, no metrics pipeline needed.
- **Wiring**: `config/telemetry.rb`, required first thing in `app.rb`. Uses
  `OpenTelemetry::SDK.configure` with `opentelemetry-exporter-otlp` (env-var driven,
  same `OTEL_EXPORTER_OTLP_*` vars as the other ships),
  `opentelemetry-instrumentation-rack`, and `opentelemetry-instrumentation-net_http`.
- **Rack instrumentation needs an explicit `use`.** Unlike Rails (which has a railtie
  hook), Roda/Rack has no auto-injection point — the instrumentation gem only
  *registers* itself; the app still has to mount its middleware. `app.rb` does this via
  `use(*OpenTelemetry::Instrumentation::Rack::Instrumentation.instance.middleware_args)`.
  Skip this and requests boot fine but produce zero spans — no error, just silence. If a
  future OTel-instrumented gem shows the same "installed successfully, no spans"
  symptom, check whether it's Rack-style (needs manual `use`) vs Rails-style (auto).
- **Trace context: header in, envelope field out** (the domain map has the rule). Inbound,
  the Rack instrumentation continues the sender's trace from the HTTP `traceparent`
  header; the Spine ignores any `traceparent` in the envelope body and never persists
  one. Outbound there are two paths, and both inject a fresh `traceparent` into the
  envelope via `OpenTelemetry.propagation.inject`: the SSE broadcast (`Table#broadcast`,
  `models/table.rb`, captured in the appending request's context and deferred to
  `DB.after_commit`, so a rolled-back append reaches no subscriber) and the `seat.joined`
  POST to the Tabletop (`lib/tabletop_notifier.rb`). That POST is also auto-instrumented
  by Net::HTTP, which sets the `traceparent` header; never set it by hand. Header and body
  share a trace id but may name different spans. Delivery outcome is
  `tabletop.send.result`; notifier failures don't mark the `/join` span as failed.
- **The admin show page builds trace links client-side, not server-side.** The `Event`
  row has no trace column (see above), so a page-load render of existing rows has
  nothing to link from — only rows arriving live over the SSE stream carry
  `event.traceparent`, and only those get a "trace" link, built in the browser by
  `views/admin/tables/show.html.erb`'s inline script (`traceparent.split("-")[1]` is
  the trace id; team/env slugs come from `HONEYCOMB_TEAM_SLUG`/`HONEYCOMB_ENV_SLUG`,
  defaulting to `modernity`/`local`, injected into the page at render time). Rows
  already in the log when the page opened render with an empty trace cell — expected,
  not a bug.

Update this file when anything in it changes.
