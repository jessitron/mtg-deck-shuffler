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
(`SEAMAP.md`, each ship's SEAMAP). The North Star includes **"When something breaks, Honeycomb
shows you why."**

What must keep working: **for any interesting thing a user does, there is a trace in Honeycomb
that explains it, and the data stays queryable.** The trace follows HTTP calls within this app.

**Volume is not a cost concern on this fleet.** _(Jess: "I work at Honeycomb. Ingestion is
free.")_ See "Volume: what still matters and what doesn't" below before you plan around a budget.

## Invariants

### 1. Add great attributes to spans. Attributes are ALWAYS better than a log. _(Jess, authoritative)_

Attributes are free in Honeycomb, and they make every span more valuable because they correlate
with each other. When receiving a request, add all parameters as attributes. Add return values.
Put the condition of a conditional into an attribute — this reveals code paths. There is no PII
to worry about in this app.

**A log is for when there is no span to hang it on** — startup, shutdown, callbacks, timers. If
there's an active span, `setAttributes` on it instead. This is a signal preference, not a cost
argument: an attribute on a span that already exists correlates with everything else on that
span and adds no row anyone has to filter past.

### 2. Never add events to spans. Create trace-participating logs instead. _(Jess, authoritative)_

Logs arrive before the span ends; they work when there is no active span; they arrive if the span
never ends; and — the case that actually bit us — they arrive when the span has **already
ended**.

**Worked example, kept because it is the best argument for the rule.** A callback that fires from
a throttled timer (`onSessionRemoved` in `apps/tabletop/src/server/rooms.ts`) called
`trace.getActiveSpan()?.addEvent(...)` and threw in production: `Cannot execute the operation on
ended Span`. AsyncLocalStorage carries the *context* into the timer, so `getActiveSpan()` returns
a real span — just one that already ended. That's why `addEvent` throws rather than silently
no-op'ing; a log written from the same callback still carries the trace/span id from the
surviving context, so it lands on the trace anyway. **The rule: span events must be written while
the span is open; logs need not be — write a log instead, it's strictly better, never worse.**

`grep -rn "addEvent" apps/*/src services/spine` should return only comments and DOM
`addEventListener`. Keep it that way.

**How to honor this today:** the Node ships have a paved road — `log.info/warn/error(message,
attributes, error?)` from `apps/shuffler/src/log.ts` or `apps/tabletop/src/server/log.ts` — and
the Tabletop's browser has one too: `logError(message, attributes, error?)` in
`apps/tabletop/src/client/observability/index.ts`. The Spine does **not** yet (tracked as
`spine-logs-in-traces` in `TODO.md`); there, put the information on a span you created and
therefore own. Never treat a missing logger as license to reach for `addEvent`.

Honeycomb renders a log that carries trace and span ids with `meta.annotation_type =
span_event` — it lands on the trace looking exactly like a span event would. So the invariant
costs no fidelity; it only buys the cases `addEvent` can't serve.

**Logs are deliberately NOT sampled.** A LogRecord does not inherit its span's sampling decision.
See Invariant 4 — the sampler keeps 1% of health-check traces so a *failing* probe still shows
every log explaining why. Unsampled logs stay readable because nothing logs on the hot path —
Invariant 1 already produces that, since attributes are the default answer and a log is the
exception.

### 3. Ingest keys are OK to commit to git and publish in the browser — but a Collector is better.

Prod: same-origin `/v1/traces` and `/v1/logs`, ALB-routed to a dedicated
`mtg-tabletop-collector` (`apps/tabletop/k8s/collector.yaml`, `BROWSER_OTLP_TRACES_URL` /
`BROWSER_OTLP_LOGS_URL` in `apps/tabletop/k8s/configmap.yaml`) — no key in the page, no CORS.
Local: `otel-collector-local.yaml`, or the local-only `ALLOW_BROWSER_DIRECT_HONEYCOMB=true` key
fallback in `apps/tabletop/src/server/server.ts`.

**The Tabletop's prod ALB is plain `http://`, on purpose** (`apps/tabletop/k8s/ingress.yaml`,
IngressGroup `tabletop-http`, HTTP:80 only, no 443 listener at all) — tldraw's license gate blanks
an unlicensed canvas on non-loopback HTTPS origins. Consequence: an `https://` browser OTLP URL
against this ALB is **connection-refused**, silently killing all browser telemetry including the
uncaught-error log pipeline. **Four config spots are scheme-coupled and must agree**:
`BROWSER_OTLP_TRACES_URL` and `BROWSER_OTLP_LOGS_URL` in `apps/tabletop/k8s/configmap.yaml`, the
CORS `allowed_origins` in `apps/tabletop/k8s/collector.yaml`, and the Shuffler's
`TABLETOP_PUBLIC_URL` (`apps/shuffler/k8s/configmap.yaml`). "Add TLS back" touches all four, plus
the Tabletop README's Licensing section — it isn't a one-file ingress tweak.

**Watch point for any ingress in the `tabletop-http` IngressGroup**: every ingress sharing
`alb.ingress.kubernetes.io/group.name` reconciles as **one ALB** — one malformed ingress anywhere
in the group can block `FailedDeployModel` routing changes to *every* ingress in it, including the
one carrying `/v1/traces`/`/v1/logs`. (This happened once, for about 27 hours, from a since-removed
sibling ingress; the fix was deleting the bad ingress from git and the cluster — there is no
standing hazard today, but the failure mode is worth knowing before adding a second ingress to
this group.)

### 4. Head-sample health checks; keep all user activity.

A sampler that stops matching keeps 100% of the chatter and says nothing about it. So sampling
logic lives in its own module with tests (`apps/shuffler/src/telemetry-sampler.ts` +
`apps/shuffler/test/telemetry-sampler.test.ts`), and reads **both** semconv spellings of every
attribute it depends on (`http.user_agent`/`user_agent.original`, `http.target`/`url.path`) — a
gem that switches spelling out from under the sampler shouldn't be able to silently disable it.

### 5. Every span says which build it came from. _(Not yet implemented on any ship; tracked as `build-sha-on-every-span` in `TODO.md`)_

The intent: each ship carries its deployed git version as an OTel **resource attribute**
(`service.version` and/or `deployment.sha`), fed by the short sha `deploy.sh` already computes
for the image tag — Docker build arg → env var → SDK init. A resource attribute lands on every
span *and* every log for free, with no per-call-site work.

Deploy markers mark a **moment**, not a build — nothing on an individual span says which build
emitted it, so "is this error only on the new build?" is answered by eyeballing which side of a
marker line events fall on, which breaks down with overlapping pods or two close deploys.

One init path already satisfies this — the verify harness
(`apps/shuffler/test/harness-telemetry/harnessTracing.ts`) puts the git short sha on its resource
as `service.version`, plus `verify.git.sha` on every span — a worked example to copy when this
lands on the ships. The Tabletop's **browser** bundle counts too: a user holding a stale bundle
after a deploy is currently invisible, and is arguably the more valuable half.

## How it works now

_(This is the negotiable part — update this section whenever telemetry wiring changes.)_

Logging libraries that participate in traces exist in **the two Node ships**, plus the Tabletop's
**browser**: `logError()` in `apps/tabletop/src/client/observability/index.ts`, its own
`LoggerProvider`, and a collector route at `/v1/logs` (`apps/tabletop/k8s/collector.yaml`,
`apps/tabletop/k8s/ingress.yaml`) carrying the path through to Honeycomb. The Spine still has none
(`spine-logs-in-traces` in `TODO.md`).

**There is no shared OTel library, and that is a decision, not drift.** Root `package.json`
workspaces glob only `apps/*` and `services/*`; there is no shared telemetry package. A shared
package is a new build-and-deploy surface for multiple Dockerfiles, so each of the three ships
wires OTel itself, and they have diverged on purpose. **Don't extract it.**

**Nothing pins the two Node ships' OTel dependency versions to match each other.** OTel JS classes
have changed constructor shape across minor versions before (e.g. `BatchLogRecordProcessor`
moving from a positional `exporter` argument to an options object) — passing the wrong shape
leaves the exporter `undefined`, the export throws inside a promise into the global error
handler, and **nothing reaches Honeycomb while the code looks right**. Whoever bumps one ship's
OTel deps should check the other's before assuming constructor shapes still match; each ship's
duplicated telemetry file carries its own test asserting the right shape for exactly this reason.

**A version mismatch between a worktree and the main checkout can also produce PHANTOM type
errors** — a build failure against *correct* code. A fresh worktree has no `node_modules` of its
own, and because worktrees live inside the repo, `tsc` walks up and resolves the main checkout's
hoisted OTel types — so a correct call can "fail" against a stale type from a different version.
**The fix is `npm install` from the worktree root, never a code change** — "fixing" a correct line
to match the wrong type would compile clean and silently export nothing. See
`notes/AGENT-NOTES.md` → "Harness gotchas".

**`service.name` from a resource vs. from the environment: the two OTel JS provider classes
behave OPPOSITELY.**

| Provider | What it does with your `resource` | Sees `OTEL_SERVICE_NAME`? |
| --- | --- | --- |
| `BasicTracerProvider` (`sdk-trace-base`) | `mergedConfig.resource ?? defaultResource()` — a plain `??`. An explicit resource **replaces** the default entirely. | **No.** `defaultResource()` never runs `envDetector`; only `NodeSDK` wires that up. Structurally incapable. |
| `NodeSDK` (`sdk-node`) | `this._resource = this._resource.merge(detectResources(...))` — **detected wins**. | **Yes, and it OVERRIDES you.** An ambient `OTEL_SERVICE_NAME` beats an explicitly configured `service.name`. |

Consequences: writing `service.name` into the resource in code is **safe under
`BasicTracerProvider` and unsafe under `NodeSDK`** — swapping one for the other silently relocates
a service's spans to another dataset (`harnessTracing.ts` has a comment and a regression test
against exactly that swap). **Don't `export` anything telemetry-ish in a script after `.env` is
sourced** — `.env` exports `OTEL_SERVICE_NAME` for the app server, and a second process launched
from the same script inherits it; `verify.sh` passes its `VERIFY_*` vars on the command line
instead. If you ever want `telemetry.sdk.*` back on a `BasicTracerProvider`, the order matters:
`defaultResource().merge(yours)`, never the reverse.

### Per-ship wiring, as it stands today

| Where | What it is |
| --- | --- |
| `apps/shuffler/src/tracing.ts` | Node SDK init. ESM loader hook (`register("@opentelemetry/instrumentation/hook.mjs")`) + `node --import`. Auto-instrumentations; `fs` off; **Express middleware spans off** (`ignoreLayersType: [ExpressLayerType.MIDDLEWARE]`) — keeps a typical trace at 2 spans instead of 8. `ParentBasedSampler({root: BackgroundChatterSampler})`. `logRecordProcessors: [BatchLogRecordProcessor(OTLPLogExporter)]` — logs ride the same NodeSDK so they share the resource (`service.name`) and the shutdown-flush path with traces. **Passing `logRecordProcessors` makes the SDK skip its `OTEL_LOGS_EXPORTER` branch entirely**, so that env var is dead config on these two ships — don't add it. (The Spine's `OTEL_LOGS_EXPORTER=none` is real; it has no pipeline.) |
| `apps/shuffler/src/shutdownHooks.ts` (and the Tabletop's verbatim port, `apps/tabletop/src/server/shutdownHooks.ts`) | `installShutdownHandlers(drain, options)` — the SIGTERM/SIGINT flush-and-exit hook, called from `tracing.ts` right after `sdk.start()`. Races `drain()` against an `unref()`'d `setTimeout` (default 5000ms), calls an injectable `exit` **exactly once** regardless of how many signals fire or whether `drain()` resolves, rejects, or times out. **Installing this handler changes Node's default SIGTERM behavior**: with no handler, SIGTERM terminates the process immediately; once one exists, Node no longer exits on its own, so the file must call `exit()` itself once the race settles. Tested with a real `EventEmitter` as the fake signal source, no mocks. |
| `apps/shuffler/src/telemetry-sampler.ts` | `BackgroundChatterSampler` — keeps `CHATTER_SAMPLE_RATIO = 0.01` of probes (`kube-probe`, `elb-healthchecker` by UA) + `/health` + static assets by extension; 100% of everything else. Reads both semconv spellings (Invariant 4). Unit tested. |
| `apps/shuffler/src/log.ts` (and the Tabletop's copy, `apps/tabletop/src/server/log.ts`) | The log surface: `log.info/warn/error(message, attributes, error?)`. Writes to **stdout and OTLP**. Takes its logger from the `api-logs` global, so it no-ops cleanly where no provider was registered (tests, `src/scripts/*`). An `Error` becomes `exception.type`/`.message`/`.stacktrace` attributes. Duplicated in the Tabletop on purpose, each with its own test. |
| `apps/shuffler/src/tracing_util.ts` | **Helpers, not a wrapper**: `setCommonSpanAttributes()`, `stampRouteParamsOnSpan()` (writes `http.route.param.<key>`), `markCurrentSpanAsError()`. Callers still `import { trace } from "@opentelemetry/api"` directly. |
| `apps/shuffler/src/apply-game-command.ts` | All **13** of `app.ts`'s game-mutation routes (`reveal-card`, `put-in-hand`, `put-on-top`, `put-on-bottom`, `shuffle`, `mulligan`, `move-hand-card`, `undo`, `draw`, `flip-card`, `flip-card-modal`, `play-card`, `discard-card`) go through `applyGameCommand(deps, gameId, expectedVersion, mutate, beforeMutate?)`, which is Express-free and owns the "not-found" / "incompatible-version" `markCurrentSpanAsError` calls plus the persist-then-return protocol, guaranteeing identical telemetry across every route regardless of rendering. `renderApplied` may return `string | void` so a route that must send its own response (e.g. `flip-card-modal`'s `res.render(...)`) still fits. The optional `beforeMutate?: (game) => Promise<void>` runs after the status/version checks and before `mutate`, so `play-card`/`discard-card` can send-to-tabletop-first and only mutate on success — throwing `TableSendFailedError` aborts pre-mutate/persist into a `{ kind: "send-failed"; errorHtml }` outcome, rendered as a 502 + `HX-Retarget`/`HX-Reswap` to `#modal-container`. No route in `app.ts` runs a hand-rolled retrieve/reconstruct/status-check/version-check/mutate/persist protocol any more. **Open**: `CommandOutcome.kind` isn't stamped on the span for the non-error outcomes (`not-active`/`version-conflict`/`applied`) — only the two error paths get an attribute today. |
| `apps/tabletop/src/server/tracing.ts` | A **separate** Node SDK init, modeled on the Shuffler's. Own inline `KubeProbeAwareSampler` (0.001 kube-probe / 0.01 ELB). No middleware suppression, no static-asset or `/health` handling, reads only `http.user_agent`, and has no test — a real gap versus the Shuffler's sampler. Same `logRecordProcessors` wiring and shutdown-hook install as the Shuffler. |
| `apps/shuffler/src/view/common/html-layout.ts` | The Shuffler's **single-sourced** browser telemetry bootstrap. `formatHtmlHead(options)` is the one page shell every Shuffler page's `<head>` goes through — EJS pages via `views/partials/head.ejs`, TS pages via `formatPageWrapper` — so the bootstrap appears exactly once. The guard+init is `initHoneycombTracing(apiKey)`, shipped as the exported literal string `HONEYCOMB_TRACING_INIT_SCRIPT`, tested by evaling that exact string. See "The Shuffler's browser bootstrap" below for the script order and the apiKey fallback. |
| `apps/tabletop/src/client/observability/index.ts` | **The only real wrapper in the fleet.** Browser-only, self-described as "our own wrapper around the standard OpenTelemetry web SDK — nothing Honeycomb-specific." Surface: `initTracing()`, `inSpan()`, `setGlobalAttrs()` (via `GlobalAttributesSpanProcessor`, stamping e.g. `table.name` on every span), `currentTraceparent()`. Learns its destination by fetching `/otel-config.json`; tracing off is a valid local mode (logs a line, returns). |
| `services/spine/` | Roda + Sequel + SQLite + Minitest. `config/telemetry.rb`: `OpenTelemetry::SDK.configure` with `opentelemetry-exporter-otlp` + `opentelemetry-instrumentation-rack`, `service_name` `"mtg-spine"`. `app.rb` mounts the Rack instrumentation explicitly (`use(*OpenTelemetry::Instrumentation::Rack::Instrumentation.instance.middleware_args)`), which is required for Roda (no Rails-style auto-injection) and already in place. **100% sampling, deliberately** — no sampler module; a prior Ruby sampler existed and was flagged broken, and the rewrite starts clean rather than porting it back. `services/spine/run` follows the same `.be`-then-`.env` pattern as `apps/tabletop/run`, polling `GET /up`. Query this fleet's data via the **`honeycomb-modernity`** MCP server (team `modernity`) — not the default `honeycomb` server, which points at an unrelated demo team and has no fleet data; picking the wrong one looks like "no spans" and can be mistaken for a wiring bug. **Still open**: no sampler (100% is the deliberate starting point until start/stop behavior is confirmed clean), no logs pipeline (`spine-logs-in-traces` in `TODO.md`). |
| `services/spine/app.rb` `POST /join` and `POST /tables/:table_id/events` | Both routes add application-level span attributes, Invariant-1 style: `current_span.add_attributes(...)` for inputs as soon as parsed, then a result attribute on success (`join.result`, `event.result`) — `event.result`'s dedup path gets its own value (`"duplicate"`, distinct from `"accepted"`) so a query can tell "receiving events" apart from "senders retrying." Failure paths share one helper, `mark_span_failed(attribute, result, error)`, taking the attribute key as a parameter so both routes use the same shape instead of each carrying a near-identical copy. `current_span` is a one-line helper (`OpenTelemetry::Trace.current_span`) — no manual span creation, purely stamping the ambient Rack-instrumentation span. **`join.result` does not currently distinguish** a brand-new table from joining an existing one — both set `"joined"`. Contract validation itself (`EventContract.validate!`) emits no telemetry of its own; the route's `rescue` turns a violation into the `contract_violation` span outcome. |
| `services/spine/app.rb` `GET /admin/tables` and `GET /admin/tables/:id` | The Spine's admin screen (ticket 06) follows the same house pattern: `current_span.add_attributes("admin.table_count" => ...)` on the index, `"table.id"`/`"admin.result" => "found"` on the show route, and the shared `mark_span_failed("admin.result", "not_found", error)` on a missing table — no new telemetry shape introduced, just the existing one applied to a third route pair. `HONEYCOMB_ENV_SLUG` is not yet set anywhere for the Spine (no prod deploy exists yet), so the `"local"` default is correct today; the code carries a comment at the `ENV.fetch` call site flagging that Spine's future prod deploy wiring must set `HONEYCOMB_ENV_SLUG=mtg-deck-shuffler`. Rows already in the log when the page loads render with no trace link at all — the `Event` row has no trace column (see the trace-context-in-event-bodies section below), so only rows arriving live over SSE have a `traceparent` to work with. The show page now ships its own browser telemetry too — see "The Spine's browser bootstrap and trace continuation" below. |
| `apps/shuffler/test/harness-telemetry/` | The verify suite's own tracing — not a ship. `harnessTracing.ts` (provider), `spanPlan.ts` (pure + tested), `otelReporter.ts` (Playwright reporter). Service `mtg-fleet-verify`. See "Dev-tooling telemetry" below. |
| `apps/shuffler/src/port-spine/` | `HttpSpineGateway`/`FakeSpineGateway` implement `SpinePort` (`join`, `sendEvent`), wired into `server.ts` alongside the existing `tabletopPort`. Rewritten onto the new Spine's single `POST /join` and `contracts/envelope.v3.json` (`shuffler-spine-gateway-stale` closed). `sendEvent` still builds its envelope via `buildCardPlayedEvent`/`currentTraceparent()` (those helpers are shared with the Tabletop-facing send and still mint a `traceparent` value onto the envelope object), but now **strips `traceparent` out of the body before serializing** — `envelope.v3.json` has `additionalProperties: false` and no `traceparent` property, so sending it would be rejected outright. No header is hand-set to compensate: undici's OTel auto-instrumentation already injects a live `traceparent` header on every outbound `fetch()`, appending its own after any explicit headers unconditionally, so a hand-set header here would only risk a duplicate or a stale value. Net: mint-for-the-object/strip-from-body/say-nothing-about-the-header is the correct shape, not a partial fix. Otherwise adds no new telemetry wiring on purpose — rides the same undici auto-instrumentation as every other outbound call, and copies the best-effort failure shape (span attribute + `log.warn`, never throws). |

**The house pattern for a failure path**: (1) **attributes first** —
`markCurrentSpanAsError(message, {...})` with the failure kind, the inputs, and the reason; (2)
**then the log, only for the stack** — `log.error("...", {...}, error)`. The third argument
becomes `exception.type`/`.message`/`.stacktrace`, which is the part a span has no room for. Don't
duplicate onto the log what's already on the span.

**Manual span creation is almost nonexistent.** Across all three ships there are a handful of call
sites: `apps/tabletop/src/server/server.ts` (`tracer.startActiveSpan("ws connect", ...)`),
`apps/tabletop/src/client/TablePage.tsx`, `apps/tabletop/src/client/useCardArrivalSpans.ts`, plus
`inSpan` itself. **The Shuffler creates zero manual spans** — it lives entirely off
auto-instrumentation plus stamping attributes onto whatever span already exists. That's why
`markCurrentSpanAsError`/`setCommonSpanAttributes` matter so much.

**`usePhysicsAnnouncements.ts` generalizes the same pattern from one span to a whole vocabulary.**
Where `useCardArrivalSpans.ts` is `store.listen()` → `inSpan()` for exactly one named event, the
newer hook fans the same shape across many kinds of tldraw store mutations
(`card.tapped`/`untapped`, `card.flipped`, `card.turnedFaceDown`, `card.zoneMoved`,
`counter.attached`, plus a generic `shape.created`/`moved`/`changed` fallback). Both hooks are
wired side by side in `TablePage.tsx`. Rules worth keeping for a third such hook:

- **Filter by tldraw's `source` option** (`"user"` vs `"remote"`), not by re-deriving "was this
  me" — a remote peer runs the same hook locally and announces its own gestures under its own
  actor, so no cross-client attribution logic is needed.
- **Every span carries `actor: TAB_ID`** (tldraw's per-session sync id) — the same per-tab
  correlation idea as the Shuffler's `game.browser_tab_id`, different mechanism, same purpose.
- **Not every store diff can announce immediately.** Named gestures (tap, flip, zone move) come
  from single-shot writes and fire straight off the diff. `Translating.ts` writes fresh x/y on
  **every pointer-move** during a drag, with no batching to settle — so only the generic
  `shape.moved`/`changed` fallback debounces (`GENERIC_SETTLE_MS` = 300ms per shape id); named
  paths stay immediate. Detection itself lives where each gesture's own hook already computes it
  (`MtgCardShapeUtil`) — this listener only translates the resulting mutation, never re-implements
  gesture detection.

### Trace context embedded in event bodies

Two mechanisms carry trace context on this fleet:

1. **HTTP-header propagation** — automatic, via undici auto-instrumentation on outbound
   `fetch`/HTTP calls. This is how a Shuffler-initiated trace continues into the Spine (Rack
   instrumentation extracts the inbound W3C header) with zero application code.
2. **Body-embedded `traceparent`** — a W3C `00-{traceId}-{spanId}-{flags}` string minted into a
   JSON payload for data that outlives the request.

**The Spine's event contract (`contracts/envelope.v3.json`) drops mechanism 2 entirely** —
`additionalProperties: false`, no `traceparent` property. Inbound (`POST
/tables/:table_id/events`), trace context travels only via the HTTP header; the persisted `Event`
row has no trace column, by design — an event minted before anyone is watching its table's SSE
stream has no way to link back to the trace that created it, an accepted tradeoff
(`services/spine/CLAUDE.md`). Outbound SSE (not yet implemented) is specified to carry
`meta.traceparent` as a **sibling** field alongside the envelope, not merged into it.

**Outbound SSE now has a real consumer, not just a link-builder.** The Spine's admin
show page (`views/admin/tables/show.html.erb`) parses each live SSE message's
`meta.traceparent` into an OTel `SpanContext` (`{traceId, spanId, traceFlags,
isRemote: true}`) and opens a genuine **child span** in that same trace —
`Hny.inChildSpan("spine-admin", "table.event.displayed", spanContext, fn)` — rather than
only building a clickable trace URL from it. This is the fleet's first browser-side
"mint a real span from a body-embedded traceparent" consumer; previously `meta.traceparent`
was read only to construct a URL. See "The Spine's browser bootstrap and trace
continuation" below for the full shape and its consequence for trace duration.

**Two live body-embedded mint sites remain**, both format identically
(`00-{traceId}-{spanId}-{flags}`):

| Where | Behavior with no active span |
| --- | --- |
| `apps/tabletop/src/client/observability/index.ts` `currentTraceparent` | Returns `undefined` — used only for websocket-URL propagation, never a durable field, so "no span, no value" is correct there. |
| `apps/shuffler/src/port-tabletop/traceparent.ts` `currentTraceparent` | Synthesizes a well-formed random traceparent when no active span exists, and sets `traceparent.synthesized: true` on the active span when that fallback fires — so a real occurrence in production is visible rather than a silent trace-shaped string that links nowhere. Correct for the Tabletop-facing `card.played`/`seat.joined` envelope. `HttpSpineGateway.sendEvent` also builds its envelope via this helper (shared `buildCardPlayedEvent`) but now strips the resulting `traceparent` field out of the body before POSTing to the Spine — `envelope.v3.json` rejects the field outright, and trace context reaches the Spine via the HTTP header instead (undici auto-instrumentation, automatic). This is deliberate, not a leftover: the helper still needs to run (it's shared plumbing for the envelope object), only the wire format differs per destination. |

### The Shuffler's browser bootstrap (one shell, `html-layout.ts`)

There is exactly ONE place the Shuffler's browser telemetry starts: `formatHtmlHead()` in
`apps/shuffler/src/view/common/html-layout.ts`.

Script order, load-bearing:

1. `<script src="/browser-tab-id.js">` — sets `window.browserTabId` from sessionStorage (mints a
   `crypto.randomUUID()` on first use; per-tab, survives reload). Also registers the
   document-level `htmx:configRequest` listener that adds `X-Browser-Tab-Id` to every htmx
   request.
2. `<script src="/hny.js">` — the vendored Honeycomb web SDK.
3. Inline init: `initHoneycombTracing(apiKey)` — a named function, guards on `window.Hny &&
   window.browserTabId` **and** on the apiKey being non-empty/non-`"undefined"`, then calls
   `Hny.initializeTracing({ apiKey, serviceName: "mtg-deck-shuffler-web", ...,
   resourceAttributes: { "game.browser_tab_id": window.browserTabId } })`.

**The order is load-bearing**: the tab id is baked into the OTel resource, immutable after init,
so `browser-tab-id.js` must run first. Don't reorder, and don't move the init into a deferred
script.

**How the correlation works:** `game.browser_tab_id` lands on every browser span (resource
attribute); the `X-Browser-Tab-Id` header lands on every htmx request, where server middleware
stamps it via `setCommonSpanAttributes({ browserTabId })`. That pair is the browser↔server join
key, per tab.

**The apiKey**: `process.env.HONEYCOMB_INGEST_API_KEY || process.env.HONEYCOMB_API_KEY`, read
per-render. `HONEYCOMB_INGEST_API_KEY` is set nowhere in this repo; in prod the fallback is what
actually fires. **Don't simplify away the first choice without checking prod** — it's the
deliberate override slot. Key-in-page is sanctioned here (Invariant 3 — the Shuffler has no
collector, only the Tabletop does).

**The guard covers the key, not just presence of `Hny`/`browserTabId`.** The whole guard+init
body ships as one exported literal script-source string constant, `HONEYCOMB_TRACING_INIT_SCRIPT`
(`apps/shuffler/src/view/common/html-layout.ts`), so the exact source the browser runs is also
what `apps/shuffler/test/html-layout-tracing-guard.test.ts` evals (via `new Function`) — no
separate reimplementation to drift out of sync. Never add a **second** bootstrap anywhere — one
shell is the whole point.

### The Spine's browser bootstrap and trace continuation

The Spine's admin show page (`views/admin/tables/show.html.erb`) is the **first Spine
page to ship any browser JS or telemetry at all** — before this, the Spine had zero
static-asset serving. It also establishes the no-bundler pattern for the next Spine page
that needs one: vendor `hny.js` verbatim (the Shuffler's `apps/shuffler/public/hny.js`,
byte-identical here at `services/spine/public/hny.js`), serve it via Roda's `plugin
:public` + `r.public` (`app.rb`), and guard init exactly like the Shuffler's
`initHoneycombTracing` — skip with `console.warn` on a missing/invalid key, never throw.

**Wiring**: `GET /admin/tables/:id` now passes `honeycomb_api_key: ENV["HONEYCOMB_API_KEY"]`
into the show-page locals alongside the existing `team_slug`/`env_slug`. Same
direct-key-in-page shape as the Shuffler (Invariant 3) — sanctioned for the Spine too
since there's no collector and standing one up for one admin page is disproportionate.
The page calls `Hny.initializeTracing({apiKey, serviceName: "mtg-spine-admin"})` — a new,
separate service name from the server-side `"mtg-spine"`.

**The child-span shape, and why it's a child and not a link.** On `stream.onmessage`, the
page parses `message.meta.traceparent` into an OTel `SpanContext` and calls
`Hny.inChildSpan("spine-admin", "table.event.displayed", spanContext, fn)`, stamping
`event.name`/`event.seq` on the resulting span. This was a deliberate, reviewed choice:
the goal is **one Honeycomb trace** covering "player joined" all the way to "operator saw
it on screen." A link would have put the display in a disconnected second trace instead.

**Consequence, not a bug: this stretches reported trace duration.** The parent (server)
span that created the event is typically already ended by the time a human is looking at
the admin page, so the child's start time can land well after its parent's end. Honeycomb
computes trace duration from min-start to max-end across the whole `trace_id`, so the
trace's reported duration now covers real delivery-to-screen latency. On this specific
trace shape (event-creation → admin-display) that's the intended signal — don't read a
long duration here as a performance regression, and don't "fix" it by switching back to a
link.

Verified live end-to-end, not just via the Minitest HTML-assertion test
(`test/integration/admin_screen_test.rb`): ran the app with real telemetry env, drove a
real headless Chromium browser via Playwright, posted an event, and confirmed in
Honeycomb that a `table.event.displayed` span (`service.name mtg-spine-admin`) landed as a
genuine child of the server's `POST /tables/:table_id/events` span — same `trace_id`,
carrying `event.name`/`event.seq`.

### Dev-tooling telemetry (the pattern for instrumenting our own tools)

The Shuffler's Playwright verify suite traces itself to service **`mtg-fleet-verify`**, team
`modernity`, env `local` — the fleet's first instrumentation of a *tool* rather than a *ship*.
Files: `apps/shuffler/test/harness-telemetry/`. This is the shape `notes/add-opentelemetry.md`
should point at when the next tool wants tracing:

- **One emitter, and it's the reporter.** With `workers: 1`, Playwright's step tree already
  carries every `page.goto`/`waitForTimeout`/assertion. One process = one provider = one flush,
  no spec-file changes. Spans are built at the end from recorded timestamps rather than held open
  across hooks, which is what lets the shape logic (`spanPlan.ts`) be a pure, unit-tested function.
- **Own `BasicTracerProvider` + `BatchSpanProcessor`.** No `NodeSDK`, no auto-instrumentation (it
  would trace the runner's own fs/http/child_process), no sampler, no context manager, no
  propagators.
- **No context manager means parenting is manual** — every child is parented by hand via
  `trace.setSpan(parentContext, span)`. Forgetting it doesn't error, it just yields a few thousand
  sibling roots; `spanPlan.test.ts`'s parent-child assertions guard against that silently
  happening.
- **Fleet-neutral service name** (`mtg-fleet-verify`, with the ship as a `verify.ship` attribute)
  so other suites can export to the same place and be compared.
- **Run identity on EVERY span**, via a `RunAttributesSpanProcessor` stamping at `onStart`
  (`verify.run.id`, `verify.ship`, `verify.git.sha`) — copied from the Tabletop browser wrapper's
  `GlobalAttributesSpanProcessor`, the fleet's established way to do this.
- **Non-default `BatchSpanProcessor` settings are required at this volume**: `maxQueueSize:
  8192`, `scheduledDelayMillis: 1000`. The defaults (2048 / 5000ms) drop on overflow **silently**.
- **Attributes beat spans here too** (Invariant 1, applied to signal). An `expect` faster than
  `EXPECT_THRESHOLD_MS` (100ms — owner's call, keep it there) hid no time by definition, so it
  becomes `test.expect.count`/`.total_ms`/`.suppressed_count` on the test span instead of a span
  of its own.
- **Telemetry is never fatal and never blocking.** An empty team key counts as unconfigured,
  `shutdown()` is bounded by a `Promise.race` with an `unref()`'d timer, and every reporter hook
  is wrapped.
- **Trace context is deliberately NOT propagated into the browser during verify runs.** The app's
  `ParentBasedSampler` would honor a sampled remote parent and never consult
  `BackgroundChatterSampler`, tracing every static asset at 100%. Harness and app spans correlate
  by `verify.run.id` and time, in separate datasets, instead.
- **A synchronously-throwing exporter leaves `BatchSpanProcessor`'s flush timer armed forever** —
  the result callback never arrives. Fixed here with a `NeverThrowingExporter` wrapper: a failed
  export must look like a failed export, not an exception. The ships hand bare OTLP exporters to
  `NodeSDK` and have the same latent gap — worth fixing next time either `tracing.ts` is opened,
  not urgent since `OTLPTraceExporter` reports transport failures through its callback rather than
  by throwing.
- **Synthesizing a span from timestamps captured outside the process** (e.g. `verify build`'s
  `tsc` phase): OTel reads a bare number as **millis** and errors on none of the ways you can get
  it wrong (seconds → 1970, nanos → year 55000, `undefined` → `NaN`). Guard with a plausibility
  window (within 24h of now), skip the span if the timestamp is absent, and reject
  end-before-start.

### Volume: what still matters and what doesn't

**There is no ingest budget on this fleet, in `local` or in prod.** _(Jess, directly: "I work at
Honeycomb. Ingestion is free.")_ Do not reintroduce a cost argument for sampling, thresholding,
aggregating, or not logging, in any ship, for any signal.

Two reasons to still be deliberate survive, and neither is money:

1. **Can a human read the trace?** ~10,000 spans is where a waterfall gets hard to read; ~1,000
   is comfortable (measured against the verify harness's real waterfall). This is a usability
   ceiling, unaffected by ingestion cost.
2. **Does this span tell anyone anything?** A dataset of mostly-trivial spans is harder to query
   well than fewer informative ones — noise crowds out the `GROUP BY` you actually wanted. This is
   why Invariant 1 prefers attributes: an attribute on an existing span sharpens it, a trivial
   child span dilutes the dataset.

So the question to ask of a proposed span is **"what would I learn from it?"**, never "what does
it cost?". If the answer is "nothing, by construction" (a 3ms assertion, 200 static-asset
fetches), roll it into a count attribute. If it would answer a real question, emit it however many
that turns out to be.

### Secrets and source order

`.env` in each ship sets `OTEL_EXPORTER_OTLP_HEADERS="x-honeycomb-team=$HONEYCOMB_API_KEY"`,
interpolated **at source time**. `HONEYCOMB_API_KEY` lives in `.be` at the repo root. So `.be`
must be sourced **before** `.env`, or export silently 401s ("unknown API key").

- Repo-root `./run` sources `.be` then delegates — the Spine step is conditional on
  `services/spine/run` existing.
- `apps/tabletop/run`, both ships' `verify.sh`, and `services/spine/run` each walk `.be` then
  `"$REPO_ROOT/.be"`, then `.env`, and warn if neither `.be` candidate is found.
- All three `deploy.sh` source `.be` then `.env` (the deploy marker's key lives in `.be`).
- **`apps/shuffler/run` deliberately does NOT source `.be`** — only `.env`. `.be` also runs
  `kubectl config use-context orion`, a side effect on your kube context that's wrong for an
  ordinary app start. Documented in `notes/AGENT-NOTES.md` → "Don't source `.be` from `./run`". If
  a hand-started Shuffler 401s, source `.be` in your shell first, or use the repo-root `run`.

**"Configured" is not "present": `.env` alone produces a keyless header.** Without `.be`, `.env`
still sets `OTEL_EXPORTER_OTLP_HEADERS="x-honeycomb-team="` — present, non-empty as a string, and
useless. Any silent-off guard must treat an **empty team key as unconfigured**;
`isTelemetryConfigured()` in `harnessTracing.ts` is the reference implementation.

**There are TWO Honeycomb keys in `.be`, and they are not interchangeable.**

| Variable | Environment | Access | Used by |
| --- | --- | --- | --- |
| `HONEYCOMB_API_KEY` | `local` | `createDatasets` only | OTLP export from every ship |
| `HONEYCOMB_MARKER_KEY` | `mtg-deck-shuffler` | `markers`, `events`, `queries`, … | `scripts/deploy-marker.sh` only |

The ingest key **cannot** write markers and points at the wrong environment. Verify a key with
`curl -s https://api.honeycomb.io/1/auth -H "X-Honeycomb-Team: $KEY"` — it returns the environment
and the access flags.

**Deploys leave a marker** (`scripts/deploy-marker.sh`, called by all three `deploy.sh`, after
`kubectl rollout status`, so a marker means a deploy that landed). Two deliberate properties:
best-effort (`|| true` — a marker problem must never read as a failed deploy), and it refuses to
mark the wrong environment (resolves the key's environment via `GET /1/auth` and declines on
mismatch — posting to the wrong environment otherwise *succeeds silently*). Each `deploy.sh` also
tags the commit locally (`deploy-<ship>-<timestamp>`), never pushed, so the Honeycomb marker is
the more durable record of what shipped when.

**Where the data lands.** Honeycomb team `modernity`, MCP server `honeycomb-modernity`. Local →
env `local`, datasets `mtg-deck-shuffler`, `mtg-deck-shuffler-web`, `mtg-tabletop`,
`mtg-tabletop-web`, `mtg-fleet-verify` (dev tooling, not a ship — fleet-wide by design). Prod → env
`mtg-deck-shuffler` (orion cluster, jessitron-sandbox).

## Evidence: how to show a change is observable

Safe Harbor says a change is home when it's "deployed and observable in Honeycomb" — that claim
should be **linkable**, not just asserted.

**Honeycomb query runs never expire — they are visible forever. So are traces, once viewed.**
_(Jess, authoritative.)_ A query-run URL (`…/datasets/<dataset>/result/<pk>`) and a trace URL are
permanent citations: put them in the commit message or here, and they will still resolve later.
Don't hedge about them going stale, and don't re-run a query just to get a "fresh" link.

Worked example of what "verified in Honeycomb" looks like for this fleet (team `modernity`, env
`local`):

| Shows | Link |
| --- | --- |
| A real failure end to end: root `POST /deck` ERROR/500 → handler span → the log as a `span_event` → client `GET` 404 | [trace](https://ui.honeycomb.io/modernity/environments/local/result/JuiA57ZyqG1/trace?trace_id=f73482b9f01d9903db99b5b94f8a72c8) |
| The log record: `exception.type`/`.message`/`.stacktrace`, and `trace.parent_id` tying it to the span | [result](https://ui.honeycomb.io/modernity/environments/local/datasets/mtg-deck-shuffler/result/CmtTT79DdNd) |
| `http.route` still present after editing `tracing.ts` — the standing check that ESM patching didn't break | [result](https://ui.honeycomb.io/modernity/environments/local/datasets/mtg-deck-shuffler/result/XjiiDPeuDc) |

## Related reading

`SEAMAP.md` + the three ship SEAMAPs (the "Observability is mandatory" line), root `CLAUDE.md` →
Observability, `notes/AGENT-NOTES.md` (`.be` ordering, browser collector, the worktree
`node_modules` phantom-error mechanism), `notes/add-opentelemetry.md` (the runbook for a new TS
service, tracing and logs both), `notes/instrument-essential-fields.md`,
`services/spine/interpreter/docs/journeys/guide/15-listeners-and-telemetry.md`.
