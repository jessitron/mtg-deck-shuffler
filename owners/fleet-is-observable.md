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
explains it, and the volume stays affordable.** Three ships — the Shuffler, the Tabletop
(server + browser), the Spine — must each export, must carry trace context across the hops they
actually make, and must not drown the signal in health-check chatter.

The failure mode this owner exists to prevent is the nasty one: **telemetry that fails silently.**
Nothing errors, the app works, tests pass — and the data is gone, wrong, or 100x too expensive.
Every incident in this repo's history is of that shape (see History below).

## Invariants

### 1. Never add events to spans. Create logs instead. *(Jess, authoritative)*

`span.addEvent(...)` is not how we record that something happened. Span events need an **ambient
span that is still open** at the moment of the call, and the places you most want to record
something — callbacks, timers, cleanup hooks, throttled prunes — are exactly the places where no
such span exists. So the call silently does nothing, or worse, throws into the void against an
ended span. Attributes on a span you own are fine; a stream of events attached to whatever span
happened to be active is not.

Also: events are second-class in Honeycomb compared to spans and logs. If it deserves a timestamp
and a name, it deserves to be a log record (or its own span), not a footnote on someone else's span.

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

| Site | Event | Ambient span? |
|---|---|---|
| `apps/tabletop/src/server/rooms.ts:49` | `room.session_removed` | **No** — throttled timer callback. Actively erroring in prod. |
| `apps/tabletop/src/server/rooms.ts:54` | `room.emptied` | **No** — same callback. |
| `apps/tabletop/src/server/rooms.ts:66` | `room.created` | Sometimes — depends who calls `getOrCreateRoom` (a request, or a ws connect, or nothing). |
| `apps/tabletop/src/server/cardArrival.ts:128` | `row.allocated` | Usually yes (inside a request) — still a violation; should be attributes on the request span or a log. |

**Caveat an implementer must know:** there is currently **no OTel logs pipeline anywhere in this
fleet.** No `@opentelemetry/api-logs`, no `sdk-logs`, no `OTLPLogExporter`, no Ruby logs exporter,
no `OTEL_LOGS_*` config. So "create logs instead" is today a *direction*, not a paved road. Honoring
it means either standing up a logs pipeline (the real fix) or, in the meantime, putting the
information on a span you created and therefore own. Do **not** treat "there's no logger yet" as
license to reach for `addEvent`.

### 2. Nothing durable carries trace context.

Traces follow requests; cards persist. Card shapes on the Tabletop canvas carry **no** traceparent
— correlation is by the `card.instance_id` span attribute. A traceparent rides the **websocket
connection URL only**, where it parents the server's `ws connect` span, and stops there
(`currentTraceparent()` in the browser wrapper; `apps/tabletop/src/server/server.ts:89`).
See `notes/AGENT-NOTES.md` → "Card shapes carry no trace context." A traceparent written into
persisted state means traces from a week ago get stitched onto today's request.

### 3. No API key ever reaches the browser (except one documented local fallback).

Browser spans never go to the app server. Prod: same-origin `/v1/traces`, ALB-routed to a dedicated
`mtg-tabletop-collector` (`apps/tabletop/k8s/collector.yaml`, `BROWSER_OTLP_TRACES_URL` in
`apps/tabletop/k8s/configmap.yaml`) — no key in the page, no CORS. Local: `otel-collector-local.yaml`,
or the local-only `ALLOW_BROWSER_DIRECT_HONEYCOMB=true` key fallback in
`apps/tabletop/src/server/server.ts:33-45`.

### 4. A sampler must fail *closed*, and be unit-testable.

A sampler that stops matching keeps 100% of the chatter and says nothing about it. So sampling logic
lives in its own module with tests (`apps/shuffler/src/telemetry-sampler.ts` +
`apps/shuffler/test/telemetry-sampler.test.ts`), and reads **both** semconv spellings of every
attribute it depends on.

## How it works now

*(This is the negotiable part — update this section whenever telemetry wiring changes.)*

**There is no shared OTel library.** Root `package.json` workspaces glob only `apps/*` and
`services/*`; there is no `packages/` or `libs/`. Each of the three ships wires OTel itself, and
they have already diverged.

| Where | What it is |
|---|---|
| `apps/shuffler/src/tracing.ts` | Node SDK init. ESM loader hook (`register("@opentelemetry/instrumentation/hook.mjs")`) + `node --import`. Auto-instrumentations; `fs` off; **Express middleware spans off** (`ignoreLayersType: [ExpressLayerType.MIDDLEWARE]`). `ParentBasedSampler({root: BackgroundChatterSampler})`. |
| `apps/shuffler/src/telemetry-sampler.ts` | `BackgroundChatterSampler` — keeps `CHATTER_SAMPLE_RATIO = 0.01` of probes (`kube-probe`, `elb-healthchecker` by UA) + `/health` + static assets by extension; 100% of everything else. Reads `http.user_agent`/`user_agent.original` and `http.target`/`url.path`. Unit tested. |
| `apps/shuffler/src/tracing_util.ts` | **Helpers, not a wrapper**: `setCommonSpanAttributes()` (a `CommonAttributes` → span-attribute-name table), `stampRouteParamsOnSpan()` (writes `http.route.param.<key>`), `markCurrentSpanAsError()`. Callers still `import { trace } from "@opentelemetry/api"` directly. |
| `apps/tabletop/src/server/tracing.ts` | A **separate** Node SDK init, "modeled on the Shuffler's". Own inline `KubeProbeAwareSampler` (0.001 kube-probe / 0.01 ELB). **No middleware suppression, no static-asset or `/health` handling, reads only `http.user_agent`, and no test.** See Watch points. |
| `apps/tabletop/src/client/observability/index.ts` | **The only real wrapper in the fleet.** Browser-only, self-described as "our own wrapper around the standard OpenTelemetry web SDK — nothing Honeycomb-specific". Surface: `initTracing()`, `inSpan()`, `setGlobalAttrs()` (via `GlobalAttributesSpanProcessor`, stamping e.g. `table.name` on every span), `currentTraceparent()`. Learns its destination by fetching `/otel-config.json`; tracing off is a valid local mode (logs a line, returns). |
| `services/spine/config/initializers/opentelemetry.rb` | Ruby, ~4 effective lines: `SDK.configure` + `use_all`. No wrapper. Rack instrumentation extracts inbound W3C context, so a Shuffler-initiated trace continues through event ingestion. In test nothing is configured and the SDK exports nowhere — fine by design. |

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

## Edges / watch points — what change *elsewhere* would silently break this

Telemetry is downstream of almost everything, which is exactly why it needs an owner: **none of
these look like telemetry changes**, and all of them fail quietly.

1. **An `addEvent` call appears.** Invariant 1. There is no lint for it; the grep is
   `grep -rn "addEvent" apps services | grep -v node_modules | grep -v /dist/` (filter out DOM
   `addEventListener`). New ones arrive most easily in callbacks and cleanup hooks, which is where
   they are most broken.

2. **An OTel dependency bump flips semconv attribute names.** The HTTP instrumentation is
   mid-migration from `http.user_agent`/`http.target` to `user_agent.original`/`url.path`. The
   Shuffler's sampler reads both. **The Tabletop server's `KubeProbeAwareSampler` reads only
   `http.user_agent`, has no test, and covers neither `/health` nor static assets.** One version
   bump and Tabletop sampling silently turns off — the exact 2024-scale incident the Shuffler already
   survived, waiting to happen again in the other ship. Highest-value known gap.

3. **`.env` sourced without `.be` first.** Any new run/verify/deploy script, Dockerfile, CI step,
   k8s manifest, or "let me just start it by hand" that sources `.env` alone gets a header of
   `x-honeycomb-team=` and a silent 401. Copy the `for candidate in .be "$REPO_ROOT/.be"` block from
   `services/spine/run`.

4. **Anything that removes or narrows the ambient span.** The Shuffler creates no spans of its own,
   so `setCommonSpanAttributes` / `stampRouteParamsOnSpan` / `markCurrentSpanAsError` all write to
   "whatever span is active." Re-enabling Express middleware spans, adding middleware that needs a
   span, or moving work into a `setTimeout`/`queueMicrotask`/`process.nextTick` moves that target or
   removes it. Note the subtlety recorded in `tracing.ts`: turning middleware spans *off* is what
   makes `stampRouteParams`' write at `res.end` land on the still-open root server span carrying
   `http.route`. Turning them back on silently re-breaks that.

5. **A traceparent put somewhere durable.** Invariant 2. Adding trace context to a card shape,
   `PersistedGameState`, a Spine event payload, or a `contracts/` schema. Correlate with
   `card.instance_id` instead.

6. **Anything that puts an API key in the browser bundle.** Invariant 3. Changing
   `/otel-config.json`, `BROWSER_OTLP_TRACES_URL`, the ALB routing for `/v1/traces`, or the collector
   deployment. If browser spans vanish, check `BROWSER_OTLP_TRACES_URL` **before** suspecting the web SDK.

7. **A new route that is high-volume and boring** (a poller, a metrics scrape, a second health path).
   It needs a sampler entry, or it becomes the new largest source of spans.

8. **A fourth ship, or a new entry point in an existing one.** There is no shared library to inherit
   from, so a new service gets telemetry only if someone deliberately copies the pattern
   (`notes/add-opentelemetry.md` is the runbook — including the ESM `-r` vs `--import` gotcha).
   Likewise a new launch path (`npm start`, a Dockerfile `CMD`, a script) must keep
   `node --import ./dist/tracing.js` or it runs untraced.

9. **A change to `contracts/` or a cross-ship hop.** Trace continuity Shuffler → Spine depends on
   the Rack instrumentation extracting inbound W3C context; a hop that isn't plain HTTP (a queue, a
   file, a batch) breaks the trace and needs deliberate propagation.

10. **Redefining what a span *is* in the Spine's interpreter.** `Journey::TelemetryListener`
    (`services/spine/interpreter/docs/journeys/guide/15-listeners-and-telemetry.md`) owns
    `journey.*` machinery telemetry; stage bodies emit only domain events. A stage body emitting
    `journey.*` duplicates the ambient listener.

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
