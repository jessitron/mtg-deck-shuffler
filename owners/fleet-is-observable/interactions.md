# Interactions — the fleet is observable

_Distilled edges; the full story (violation inventory, history, per-ship wiring table) is in `README.md`._

## Depends on

- **`.be`-before-`.env` source order** — `HONEYCOMB_API_KEY` lives in repo-root `.be`; each ship's `.env` interpolates it at source time. Wrong order → silent 401 export.
- **OTel dependency versions and the ESM `--import` loader** (Shuffler, Tabletop) — the `-r` require hook silently fails to patch `import`ed modules.
- **Express instrumentation config** — `ignoreLayersType: [MIDDLEWARE]` keeps traces at 2 spans, not 8.
- **Samplers reading both semconv spellings** (`http.user_agent`/`user_agent.original`, `http.target`/`url.path`) — a sampler that stops matching fails open, silently.
- **The Tabletop's browser collector** (`apps/tabletop/k8s/collector.yaml`, same-origin `/v1/traces`) — keyless browser export.
- **Auto-instrumentation carrying the trace** — the Shuffler creates zero manual spans; everything hangs off the ambient request span.

## Depended on by

- **Every production diagnosis** — the North Star includes "when something breaks, Honeycomb shows you why."
- **The Spine's `/admin/tables`** — renders per-event Honeycomb trace links; assumes trace context propagates Shuffler → Spine (Rack extracts W3C headers).
- **`verify.sh` telemetry checks** and the "app is up" confirmation from 1%-sampled probe traces.

## Watch points

- **Editing any `run`/`verify.sh`/`deploy.sh`**: preserve `.be`-then-`.env` sourcing. Exception: `apps/shuffler/run` deliberately skips `.be` (documented in `notes/AGENT-NOTES.md`) — don't "fix" it.
- **Upgrading `@opentelemetry/*`**: bare `GET` spans with no `http.route` afterward = ESM patching broke. Check the loader wiring (`node --import`, `register(...)`).
- **Touching `apps/shuffler/src/telemetry-sampler.ts`**: keep `test/telemetry-sampler.test.ts` passing and meaningful — the previous inline sampler was silently broken for months (see README → History).
- **Recording that something happened**: never `span.addEvent` — attributes on the span you're in, or a trace-participating log (see README for the caveat: no logs pipeline exists yet). Violation inventory in README.
- **Adding HTTP middleware or changing routes**: confirm spans still get `http.route` and the route-param stamping (`stampRouteParamsOnSpan`) still fires.
- **A new service/ship**: OTel from its first commit (`notes/add-opentelemetry.md` is the runbook).
- **Callbacks and timers**: they have no ambient span; anything recorded there is lost or errors (`rooms.ts` is the live example).

## Not related to

- **The Honeycomb MCP server config** (`honeycomb-modernity`) — that's the query side; this owner guards the emit side.
- **The Shuffler's clipboard/tabletop send flow** — its failure handling is Table Mode's business; only its spans are mine.
