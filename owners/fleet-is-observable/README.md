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

### 1. Add great attributes to spans. Attributes are ALWAYS better than a log. _(Jess, authoritative)_

Attributes are free in Honeycomb, and they make every span more valuable, because they correlate with each other.
When receiving a request, add all parameters as attributes. Add return values.
When there is a conditional in the code, but the condition in an attribute; this reveals code paths.
There is no PII to worry about in this app.

**A log is for when there is no span to hang it on** — startup, shutdown, callbacks, timers. If
there's an active span, `setAttributes` on it instead. This is also the thing that keeps log volume
affordable, so it is not merely a style preference.

### 1. Never add events to spans. Create trace-participating logs instead. _(Jess, authoritative)_

Logs arrive before the span ends; they work when there is no active span; they arrive if the span never ends; and — the case that actually bit us — they arrive when the span has **already ended**.
Logs cost the same in Honeycomb, and when they have the trace and Span ID, they show up the same as events.

**Violations: none.** All four (all in the Tabletop server) were fixed in `6f319a2`.
`grep -rn "addEvent" apps/*/src services/spine` should return only comments and DOM
`addEventListener`. Keep it that way.

**Worked example, kept because it is the best argument for the rule.**
`apps/tabletop/src/server/rooms.ts` used to call
`trace.getActiveSpan()?.addEvent("room.session_removed", …)` / `"room.emptied"` inside tldraw's
`onSessionRemoved`, which fires from a throttled `pruneSessions` timer. Production logs showed,
repeatedly:

```
Cannot execute the operation on ended Span ... Error: Operation attempted on ended Span
  at Object.onSessionRemoved (rooms.js:15:40)
```

**The obvious diagnosis is wrong, and this KB carried the wrong one for a while.** It said the
callback had *no ambient span*. It has one. AsyncLocalStorage carries the context into the timer,
so `trace.getActiveSpan()` returns the span that opened the room — **already ended**. That is
exactly why `addEvent` *threw* rather than quietly doing nothing: with no span at all, the `?.`
would have short-circuited and you'd have seen silence, not an error. The error message says
"ended Span"; read it literally.

Measured in env `local` when the fix landed: a **2.4 ms** `ws connect` span, and the room-lifecycle
records emitted **~13 s later**. So the real statement of the rule is:

> A callback outlives the span that scheduled it. Span events must be written while the span is
> open; logs need not be. A log emitted from that callback is still stamped with the trace and span
> id from the surviving context, so **it lands on the trace anyway** — strictly better than the
> span event, which was being dropped.

The four sites split by whether a *live* span was available, which is the general rule:

| Was | Became | Why |
| --- | --- | --- |
| `rooms.ts` `room.created` | span **attributes** | Both callers (`handleCardArrival`, `server.ts` `ws connect`) are inside a live span; the fact belongs on the request that caused it. |
| `cardArrival.ts` `row.allocated` | span **attributes** | Always inside `handleCardArrival`'s request span. |
| `rooms.ts` `room.session_removed` | **log** | Throttled timer; span already ended. |
| `rooms.ts` `room.emptied` | **log** | Same callback. |

**How to honor this today:** the Node ships have a paved road — `log.info/warn/error(message,
attributes, error?)` from `apps/shuffler/src/log.ts` or `apps/tabletop/src/server/log.ts`. The
Spine does **not** yet (`spine-logs-in-traces` in `TODO.md`), and this file's claim that the
browser doesn't is stale (`logs-docs-catch-up` will fix it); there, put the information on a span you
created and therefore own. Never treat a missing logger as license to reach for `addEvent`.

**Why this loses nothing:** Honeycomb renders a log that carries trace and span ids with
`meta.annotation_type = span_event` — it lands on the trace looking exactly like a span event
would. Verified in env `local` when the pipeline went in. So the invariant costs no fidelity; it
only buys the cases `addEvent` can't serve (arrives before the span ends, works with no active
span, arrives if the span never ends).

**Logs are deliberately NOT sampled.** A LogRecord does not inherit its span's sampling decision,
and we chose not to make it. See Invariant 4 — the sampler keeps 1% of health-check traces so we
can see the probe passing; if the probe starts *failing* we want every log explaining why, not 1%
of them. The OTel spec defaults `traceBased` to `false` for the same reason. What keeps log volume
affordable is **not logging on the hot path**, which Invariant 1 already produces: attributes are
the default answer and a log is the exception.

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

### 5. Every span says which build it came from. _(FUTURE — not true yet; `build-sha-on-every-span` in `TODO.md`)_

**Not yet implemented.** Recorded here at Jess's request (2026-08-01) so it's held as an invariant
from the moment it lands rather than being rediscovered later.

The intent: each ship carries its deployed git version as an OTel **resource attribute**
(`service.version` and/or `deployment.sha`), fed by the short sha `deploy.sh` already computes for the
image tag — Docker build arg → env var → SDK init. A resource attribute lands on every span *and*
every log for free, with no per-call-site work.

Why it isn't covered by deploy markers: a marker marks **a moment on the time axis**. Nothing on an
individual span says which build emitted it, so "is this error only on the new build?" is answered by
eyeballing which side of a marker line events fall on. That breaks down with overlapping pods,
gradual rollouts, or two deploys close together. Today's `/proxy-image` fix was confirmed by querying
a window *after* rollout and trusting the traffic came from the new pod; a `deployment.sha` breakdown
would have shown it outright.

**When it lands, this becomes a standing check**: a new ship, or a new telemetry init path, must carry
the deployed version. Otherwise a fourth ship ships silently without it — precisely how
`/proxy-image` came to be the one Scryfall call site missing the required `User-Agent` (`dbb2244`).
The Tabletop's **browser** telemetry counts too: a user holding a stale bundle after a deploy is
currently invisible, and is arguably the more valuable half.

## How it works now

_(This is the negotiable part — update this section whenever telemetry wiring changes.)_

Have, as of `ca6553f`: logging libraries that participate in traces — **in the two Node ships only**.
The Spine still has none (`spine-logs-in-traces` in `TODO.md`); the browser claim here is stale
(`logs-docs-catch-up`).
We want but don't yet have: a wrapper module around OpenTelemetry libraries, especially in JavaScript.

**There is no shared OTel library, and that is now a decision rather than drift.** Root
`package.json` workspaces glob only `apps/*` and `services/*`; there is no `packages/` or `libs/`.
When the log pipeline went in, Jess chose per-ship duplication over creating a shared
`packages/telemetry` — a shared package is a new build-and-deploy surface for two Dockerfiles, and
tracing was already duplicated this way. **Don't extract it.** Each of the three ships wires OTel
itself, and they have diverged.

**The two Node ships are on different OTel version lines** (Shuffler 0.219, Tabletop 0.221) and the
same class can have a different constructor: `new BatchLogRecordProcessor(exporter)` in 0.219 vs
`new BatchLogRecordProcessor({ exporter })` in 0.221 (same for `SimpleLogRecordProcessor`). Passing
the wrong shape leaves the exporter `undefined`, the export throws inside a promise into the global
error handler, and **nothing reaches Honeycomb while the code looks right**. Duplicated telemetry
files therefore get a test in *each* ship — that is the only reason this was caught.

| Where                                                 | What it is                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/shuffler/src/tracing.ts`                        | Node SDK init. ESM loader hook (`register("@opentelemetry/instrumentation/hook.mjs")`) + `node --import`. Auto-instrumentations; `fs` off; **Express middleware spans off** (`ignoreLayersType: [ExpressLayerType.MIDDLEWARE]`). `ParentBasedSampler({root: BackgroundChatterSampler})`. Also `logRecordProcessors: [BatchLogRecordProcessor(OTLPLogExporter)]` — logs ride the same NodeSDK so they share the resource (`service.name`) and shutdown path with traces, and land in the same datasets. **Passing `logRecordProcessors` makes the SDK skip its `OTEL_LOGS_EXPORTER` branch entirely** (`sdk-node/build/src/sdk.js:144-156`), so that env var would be dead config on these two ships — don't add it. (The Spine's `OTEL_LOGS_EXPORTER=none` is real; it has no pipeline.)                                                                                                                                                              |
| `apps/shuffler/src/telemetry-sampler.ts`              | `BackgroundChatterSampler` — keeps `CHATTER_SAMPLE_RATIO = 0.01` of probes (`kube-probe`, `elb-healthchecker` by UA) + `/health` + static assets by extension; 100% of everything else. Reads `http.user_agent`/`user_agent.original` and `http.target`/`url.path`. Unit tested.                                                                                                                                                                      |
| `apps/shuffler/src/log.ts`                            | The log surface: `log.info/warn/error(message, attributes, error?)`. Writes to **stdout and OTLP**. Takes its logger from the `api-logs` global, so it no-ops cleanly where no provider was registered (tests, `src/scripts/*`). An `Error` becomes `exception.type`/`.message`/`.stacktrace` attributes. Tested: `test/log.test.ts`. Duplicated in the Tabletop on purpose.                                                             |
| `apps/tabletop/src/server/log.ts`                     | The same file, at the 0.221 version line. Tested: `apps/tabletop/test/log.test.ts` (vitest).                                                                                                                                                                                                                                                                                                                                          |
| `apps/shuffler/src/tracing_util.ts`                   | **Helpers, not a wrapper**: `setCommonSpanAttributes()` (a `CommonAttributes` → span-attribute-name table), `stampRouteParamsOnSpan()` (writes `http.route.param.<key>`), `markCurrentSpanAsError()`. Callers still `import { trace } from "@opentelemetry/api"` directly.                                                                                                                                                                            |
| `apps/tabletop/src/server/tracing.ts`                 | A **separate** Node SDK init, "modeled on the Shuffler's". Own inline `KubeProbeAwareSampler` (0.001 kube-probe / 0.01 ELB). **No middleware suppression, no static-asset or `/health` handling, reads only `http.user_agent`, and no test.** See Watch points. Same `logRecordProcessors` wiring as the Shuffler but with the 0.221 options-object constructor.                                                                                                                                                                                       |
| `apps/tabletop/src/client/observability/index.ts`     | **The only real wrapper in the fleet.** Browser-only, self-described as "our own wrapper around the standard OpenTelemetry web SDK — nothing Honeycomb-specific". Surface: `initTracing()`, `inSpan()`, `setGlobalAttrs()` (via `GlobalAttributesSpanProcessor`, stamping e.g. `table.name` on every span), `currentTraceparent()`. Learns its destination by fetching `/otel-config.json`; tracing off is a valid local mode (logs a line, returns). |
| `services/spine/config/initializers/opentelemetry.rb` | Ruby, ~4 effective lines: `SDK.configure` + `use_all`. No wrapper. Rack instrumentation extracts inbound W3C context, so a Shuffler-initiated trace continues through event ingestion. In test nothing is configured and the SDK exports nowhere — fine by design.                                                                                                                                                                                    |

**The house pattern for a failure path**, established at `apps/shuffler/src/app.ts` `POST /deck`
(`dc2df7e`, the fleet's first real `log.ts` caller):

1. **Attributes first** — `markCurrentSpanAsError(message, {...})` with the failure kind, the
   inputs, and the reason. This answers "what broke, and for which deck."
2. **Then the log, only for the stack** — `log.error("deck retrieval failed", {…}, error)`. The
   third argument becomes `exception.type`/`.message`/`.stacktrace`, which is the part a span has
   no room for. Don't duplicate onto the log what's already on the span.

Many of the Shuffler's remaining catch blocks already do step 1 well (the game-loading middleware
is a good example); for those the conversion is only step 2. Re-stamping is noise.

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
- all three `deploy.sh` — `.be` then `.env`. `apps/shuffler/deploy.sh` joined them on 2026-08-01
  because the deploy marker's key lives in `.be`; the same commit deleted its dead
  `HONEYCOMB_API_KEY=""` line (left over from a commented-out `kubectl create secret` block), which
  **blanked the key it claimed to hold**. ✅
- **`apps/shuffler/run` deliberately does NOT source `.be`** — it sources only `.env`. `.be` also
  runs `kubectl config use-context orion`, a side effect on your kube context that's wrong for an
  ordinary app start. Documented in `notes/AGENT-NOTES.md` → "Don't source `.be` from `./run`". If a
  hand-started Shuffler 401s, source `.be` in your shell first, then `.env` (or use the repo-root `run`).

**There are TWO Honeycomb keys in `.be`, and they are not interchangeable.** This is the newest way
to get telemetry wiring wrong:

| Variable                | Environment          | Access                     | Used by                     |
| ----------------------- | -------------------- | -------------------------- | --------------------------- |
| `HONEYCOMB_API_KEY`     | `local`              | `createDatasets` only      | OTLP export from every ship |
| `HONEYCOMB_MARKER_KEY`  | `mtg-deck-shuffler`  | `markers`, `events`, `queries`, … | `scripts/deploy-marker.sh` only |

The ingest key **cannot** write markers *and* points at the wrong environment, so reaching for the
familiar variable name fails twice over. Verify a key with
`curl -s https://api.honeycomb.io/1/auth -H "X-Honeycomb-Team: $KEY"` — it returns the environment
and the access flags.

**Deploys leave a marker** (`scripts/deploy-marker.sh`, shared by all three `deploy.sh` alongside
`scripts/preflight-aws.sh`). Called as `scripts/deploy-marker.sh <ship> || true` **after** a
successful `kubectl rollout status`, so a line on a graph means a deploy that actually landed. Posts
type `deploy`, message `deploy <ship> <short-sha>`, `url` linking the GitHub commit. Two deliberate
properties:

- **Best-effort.** The deploy has already happened by the time it runs, so a marker problem must
  never read as a failed deploy — hence `|| true` and warnings instead of errors.
- **It refuses to mark the wrong environment.** A marker posted to the wrong environment
  **succeeds** — no error, the line just lands somewhere nobody looks. Same fails-open-invisibly
  shape as the sampler bug in History. So the script resolves the key's environment through
  `GET /1/auth` and declines on mismatch rather than trusting a variable name.

Each `deploy.sh` also tags the commit locally (`deploy-<ship>-<timestamp>`; the Spine gained its tag
in the same change). **Those tags are never pushed**, so the Honeycomb marker is the more durable
record of what shipped when.

**Where the data lands.** Honeycomb team `modernity`, MCP server `honeycomb-modernity`.
Local → env `local`, datasets `mtg-deck-shuffler`, `mtg-deck-shuffler-web`, `mtg-tabletop`,
`mtg-tabletop-web`. Prod → env `mtg-deck-shuffler` (orion cluster, jessitron-sandbox). The Spine's
`/admin/tables` renders Honeycomb trace links per event.

## Evidence: how to show a change is observable

Safe Harbor says a change is home when it's "deployed and observable in Honeycomb." That claim
should be **linkable**, not just asserted.

**Honeycomb query runs never expire — they are visible forever. So are traces, once viewed.**
_(Jess, authoritative.)_ A query-run URL (`…/datasets/<dataset>/result/<pk>`) and a trace URL are
therefore permanent citations: put them in the commit message or here, and they
will still resolve later. Don't hedge about them going stale, and don't re-run a query just to get
a "fresh" link.

Worked examples from the log-pipeline work (team `modernity`, env `local`) — this is what
"verified in Honeycomb" looks like for this fleet:

| Shows | Link |
| --- | --- |
| A real failure end to end: root `POST /deck` ERROR/500 → `request handler - /deck` → the log as a `span_event` → client `GET` 404 from Archidekt | [trace](https://ui.honeycomb.io/modernity/environments/local/result/JuiA57ZyqG1/trace?trace_id=f73482b9f01d9903db99b5b94f8a72c8) |
| The log record: `exception.type`/`.message`/`.stacktrace`, and `trace.parent_id` tying it to the span | [CmtTT79DdNd](https://ui.honeycomb.io/modernity/environments/local/datasets/mtg-deck-shuffler/result/CmtTT79DdNd) |
| The span's error attributes (`deck.retrieval.failure`, `deck.source`, `deck.archidektId`, …) | [D4vCFvASCyh](https://ui.honeycomb.io/modernity/environments/local/datasets/mtg-deck-shuffler/result/D4vCFvASCyh) |
| `http.route` still present after editing `tracing.ts` — the standing check that ESM patching didn't break | [XjiiDPeuDc](https://ui.honeycomb.io/modernity/environments/local/datasets/mtg-deck-shuffler/result/XjiiDPeuDc) |
| The in-span / no-span log pair, both ships | [Shuffler](https://ui.honeycomb.io/modernity/environments/local/datasets/mtg-deck-shuffler/result/m8jpkmTgaBd) · [Tabletop](https://ui.honeycomb.io/modernity/environments/local/datasets/mtg-tabletop/result/pnCKeMhpkDR) |

Note the last row is a **synthetic** emitter, not real app code — worth distinguishing when you
claim something is verified. The Tabletop's `log.ts` still has no real callers.

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
- `ca6553f` "Log pipeline for both Node ships (JES-134)" — Invariant 2 stopped being aspirational.
  Three things were learned building it, each a near-miss of the same kind:
  - **The planned `SampledOnlyLogProcessor` was wrong twice over.** It was designed as a *sibling*
    processor, which cannot drop anything — `MultiLogRecordProcessor.onEmit` forwards to every
    processor unconditionally and `onEmit` returns `void`. It would have exported everything while
    looking correct: the same fails-open-invisibly shape as the sampler bug above. And it wasn't
    wanted anyway (see Invariant 2 → logs are not sampled). Filtering, if ever needed, must be a
    decorator wrapping the batch processor, or the SDK's built-in `traceBased` logger config.
  - **The 0.219/0.221 constructor skew** silently exported nothing in the Tabletop. Caught only
    because the duplicated file had a test in the second ship too. This is the standing argument
    for testing *both* copies of anything deliberately duplicated.
  - Confirmed in env `local` that trace-correlated logs render as `meta.annotation_type =
    span_event`, which is the evidence that banning `addEvent` costs no fidelity.

- **JES-140 (2026-08-01) "The player area as a real table"** — a new Tabletop
  endpoint, `POST /api/tables/:tableName/events` (`seatJoined.ts`,
  `handleSeatJoined`), follows the exact same posture as the existing
  card-arrival endpoint: `trace.getActiveSpan()?.setAttributes(...)` inside the
  request span (`event.id`, `table.name`, `seat.id`, `player.name`, dedup
  outcome), never `span.addEvent`. The shared shape-drawing helper
  `tableFurniture.ts`'s `ensurePlayerArea()` stamps `seat.id`/`player.name`/
  `seat.index`/`playmat.image_present`/`card_back.image_present` on the active
  span — the same pattern as the row-allocation attribute it replaced. New on
  the Shuffler side: `sendToTable.ts`'s `sendSeatJoinedBestEffort()` is the
  fleet's first *deliberately* best-effort send (unlike `sendCardToTableFirst`,
  which throws) — on gateway failure it sets span attributes
  (`seat_joined.send_failed`, `table.name`, `seat.id`) **and** calls
  `log.warn(...)` with the error, because Shuffle Up must not fail just because
  the Tabletop is unreachable. This is a genuine "log for a real failure path"
  callers can imitate: attributes first, then the log for the stack, exactly
  the house pattern above. No new telemetry init path, ship, or OTel dependency
  change.

- `4dbebbd` "Deploy markers in Honeycomb, post-rollout, for all three ships" — deploys had left no
  trace in Honeycomb at all, so correlating a change with a release meant matching wall-clock against
  local-only git tags. What the wiring taught, both worth remembering:
  - **`HONEYCOMB_API_KEY` is not the only Honeycomb key any more.** It's the `local` environment's
    ingest key with `createDatasets` access only — it cannot write markers, and it targets the wrong
    environment. Markers use `HONEYCOMB_MARKER_KEY`. Reaching for the familiar name would have failed
    twice.
  - **Writing to the wrong Honeycomb environment succeeds.** There's no error to notice; the data
    lands somewhere you never look. That's the third instance of the fails-open-invisibly pattern in
    this file (sampler needle, sibling log processor, now markers), which is why the marker script
    resolves the key's environment via `GET /1/auth` instead of trusting configuration.

  Filed `build-sha-on-every-span` off the back of it: markers mark a moment, not a build — see
  Invariant 5.

## Related reading

`SEAMAP.md` + the three ship SEAMAPs (the "Observability is mandatory" line),
root `CLAUDE.md` → Observability, `notes/AGENT-NOTES.md` (`.be` ordering, browser collector, card
shapes carry no trace context, the sampler incident, middleware spans),
`notes/add-opentelemetry.md` (the runbook for a new TS service),
`notes/instrument-essential-fields.md`,
`services/spine/interpreter/docs/journeys/guide/15-listeners-and-telemetry.md`.
