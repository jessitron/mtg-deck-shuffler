---
name: fleet-is-observable
kind: capability
---

# the fleet is observable

**Consult me when…** you change telemetry wiring, env/secret sourcing, run/deploy scripts, OTel
dependency versions, HTTP middleware, trace-context propagation, or you are about to record
something interesting that happened.

## The point

"Observability is mandatory, from the first commit" is a stated value of this fleet
(`SEAMAP.md` "Observability is mandatory", the comment atop `services/spine/config/initializers/opentelemetry.rb`,
each ship's SEAMAP). The North Star includes **"When something breaks, Honeycomb shows you why."**

What must keep working: **for any interesting thing a user does, there is a trace in Honeycomb that
explains it, and the volume stays affordable.** The trace follows HTTP calls within this app.

## Invariants

### 1. Add great attributes to spans. Favor attributes over additional spans or logs.

Attributes are free in Honeycomb, and they make every span more valuable, because they correlate with each other.
When receiving a request, add all parameters as attributes. Add return values.
When there is a conditional in the code, but the condition in an attribute; this reveals code paths.
There is no PII to worry about in this app.

### 1. Never add events to spans. Create trace-participating logs instead. _(Jess, authoritative)_

Logs arrive before the span ends; they work when there is no active span; and they arrive if the span never ends.
Logs cost the same in Honeycomb, and when they have the trace and Span ID, they show up the same as events.

Some things to fix when we have a chance:

**Worked example — a live violation, deliberately left unfixed as evidence:**
`apps/tabletop/src/server/rooms.ts` (`getOrCreateRoom`) does
`trace.getActiveSpan()?.addEvent("room.session_removed", …)` / `"room.emptied"` inside tldraw's
`onSessionRemoved` callback. That callback fires from tldraw's throttled `pruneSessions` timer,
long after the request span ended. Production logs show, repeatedly:

```
Cannot execute the operation on ended Span ... Error: Operation attempted on ended Span
  at Object.onSessionRemoved (rooms.js:15:40)
```

The room-lifecycle events are silently dropped. This is the whole argument for the invariant in one
callback: **span events need an ambient span that outlives the caller, and callbacks don't have one.**

Full inventory of current violations (4, not 2 — all in the Tabletop server):

| Site                                          | Event                  | Ambient span?                                                                                          |
| --------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------ |
| `apps/tabletop/src/server/rooms.ts:49`        | `room.session_removed` | **No** — throttled timer callback. Actively erroring in prod.                                          |
| `apps/tabletop/src/server/rooms.ts:54`        | `room.emptied`         | **No** — same callback.                                                                                |
| `apps/tabletop/src/server/rooms.ts:66`        | `room.created`         | Sometimes — depends who calls `getOrCreateRoom` (a request, or a ws connect, or nothing).              |
| `apps/tabletop/src/server/cardArrival.ts:128` | `row.allocated`        | Usually yes (inside a request) — still a violation; should be attributes on the request span or a log. |

**Caveat an implementer must know:** there is currently **no OTel logs pipeline anywhere in this
fleet.** No `@opentelemetry/api-logs`, no `sdk-logs`, no `OTLPLogExporter`, no Ruby logs exporter,
no `OTEL_LOGS_*` config. So "create logs instead" is today a _direction_, not a paved road. Honoring
it means either standing up a logs pipeline (the real fix) or, in the meantime, putting the
information on a span you created and therefore own. Do **not** treat "there's no logger yet" as
license to reach for `addEvent`.

### 3. While ingest keys are OK to commit to git and publish in the browser, Collectors are better.

Prod: same-origin `/v1/traces`, ALB-routed to a dedicated
`mtg-tabletop-collector` (`apps/tabletop/k8s/collector.yaml`, `BROWSER_OTLP_TRACES_URL` in
`apps/tabletop/k8s/configmap.yaml`) — no key in the page, no CORS. Local: `otel-collector-local.yaml`,
or the local-only `ALLOW_BROWSER_DIRECT_HONEYCOMB=true` key fallback in
`apps/tabletop/src/server/server.ts:33-45`.

### 4. Head-sample heath checks; keep all user activity.

A sampler that stops matching keeps 100% of the chatter and says nothing about it. So sampling logic
lives in its own module with tests (`apps/shuffler/src/telemetry-sampler.ts` +
`apps/shuffler/test/telemetry-sampler.test.ts`), and reads **both** semconv spellings of every
attribute it depends on.

## How it works now

_(This is the negotiable part — update this section whenever telemetry wiring changes.)_

We want but don't yet have: logging libraries that participate in traces.
We want but don't yet have: a wrapper module around OpenTelemetry libraries, especially in JavaScript.

**There is no shared OTel library.** Root `package.json` workspaces glob only `apps/*` and
`services/*`; there is no `packages/` or `libs/`. Each of the three ships wires OTel itself, and
they have already diverged.

| Where                                                 | What it is                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/shuffler/src/tracing.ts`                        | Node SDK init. ESM loader hook (`register("@opentelemetry/instrumentation/hook.mjs")`) + `node --import`. Auto-instrumentations; `fs` off; **Express middleware spans off** (`ignoreLayersType: [ExpressLayerType.MIDDLEWARE]`). `ParentBasedSampler({root: BackgroundChatterSampler})`.                                                                                                                                                              |
| `apps/shuffler/src/telemetry-sampler.ts`              | `BackgroundChatterSampler` — keeps `CHATTER_SAMPLE_RATIO = 0.01` of probes (`kube-probe`, `elb-healthchecker` by UA) + `/health` + static assets by extension; 100% of everything else. Reads `http.user_agent`/`user_agent.original` and `http.target`/`url.path`. Unit tested.                                                                                                                                                                      |
| `apps/shuffler/src/tracing_util.ts`                   | **Helpers, not a wrapper**: `setCommonSpanAttributes()` (a `CommonAttributes` → span-attribute-name table), `stampRouteParamsOnSpan()` (writes `http.route.param.<key>`), `markCurrentSpanAsError()`. Callers still `import { trace } from "@opentelemetry/api"` directly.                                                                                                                                                                            |
| `apps/tabletop/src/server/tracing.ts`                 | A **separate** Node SDK init, "modeled on the Shuffler's". Own inline `KubeProbeAwareSampler` (0.001 kube-probe / 0.01 ELB). **No middleware suppression, no static-asset or `/health` handling, reads only `http.user_agent`, and no test.** See Watch points.                                                                                                                                                                                       |
| `apps/tabletop/src/client/observability/index.ts`     | **The only real wrapper in the fleet.** Browser-only, self-described as "our own wrapper around the standard OpenTelemetry web SDK — nothing Honeycomb-specific". Surface: `initTracing()`, `inSpan()`, `setGlobalAttrs()` (via `GlobalAttributesSpanProcessor`, stamping e.g. `table.name` on every span), `currentTraceparent()`. Learns its destination by fetching `/otel-config.json`; tracing off is a valid local mode (logs a line, returns). |
| `services/spine/config/initializers/opentelemetry.rb` | Ruby, ~4 effective lines: `SDK.configure` + `use_all`. No wrapper. Rack instrumentation extracts inbound W3C context, so a Shuffler-initiated trace continues through event ingestion. In test nothing is configured and the SDK exports nowhere — fine by design.                                                                                                                                                                                    |

**Manual span creation is almost nonexistent.** Across all three ships there are ~5 call sites:
`apps/tabletop/src/server/server.ts:89` (`tracer.startActiveSpan("ws connect", {kind: SpanKind.SERVER}, …)`,
hand-rolled), `apps/tabletop/src/client/TablePage.tsx:47`, `apps/tabletop/src/client/useCardArrivalSpans.ts:21`,
plus `inSpan` itself. **The Shuffler creates zero manual spans** — it lives entirely off
auto-instrumentation plus stamping attributes onto whatever span already exists. That is why
`markCurrentSpanAsError` / `setCommonSpanAttributes` matter so much, and why anything that removes
the ambient span (see Watch points) is dangerous here.

**Secrets and source order.** `.env` in each ship sets
`OTEL_EXPORTER_OTLP_HEADERS="x-honeycomb-team=$HONEYCOMB_API_KEY"`, interpolated **at source time**.
`HONEYCOMB_API_KEY` lives in `.be` **at the repo root**. So `.be` must be sourced **before** `.env`,
or export silently 401s ("unknown API key"). Who does what:

- repo-root `run` — sources `.be`, warns if absent, then delegates. ✅
- `apps/tabletop/run`, `services/spine/run`, `apps/shuffler/verify.sh`, `apps/tabletop/verify.sh` —
  each walk `.be` then `"$REPO_ROOT/.be"`, then `.env`. ✅
- **`apps/shuffler/run` deliberately does NOT source `.be`** — it sources only `.env`. `.be` also
  runs `aws sso login` / kubectl setup, too heavy for an ordinary app start. Documented in
  `notes/AGENT-NOTES.md` → "Don't source `.be` from `./run`". If a hand-started Shuffler 401s,
  source `.be` in your shell first, then `.env` (or start via the repo-root `run`).

**Where the data lands.** Honeycomb team `modernity`, MCP server `honeycomb-modernity`.
Local → env `local`, datasets `mtg-deck-shuffler`, `mtg-deck-shuffler-web`, `mtg-tabletop`,
`mtg-tabletop-web`. Prod → env `mtg-deck-shuffler` (orion cluster, jessitron-sandbox). The Spine's
`/admin/tables` renders Honeycomb trace links per event.

## History (why these rules exist)

- `469a1ba` "A2: OTel from the first commit" — the Tabletop got server tracing + the browser
  wrapper + collector-or-local-fallback config in its **first** commit. `312f335` likewise for the
  Spine. This is the value in practice, not just in SEAMAP.
- `0f42c95` "Stop drowning Honeycomb in health-check and static-asset traces" — the sampler was
  extracted from `tracing.ts` into its own tested module. The previous inline version had been
  **silently broken for months**: it lowercased the haystack but not the needle
  (`includes("ELB-HealthChecker")` never matched), so every ALB probe was traced at 100% —
  ~1440 probes per 2h × 8 spans each, the single largest source of spans in production. The
  `kube-probe` branch beside it worked only by luck of casing. Lesson: **a sampler that fails open
  is invisible**, so it gets its own module and its own test.
- Middleware spans: an older `ignoreLayers: ["middleware - stampRouteParams"]` hack was replaced by
  `ignoreLayersType: [ExpressLayerType.MIDDLEWARE]`, taking a typical trace from 8 spans to 2.
- The `-r` → `--import` ESM migration (`notes/add-opentelemetry.md`): with `-r`, `import`ed modules
  are never patched, so you get bare `GET` spans with no `http.route` and no framework spans.

## Related reading

`SEAMAP.md` + the three ship SEAMAPs (the "Observability is mandatory" line),
root `CLAUDE.md` → Observability, `notes/AGENT-NOTES.md` (`.be` ordering, browser collector, card
shapes carry no trace context, the sampler incident, middleware spans),
`notes/add-opentelemetry.md` (the runbook for a new TS service),
`notes/instrument-essential-fields.md`,
`services/spine/interpreter/docs/journeys/guide/15-listeners-and-telemetry.md`.
