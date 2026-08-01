# Interactions — the fleet is observable

_Distilled edges; the full story (violation inventory, history, per-ship wiring table) is in `README.md`._

## Depends on

- **`.be`-before-`.env` source order** — `HONEYCOMB_API_KEY` lives in repo-root `.be`; each ship's `.env` interpolates it at source time. Wrong order → silent 401 export.
- **OTel dependency versions and the ESM `--import` loader** (Shuffler, Tabletop) — the `-r` require hook silently fails to patch `import`ed modules.
- **Express instrumentation config** — `ignoreLayersType: [MIDDLEWARE]` keeps traces at 2 spans, not 8.
- **Samplers reading both semconv spellings** (`http.user_agent`/`user_agent.original`, `http.target`/`url.path`) — a sampler that stops matching fails open, silently.
- **The Tabletop's browser collector** (`apps/tabletop/k8s/collector.yaml`, same-origin `/v1/traces`) — keyless browser export.
- **Auto-instrumentation carrying the trace** — the Shuffler creates zero manual spans; everything hangs off the ambient request span.
- **The NodeSDK owning logs as well as traces** (`logRecordProcessors`) — that shared wiring is what gives log records the same resource (`service.name`, so the same dataset) and shutdown path as spans. It also means `OTEL_LOGS_EXPORTER` is inert on those ships.

## Depended on by

- **Every production diagnosis** — the North Star includes "when something breaks, Honeycomb shows you why."
- **The Spine's `/admin/tables`** — renders per-event Honeycomb trace links; assumes trace context propagates Shuffler → Spine (Rack extracts W3C headers).
- **`verify.sh` telemetry checks** and the "app is up" confirmation from 1%-sampled probe traces.
- **Correlating behaviour with releases** — `scripts/deploy-marker.sh` puts a `deploy` marker on every graph in env `mtg-deck-shuffler`. Local `deploy-*` git tags are never pushed, so the marker is the durable record of what shipped when.
- **Safe Harbor's "deployed and observable in Honeycomb"** — that claim should ship with a link. Honeycomb query runs and viewed traces never expire, so the URL is a permanent citation (README → Evidence).

## Watch points

- **Editing any `run`/`verify.sh`/`deploy.sh`**: preserve `.be`-then-`.env` sourcing. Exception: `apps/shuffler/run` deliberately skips `.be` (documented in `notes/AGENT-NOTES.md`) — don't "fix" it. **All three `deploy.sh` DO source `.be`** (the Shuffler's since 2026-08-01) because the deploy marker's key lives there; that is not the `run` exception and shouldn't be "made consistent" with it.
- **Reaching for `HONEYCOMB_API_KEY`**: it is the **`local`** environment's ingest key, `createDatasets` access only. It cannot write markers and it targets the wrong environment. Markers use `HONEYCOMB_MARKER_KEY` (env `mtg-deck-shuffler`). Check any key with `GET https://api.honeycomb.io/1/auth`; **writing to the wrong environment succeeds silently.** See README → How it works now.
- **Touching `scripts/deploy-marker.sh` or its callers**: keep it *after* `kubectl rollout status` (a marker should mean a deploy that landed) and keep it non-fatal (`|| true`) — the deploy is already done, so a marker problem must not report as a deploy failure. Keep the `/1/auth` environment guard; it exists because the failure it prevents is invisible.
- **Adding a new telemetry init path, or a fourth ship**: once JES-139 lands, it must carry the deployed version as a resource attribute (README → Invariant 5). Until then, note that no span identifies its build.
- **Upgrading `@opentelemetry/*`**: bare `GET` spans with no `http.route` afterward = ESM patching broke. Check the loader wiring (`node --import`, `register(...)`).
- **Touching `apps/shuffler/src/telemetry-sampler.ts`**: keep `test/telemetry-sampler.test.ts` passing and meaningful — the previous inline sampler was silently broken for months (see README → History).
- **Recording that something happened**: never `span.addEvent`. Attributes on the span you're in — always the first choice — or, when there's no span to hang it on, `log.info/warn/error` from that ship's `log.ts`. The two Node ships have that; the Spine (JES-137) and the browser (JES-136) don't yet. Violation inventory in README.
- **Touching either Node ship's `log.ts` or its `logRecordProcessors`**: the two ships are on different OTel version lines (0.219 / 0.221) with **incompatible constructor signatures** for the same classes. Don't paste between ships; run both ships' tests. Wrong shape = silent no-export.
- **Adding logging to a hot path**: logs are not sampled, on purpose. That's affordable only because nothing logs per-request. If you're about to, put it on the span instead — or reopen the sampling question deliberately (README → Invariant 2).
- **Adding HTTP middleware or changing routes**: confirm spans still get `http.route` and the route-param stamping (`stampRouteParamsOnSpan`) still fires.
- **A new service/ship**: OTel from its first commit (`notes/add-opentelemetry.md` is the runbook).
- **Callbacks and timers**: they outlive the span that scheduled them. AsyncLocalStorage still hands you the *context*, so `getActiveSpan()` returns an **ended** span — `addEvent` throws there rather than no-op'ing. Use a log; it still carries the trace id, so it lands on the trace anyway. (`rooms.ts` was the worked example; fixed in JES-136, kept in README as the argument.)

## Not related to

- **The Honeycomb MCP server config** (`honeycomb-modernity`) — that's the query side; this owner guards the emit side.
- **The Shuffler's clipboard/tabletop send flow** — its failure handling is Table Mode's business; only its spans are mine.
