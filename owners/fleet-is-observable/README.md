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
uncaught-error log pipeline. **Five config spots are scheme-coupled and must agree**:
`BROWSER_OTLP_TRACES_URL` and `BROWSER_OTLP_LOGS_URL` in `apps/tabletop/k8s/configmap.yaml`, the
CORS `allowed_origins` in `apps/tabletop/k8s/collector.yaml`, and both the Shuffler's and Spine's
`TABLETOP_PUBLIC_URL` (`apps/shuffler/k8s/configmap.yaml`, `services/spine/k8s/configmap.yaml`).
"Add TLS back" touches all five, plus the Tabletop README's Licensing section — it isn't a
one-file ingress tweak.

**Watch point for any ingress in the `tabletop-http` IngressGroup**: every ingress sharing
`alb.ingress.kubernetes.io/group.name` reconciles as **one ALB** — one malformed ingress anywhere
in the group can block `FailedDeployModel` routing changes to *every* ingress in it, including the
one carrying `/v1/traces`/`/v1/logs`. (This happened once, for about 27 hours, from a since-removed
sibling ingress; the fix was deleting the bad ingress from git and the cluster — there is no
standing hazard today, but the failure mode is worth knowing before adding a second ingress to
this group.)

### 4. Head-sample health checks; keep all user activity.

A sampler that stops matching keeps 100% of the chatter and says nothing about it. So sampling
logic lives in its own module with tests — **on both Node ships now**
(`apps/shuffler/src/telemetry-sampler.ts` + `apps/shuffler/test/telemetry-sampler.test.ts`, and
`apps/tabletop/src/server/telemetry-sampler.ts` + `apps/tabletop/test/telemetry-sampler.test.ts`)
— and reads **both** semconv spellings of every attribute it depends on
(`http.user_agent`/`user_agent.original`, `http.target`/`url.path`) — a gem that switches spelling
out from under the sampler shouldn't be able to silently disable it. The Tabletop's sampler was
extracted from an inline class in its `tracing.ts` and given tests on 2026-08-12; it still differs
from the Shuffler's in what it matches (no static-asset-by-extension handling — the Tabletop only
head-samples probes + `/health`), but the "own module, both spellings, tested" shape now holds on
both.

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

- **Deploys leave a marker.** All three `deploy.sh` call `scripts/deploy-marker.sh <ship>` _after_ a successful rollout (type `deploy`, message `deploy <ship> <short-sha>`, linking the GitHub commit), and each tags the commit `deploy-<ship>-<timestamp>` locally. The marker call is best-effort (`|| true`) — the deploy has already landed, so a marker problem must never read as a failed deploy.

- **API key sourcing**: each ship's `.env` sets `OTEL_EXPORTER_OTLP_HEADERS="x-honeycomb-team=$HONEYCOMB_API_KEY"`, interpolated **at source time**. `HONEYCOMB_API_KEY` lives in `.be` **at the repo root** (sourced on `cd` into the repo). So `.be` must be sourced 

- **Two keys, two environments.** `HONEYCOMB_API_KEY` is the **`local`** ingest key (access: `createDatasets` only). `HONEYCOMB_MARKER_KEY`, also in `.be`, is a **`mtg-deck-shuffler`** (prod) key with Markers access — used only by `scripts/deploy-marker.sh`. Don't cross them: the ingest key cannot write markers, and marking the wrong environment succeeds silently, which is why the marker script checks the key's environment via `/1/auth` before posting.

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

**Adding `undici` as an explicit dependency (for its `Agent`/`Dispatcher` API on global `fetch`)
must pin the same MAJOR version Node itself vendors internally — not just "whatever's newest."**
Node's global `fetch` is undici, and it passes its own internal request-handler object to
`dispatcher.dispatch()`. undici 8 redesigned that handler interface in a breaking way (renamed
methods like `onRequestStart`), so installing undici@8.x while Node vendors undici 7 internally
makes **every** `fetch()` call throw `InvalidArgumentError: invalid onRequestStart method` /
`UND_ERR_INVALID_ARG` — confirmed with a standalone repro (plain Node http server + `fetch(url, {
dispatcher: new Agent(...) })`) before touching real code. `process.versions.undici` reports the
vendored major (Node 25.6.1 vendors `7.21.0`); the Tabletop's `apps/tabletop/package.json` pins
`"undici": "^7.29.0"` for exactly this reason. `Agent`/`Dispatcher` are not Node builtins — there
is no `node:undici`, and `globalThis.Agent` is `undefined` — so this landmine is waiting for any
ship that reaches for the explicit package rather than relying on the ambient global `fetch`.

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
| `apps/shuffler/src/tracing_util.ts` | **Helpers, not a wrapper**: `setCommonSpanAttributes()`, `stampRouteParamsOnSpan()` (writes `http.route.param.<key>`), `markCurrentSpanAsError()`. Callers still `import { trace } from "@opentelemetry/api"` directly. `CommonAttributes` carries the fleet's small set of always-relevant span attributes: `archidektDeckId`→`deck.archidektId`, `deckSource`→`deck.source`, `browserTabId`→`game.browser_tab_id`, `sessionId`→`session.id` (`SPAN_ATTRIBUTE_SESSION_ID`, added for the envelope `initiator.sessionId` field — see "The Shuffler's page-load `sessionId` is on every request span as `session.id`" below), `devMode`→`app.dev_mode` (`SPAN_ATTRIBUTE_DEV_MODE`), and now `tableName`→`table.name` (`SPAN_ATTRIBUTE_TABLE_NAME`, reusing the spelling the Tabletop already stamps) / `playerName`→`player.name` (`SPAN_ATTRIBUTE_PLAYER_NAME`). `undefined` values are dropped by `setAttributes`, so **solo games stamp no `table.name`/`player.name` at all** — their absence is the "solo" signal. The one exception is `devMode`: a real `false` **is** stamped, so `app.dev_mode=false` is filterable — see the dev-mode note below. See the table/player note below for where these get stamped. |
| `apps/shuffler/src/apply-game-command.ts` | All **13** of `app.ts`'s game-mutation routes (`reveal-card`, `put-in-hand`, `put-on-top`, `put-on-bottom`, `shuffle`, `mulligan`, `move-hand-card`, `undo`, `draw`, `flip-card`, `flip-card-modal`, `play-card`, `discard-card`) go through `applyGameCommand(deps, gameId, expectedVersion, mutate, beforeMutate?)`, which is Express-free and owns the "not-found" / "incompatible-version" `markCurrentSpanAsError` calls plus the persist-then-return protocol, guaranteeing identical telemetry across every route regardless of rendering. `renderApplied` may return `string | void` so a route that must send its own response (e.g. `flip-card-modal`'s `res.render(...)`) still fits. `play-card`/`discard-card` mutate+persist immediately like every other route, in table mode too — there is no synchronous failure signal to the player for a `card.played` delivery problem; delivery is best-effort only (see the port-spine row below). `beforeMutate?` is still exercised: `play-card`/`discard-card` pass one, calling only `sendCardPlayedToSpineBestEffort` (never throws, so it can't abort the mutate/persist that follows). No route in `app.ts` runs a hand-rolled retrieve/reconstruct/status-check/version-check/mutate/persist protocol. **Open**: `CommandOutcome.kind` isn't stamped on the span for the non-error outcomes (`not-active`/`version-conflict`/`applied`) — only the two error paths get an attribute today. |
| `apps/shuffler/src/app.ts` `POST /start-game` | Right after `GameState.newGame()`/`game.startGame()`, before the table-join branch, a manual `trace.getActiveSpan()?.setAttributes({...})` call (not routed through `CommonAttributes` — one-off, like the `seat.id` stamp below) adds `deck.name` (from `prep.deck.name`) and `commander.names` (a string array, from `game.listCommanders().map(c => c.card.name)`) to every game-start span, solo and table-mode alike. Verified live in Honeycomb (`local`): `deck.name: "Timey-Wimey"`, `commander.names: ["Rose Tyler","The Tenth Doctor"]`. The Tabletop needed no change — its "add player furniture" span (`apps/tabletop/src/server/seatJoined.ts:101`) already carries `commander.names`/`commander.count`, sourced from the Shuffler's `seat.joined` payload, not this span. |
| `apps/tabletop/src/server/tracing.ts` | A **separate** Node SDK init, modeled on the Shuffler's. `ParentBasedSampler({root: BackgroundChatterSampler})` — the sampler is now an imported module (`./telemetry-sampler.js`), no longer inline. No middleware suppression. Same `logRecordProcessors` wiring and shutdown-hook install as the Shuffler. |
| `apps/tabletop/src/server/telemetry-sampler.ts` | The Tabletop's head-sampler, **extracted from `tracing.ts` and given tests on 2026-08-12**. Exports a pure `sampleRatioFor(attributes): number` and class `BackgroundChatterSampler` (unchanged `ParentBasedSampler` root wrapper). Keeps `0.001` of `kube-probe`, `0.01` of `elb-healthchecker` (by UA), and `0.01` of `/health` (by path); 100% of everything else. UA is checked **before** path, so a kube-probe on `/health` stays at its own lowest rate. Reads **both** semconv spellings — `http.user_agent`/`user_agent.original` and `http.target`/`url.path`, stripping the query string off the path first (Invariant 4). Unit tested (`apps/tabletop/test/telemetry-sampler.test.ts`, 12 cases incl. unmatched-UA falling through to 1.0). **Still narrower than the Shuffler's**: no static-asset-by-extension handling — deliberately not added (Jess asked only for `/health`). |
| `apps/shuffler/src/view/common/html-layout.ts` | The Shuffler's **single-sourced** browser telemetry bootstrap. `formatHtmlHead(options)` is the one page shell every Shuffler page's `<head>` goes through — EJS pages via `views/partials/head.ejs`, TS pages via `formatPageWrapper` — so the bootstrap appears exactly once. The guard+init is now `initHoneycombTracing(apiKey, devMode, tableName, playerName, gameId)`, shipped as the exported literal string `HONEYCOMB_TRACING_INIT_SCRIPT`, tested by evaling that exact string. `HONEYCOMB_TRACING_INIT_SCRIPT` stays a **static** constant; the five values pass as **arguments** at the call site (per the guard test's constraint) — the three string args (`tableName`, `playerName`, `gameId`) go through a new `jsStringArg()` = `JSON.stringify(value).replace(/</g, "\\u003c")` helper that both escapes the JS string literal and neutralizes `</script>` break-out / XSS (an absent value → the literal `undefined`). See "The Shuffler's browser bootstrap" below for the script order and the apiKey fallback. |
| `apps/tabletop/src/client/observability/index.ts` | **The only real wrapper in the fleet.** Browser-only, self-described as "our own wrapper around the standard OpenTelemetry web SDK — nothing Honeycomb-specific." Surface: `initTracing()`, `inSpan()`, `setGlobalAttrs()` (via `GlobalAttributesSpanProcessor`, stamping e.g. `table.name` on every span), `currentTraceparent()`. Learns its destination by fetching `/otel-config.json`; tracing off is a valid local mode (logs a line, returns). |
| `services/spine/` | Roda + Sequel + SQLite + Minitest. `config/telemetry.rb`: `OpenTelemetry::SDK.configure` with `opentelemetry-exporter-otlp`, `opentelemetry-instrumentation-rack`, and `opentelemetry-instrumentation-net_http`, `service_name` `"mtg-spine"`. `app.rb` mounts Rack explicitly (`use(*OpenTelemetry::Instrumentation::Rack::Instrumentation.instance.middleware_args)`), required for Roda; Net::HTTP instruments automatically once installed. The inline `KeepItDownSampler`, assigned after SDK configuration, keeps 1% only when `url.path == "/spine/up"`, keeps 100% of everything else, and stamps `sample_rate`; unlike the Node samplers it is not extracted or tested and reads only one semconv spelling. `services/spine/run` follows the same `.be`-then-`.env` pattern as `apps/tabletop/run`, polling `GET /up`. Query this fleet's data via the **`honeycomb-modernity`** MCP server (team `modernity`) — not the default `honeycomb` server, which points at an unrelated demo team and has no fleet data; picking the wrong one looks like "no spans" and can be mistaken for a wiring bug. **Still open**: no logs pipeline (`spine-logs-in-traces` in `TODO.md`). |
| `services/spine/app.rb` `POST /join` and `POST /tables/:table_id/events` | Both routes add application-level span attributes, Invariant-1 style: `current_span.add_attributes(...)` for inputs as soon as parsed, then a result attribute on success (`join.result`, `event.result`). `join.result` is now `"created"`, `"joined"`, or `"replayed"`; `event.result`'s dedup path remains `"duplicate"`, distinct from `"accepted"`. `POST /join`'s attributes and JSON response both now also carry `seat.id`/`seatId` — the Spine-minted seat UUID, threaded back to the Shuffler so both ships stamp the same seat identity (see "The Spine-minted seat id is on the Shuffler's join-route spans as `seat.id`" below). The same input-attributes call also now stamps `"game.id" => game_id` (the Shuffler's incoming id) right after `game_id`/`name`/`player_name` are parsed — so the ambient span later carrying `seat.id`/`table.position` also carries `game.id`, correlating both ids on one span/trace; asserted by `test_join_span_correlates_the_incoming_game_id_with_the_minted_seat_id` (`services/spine/test/integration/join_test.rb`). Failure paths share `mark_span_failed(attribute, result, error)`. `current_span` is the ambient Rack span; the routes create no manual span. Contract violations become the `contract_violation` result. After an idempotent join commits, `TabletopNotifier` best-effort POSTs the persisted `seat.joined`; its bounded `tabletop.send.result` is one of `sent`, `sent_replay`, `missing_config`, `invalid_config`, `non_2xx`, `timeout`, or `network_error`, with status/error detail where applicable. Delivery failure never changes the successful join span's status or response. |
| `services/spine/test/test_helper.rb` `CapturesSpans` | The Spine's **first span-assertion test infra** — previously the Spine had no way to assert on span attributes in tests at all (unlike the Node ships' hand-rolled `RecordingSpan` fakes or the Shuffler's eval-the-script `html-layout-tracing-guard.test.ts` approach). Registers a second, **additive** span processor at file load — `OpenTelemetry::SDK::Trace::Export::InMemorySpanExporter` wrapped in a `SimpleSpanProcessor`, added via `OpenTelemetry.tracer_provider.add_span_processor` — alongside whatever `config/telemetry.rb`'s `OpenTelemetry::SDK.configure` already installed; it only adds spans, never replaces or blocks the app's own OTLP export. `CapturesSpans` (mixed into every `Minitest::Test`) resets the exporter in `before_setup` and exposes `finished_spans`. First consumer: `join_test.rb`'s `test_join_span_correlates_the_incoming_game_id_with_the_minted_seat_id`, above. Reuse this pattern — mix in `CapturesSpans`, read `finished_spans` — for any future Spine test that needs to assert on span attributes, rather than standing up a new exporter. |
| `services/spine/app.rb` `GET /admin/tables` and `GET /admin/tables/:id` | The Spine's admin screen (ticket 06) follows the same house pattern: `current_span.add_attributes("admin.table_count" => ...)` on the index, `"table.id"`/`"admin.result" => "found"` on the show route, and the shared `mark_span_failed("admin.result", "not_found", error)` on a missing table — no new telemetry shape introduced, just the existing one applied to a third route pair. **`HONEYCOMB_ENV_SLUG` is now set in prod** (`services/spine/k8s/configmap.yaml`, `HONEYCOMB_ENV_SLUG: "mtg-deck-shuffler"`, alongside `HONEYCOMB_TEAM_SLUG: "modernity"`) — the Spine's first production deploy resolved the TODO this row used to flag; `ENV.fetch("HONEYCOMB_ENV_SLUG", "local")`'s fallback now only fires locally, and the comment at that call site in `app.rb` was updated to say so rather than "still pending." Rows already in the log when the page loads render with no trace link at all — the `Event` row has no trace column (see the trace-context-in-event-bodies section below), so only rows arriving live over SSE have a `traceparent` to work with. The show page now ships its own browser telemetry too — see "The Spine's browser bootstrap and trace continuation" below. |
| `services/spine/app.rb` `SPINE_BASE_PATH` route wrapping | The Spine's first production deploy (`services/spine/deploy.sh`, `services/spine/k8s/`) put the Spine behind the **same ALB and host as the Shuffler** (`mtg.jessitron.honeydemo.io/spine`) instead of its own subdomain — AWS ALB ingress can't strip a path prefix, so `app.rb`'s `route do |r| ... end` wraps its entire route table in `r.on(prefix) { dispatch(r) }` when `SPINE_BASE_PATH` (`k8s/configmap.yaml`: empty locally, `"/spine"` in prod) is set, with `dispatch(r)` holding the actual routes so both branches reach identical definitions. This is genuinely new telemetry-adjacent surface — an `r.on` wrapper now sits in front of every route the Rack instrumentation sees. **Verified only shallowly so far**: a container smoke test confirmed spans are still emitted (Rack instrumentation logged its usual "successfully installed" line, and `/spine/up`/`/spine/admin/tables` both responded) but `http.route`/span-naming shape under the wrapped prefix has **not** been checked against a real deployed ALB, only locally in Docker. If a future span shows a missing, doubled, or malformed `http.route` (e.g. `/spine` appearing twice, or the prefix swallowed) once this is live in prod, start here — it's the first and only place in the fleet a route table is wrapped in an extra routing layer after the instrumentation is mounted. |
| `apps/shuffler/test/harness-telemetry/` | The verify suite's own tracing — not a ship. `harnessTracing.ts` (provider), `spanPlan.ts` (pure + tested), `otelReporter.ts` (Playwright reporter). Service `mtg-fleet-verify`. See "Dev-tooling telemetry" below. |
| `services/spine/lib/sse_stream.rb` | `SseStream#each` yields a `: heartbeat\n\n` SSE **comment frame** immediately on connect, then again every `HEARTBEAT_INTERVAL_SECONDS` (constant, default 15; `heartbeat_interval_seconds:` is an optional constructor kwarg for test speed only — `app.rb` never passes it) while nothing's been published, via `@queue.pop(timeout: @heartbeat_interval_seconds)` — Ruby's `Thread::Queue#pop` returns `nil` on timeout rather than blocking forever, so a real message still short-circuits the wait immediately. Two reasons it exists: (1) Puma, like most Rack servers, doesn't flush a streamed response's headers until the body's `each` yields a first chunk, so a fresh table with nothing played yet would otherwise send no bytes at all — confirmed by reproducing the identical behavior in a plain Node http server; (2) periodic heartbeats give a real "still alive" signal so a client can use a **bounded** timeout instead of an infinite one (see the `spineSubscriber.ts` row below). Comment-line frames are spec-legal SSE, already ignored by both `EventSource` (the Spine's own admin page) and the Tabletop's hand-rolled frame parser (only acts on lines starting with `data: `) — no client-side parsing changed anywhere, only the Tabletop's timeout values. Unit-tested directly in `services/spine/test/models/sse_stream_test.rb` (immediate heartbeat, periodic heartbeats via the injectable short interval, a published event still arriving correctly alongside heartbeats); `services/spine/test/integration/sse_stream_test.rb`'s `next_message` helper skips non-`data:` frames, since every integration test assumes the first chunk off the stream was the event. Verified live against a real running Spine process, not just tests: `curl -sN .../events/stream` showed the heartbeat frame flush immediately, and a POSTed event still delivered correctly alongside it. |
| `apps/tabletop/src/server/spineSubscriber.ts` + `spineEventDispatch.ts` | The Tabletop server's live Spine SSE subscription, one per room (opened by `handleSeatJoined` in `seatJoined.ts` on the room's first `seat.joined`). `spineSubscriber.ts` is a hand-rolled SSE client (streamed `fetch`, reconnect-on-drop) with **no ambient span** — reconnect/parse-failure conditions go through `log.warn` only. `spineEventDispatch.ts`'s `dispatchSpineEvent` continues the trace from the received envelope's `traceparent` as a **child span** (`propagation.extract` + `context.with` + `tracer.startActiveSpan(..., { kind: SpanKind.CONSUMER })`) before routing `card.played` to `applyCardArrival`. Fleet's first Node-side body-`traceparent` consumer and first `SpanKind.CONSUMER` use — see "Trace context embedded in event bodies" above for the detail. **Every SSE event kind gets a span, not just `card.played`.** The span is named `` `sse subscription: ${event.name}` `` and carries `event.name`/`table.name`/`table.slug` as attributes; only inside that span does the code check `event.name === "card.played"` before calling `applyCardArrival`. A future consumer of another kind (`seat.taken`, `table.created`, …) inherits an existing, already-attributed span instead of needing to add one. **The stream's `fetch` call passes a per-subscription `dispatcher`, `createHeartbeatAwareDispatcher()`, with BOUNDED timeouts** (`HEADERS_TIMEOUT_MS = 5_000`, `BODY_TIMEOUT_MS = 45_000` — three heartbeat intervals, since one missed beat is noise but three in a row means the connection is actually dead). Disabling detection entirely is unsafe: a genuinely hung Spine (accepts the TCP connection, never responds) would never be caught, so the timeouts stay bounded rather than off. Bounded timeouts are safe only because the Spine sends heartbeats (`services/spine/lib/sse_stream.rb`, row above) — headers arrive with the immediate heartbeat instead of only on the first real event, so `HEADERS_TIMEOUT_MS` only needs to cover genuine network/scheduling latency, not "however long until someone plays a card." The reference Honeycomb evidence for this design (`mtg-tabletop`, span `GET` on this URL: 95 `UND_ERR_HEADERS_TIMEOUT` + 1 `UND_ERR_BODY_TIMEOUT` over 30 days, all on ordinary idle/fresh tables, none on real outages) is what proved headers-timeout, not body-timeout, is the dominant real failure mode, and it's why bounding `headersTimeout` specifically (not just `bodyTimeout`) matters. This is a **per-call** dispatcher passed as the `dispatcher` fetch option, not a `setGlobalDispatcher()` change — scoped to just this one long-lived fetch, since this server makes no other outbound calls today. `@opentelemetry/instrumentation-undici` still emits spans for requests made through a custom per-call dispatcher (confirmed by reproduction) — it subscribes to Node's global `node:diagnostics_channel` events (`undici:request:create` etc.), which are process-wide and dispatcher-agnostic, so this is not a telemetry regression. `subscribeToSpine` takes the dispatcher as an optional 4th parameter so tests can inject a short-timeout one; `test/spineSubscriber.test.ts`'s fake SSE test server now mirrors the real Spine's immediate-heartbeat-on-connect behavior and gained a `sendHeartbeat()` method, and the idle-behavior test now proves both directions with a short custom dispatcher — heartbeats arriving faster than `bodyTimeout` keep the connection alive (a card played during that window still lands), and heartbeats actually stopping still triggers a reconnect within the timeout. |
| `apps/shuffler/src/port-spine/` | `HttpSpineGateway`/`FakeSpineGateway` implement `SpinePort` (`join`, `sendEvent`), wired into `server.ts`. **This is the Shuffler's outbound gateway for `card.played`**, onto the Spine's single `POST /join` and `contracts/envelope.v1.json`. `apps/shuffler/src/port-tabletop/` holds only envelope-shape helpers (`buildCardPlayedEvent`, `zoneHintForPlay`, the `CardPlayedEvent`/`EventEnvelope` types) — no HTTP client. `sendEvent` builds its envelope via `buildCardPlayedEvent`/`currentTraceparent()` and **posts the full envelope as-is** — `envelope.v1.json` declares `traceparent` as an optional top-level property (never required; "it's rude to fail on tracing"), so there's nothing to strip. No header is hand-set to compensate: undici's OTel auto-instrumentation already injects a live `traceparent` header on every outbound `fetch()`, appending its own after any explicit headers unconditionally, so a hand-set header here would only risk a duplicate or a stale value. The body's `traceparent` is redundant for this single-event HTTP POST specifically (the header already carries it) but load-bearing once events travel over the Spine's outbound SSE stream (no header there) or a future batched `sendEvent` (one header can't carry per-event trace context). Otherwise adds no new telemetry wiring on purpose — rides the same undici auto-instrumentation as every other outbound call, and copies the best-effort failure shape (span attribute + `log.warn`, never throws). **Consequence for failure visibility**: `card.played` has exactly one failure-observable hop on the way out of the Shuffler (this best-effort POST — span attribute + `log.warn`, never a player-visible error) and one on the way in at the Tabletop (the `SpanKind.CONSUMER` span in `spineEventDispatch.ts`, row above) — there is no synchronous send-then-commit hop in between with its own 502/modal signal. A dropped `card.played` is silent to the player in both directions; the only place it's visible is Honeycomb. |
| `apps/tabletop/src/server/testSeedRoute.ts` | **Test-only HTTP seam**, added the same ticket the production route it replaces was deleted. `POST /test/tables/:tableName/cards` calls the same `applyCardArrival` the SSE dispatcher uses, but is mounted **only when `ENABLE_TEST_SEED_ROUTE=true`** (set by `apps/tabletop/verify.sh` and by `cardArrival.test.ts`/`furnitureZOrder.test.ts`, which each spawn a real server process and need a way to seed a card with no live Spine to publish through). Carries no manual span or extra attributes of its own — same ambient-request-span coverage as any other Express route, nothing telemetry-specific added. **Never mounted without the env var, never in production** — if you're looking for how `card.played` reaches the canvas in prod, it's the SSE dispatcher above, not this. |

**The house pattern for a failure path**: (1) **attributes first** —
`markCurrentSpanAsError(message, {...})` with the failure kind, the inputs, and the reason; (2)
**then the log, only for the stack** — `log.error("...", {...}, error)`. The third argument
becomes `exception.type`/`.message`/`.stacktrace`, which is the part a span has no room for. Don't
duplicate onto the log what's already on the span.

**Manual span creation is almost nonexistent.** Across all three ships there are a handful of call
sites: `apps/tabletop/src/server/server.ts` (`tracer.startActiveSpan("ws connect", ...)`),
`apps/tabletop/src/server/seatJoined.ts` (`"add player furniture"`),
`apps/tabletop/src/server/cardArrival.ts` (`"place arrived card"`),
`apps/tabletop/src/client/TablePage.tsx`, `apps/tabletop/src/client/useCardArrivalSpans.ts`, plus
`inSpan` itself. **The Shuffler creates zero manual spans** — it lives entirely off
auto-instrumentation plus stamping attributes onto whatever span already exists. That's why
`markCurrentSpanAsError`/`setCommonSpanAttributes` matter so much.

**The Tabletop's server has a repeated shape for its two SCAFFOLDING event handlers**
(`handleSeatJoined` in `seatJoined.ts`, `handleCardArrival` in `cardArrival.ts`): parse and
validate the envelope, stamp identifying attributes onto the **ambient** request span
(`trace.getActiveSpan()?.setAttributes(...)`), run the dedup/rejection early-returns *outside*
any manual span (each just sets one attribute on the ambient span and returns), then wrap only
the actual placement/furniture-creation work — the part that touches `entry.room.updateStore` —
in its own child span via `tracer.startActiveSpan(name, { kind: SpanKind.INTERNAL, attributes:
{...} }, async (span) => { try { ... } finally { span.end(); } })`. Initial attributes on the
child span re-stamp the same identifying fields already on the ambient span (`event.id`,
`table.name`, `seat.id`, plus payload-specific fields); result attributes — `room.seats_after`
for seat.joined, `zone.graveyard_count`/`zone.stack_count` + `zone.position.x`/`.y` for
cardArrival — are set on the child span just before `span.end()`. `entry.seenEventIds.add(...)`
and the final response always happen **after** the span ends, outside it, in both handlers. Two
data points now (`seatJoined.ts` first, `cardArrival.ts` copied directly from it) — treat this as
the pattern for a third such handler, not a coincidence to re-derive. **`seatJoined.ts` now also
stamps `event.name: envelope.name`** next to `event.id`, on both the ambient and the "add player
furniture" child span (2026-08-19) — `cardArrival.ts` does **not** yet have the matching stamp;
that's a known gap, not a signal the two handlers diverged on purpose.

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

Two mechanisms carry trace context on this fleet, and both are live now:

1. **HTTP-header propagation** — automatic: undici auto-instrumentation on the Node ships'
   outbound `fetch`/HTTP calls, and Net::HTTP instrumentation on the Spine's Tabletop notification.
   Rack extracts inbound W3C headers. Application code never hand-sets `traceparent` headers.
2. **Body-embedded `traceparent`** — a W3C `00-{traceId}-{spanId}-{flags}` string carried as an
   **optional** field directly on the envelope (`contracts/envelope.v1.json`), for data that
   outlives the request or travels somewhere no header can reach.

**`traceparent` is a real envelope field, sitting directly on the envelope, not under a sibling
`meta` object.** The contract declares it as an optional top-level property — pattern-validated
against the W3C format, but never `required`; tracing is best-effort and must never be the reason
an event is rejected ("it's rude to fail on tracing" — Jess). Contracts describe the wire protocol
between ships, and the reasoning for putting it on the envelope rather than leaving it
header-only: the outbound SSE stream has no header mechanism at all, and a future batched
`sendEvent` would lose per-event trace context if it lived in just one HTTP header for the whole
batch — so trace context needs a way to travel with the event body itself.

**The Spine never persists it.** `Event#as_envelope` (`services/spine/models/event.rb`) builds the
envelope with no `traceparent` key — traces expire (~60d), and durable causality uses event ids.
Two outbound paths attach a transient live value. `Table#broadcast` captures the appending
request's context via `OpenTelemetry.propagation.inject`, merges it onto the SSE envelope, and
drops the key when unavailable. `TabletopNotifier` does the same immediately before serializing
its post-commit `seat.joined` copy; Net::HTTP then creates its client span and automatically injects
the request header. Body and header share a trace id but may correctly carry different span ids.
Inbound (`POST /tables/:table_id/events`), a sender may set body `traceparent`, but nothing requires
it; Rack's extracted header is already enough to continue the trace. The persisted row keeps
neither copy, so an event minted before an SSE subscriber exists still cannot link back later.

**Outbound SSE has a real consumer, not just a link-builder.** The Spine's admin
show page (`views/admin/tables/show.html.erb`) parses each live SSE message's
`event.traceparent` into an OTel `SpanContext` (`{traceId, spanId, traceFlags,
isRemote: true}`) and opens a genuine **child span** in that same trace —
`Hny.inChildSpan("spine-admin", "table.event.displayed", spanContext, fn)` — rather than
only building a clickable trace URL from it. See "The Spine's browser bootstrap and trace
continuation" below for the full shape and its consequence for trace duration.

**The Tabletop server is a Node-side consumer of a body-embedded
`traceparent`** (`apps/tabletop/src/server/spineEventDispatch.ts`) — the same shape the Spine's
admin page uses client-side/by-hand (see "The Spine's browser bootstrap and trace
continuation" below). `dispatchSpineEvent` extracts
the broadcast envelope's `traceparent` with the real propagator —
`propagation.extract(ROOT_CONTEXT, { traceparent })` — then `context.with(parentContext, () =>
tracer.startActiveSpan(`sse subscription: ${event.name}`, { kind: SpanKind.CONSUMER, attributes:
{...} }, ...))`, so the placement work lands as a genuine **child of the publishing request's
trace**, matching the Spine admin page's "one trace, not a link" shape. It uses
`SpanKind.CONSUMER` — every other manual span in the fleet (the Tabletop's
own `seatJoined.ts`/`cardArrival.ts` handlers included) uses `SpanKind.INTERNAL`, since those are
driven by an inbound HTTP request, not a message off a stream. A missing/malformed
`traceparent` falls back to `ROOT_CONTEXT` (a fresh, unparented trace) rather than failing —
consistent with the fleet's "it's rude to fail on tracing" stance. **A span is created for every
SSE event kind**, not only `card.played` — a dropped kind would otherwise never have a span, so
`seat.taken`/`table.created`/future kinds would be invisible in
Honeycomb; only the routing to `applyCardArrival` inside the span stays `card.played`-only. The
companion file, `apps/tabletop/src/server/spineSubscriber.ts` (the hand-rolled SSE client —
streamed `fetch`, no `EventSource`, since one server process holds many concurrent per-table
streams), has no ambient span of its own — reconnect and parse-failure conditions go through
`log.warn` exclusively, never a conditional span attribute, the same "no span in a timer/background
callback" pattern as `rooms.ts`'s `onSessionRemoved` (see Invariant 2's worked example).

**`event.name` is a fleet-wide convention worth reusing, not a Tabletop-only spelling.** The
Spine's admin page minted it first (`table.event.displayed` span, "The Spine's browser bootstrap
and trace continuation" below, `event.name`/`event.seq`) so operators could graph events by kind
in Honeycomb; that convention lived only in the admin page's ERB until the Tabletop adopted the
same spelling here and on `seatJoined.ts`'s ambient/child-span attributes (envelope's `name` field
→ `event.name`). Any future emitter that wants "graph my events by kind" should stamp `event.name`
from the envelope's `name` field with this exact spelling, not invent a new one — that's the whole
point of a convention living in more than one file.

**Three live body-embedded mint sites**, all format identically
(`00-{traceId}-{spanId}-{flags}`):

| Where | Behavior with no active span |
| --- | --- |
| `apps/tabletop/src/client/observability/index.ts` `currentTraceparent` | Returns `undefined` — used only for websocket-URL propagation, never a durable field, so "no span, no value" is correct there. |
| `apps/shuffler/src/port-tabletop/traceparent.ts` `currentTraceparent` | Synthesizes a well-formed random traceparent when no active span exists, and sets `traceparent.synthesized: true` on the active span when that fallback fires — so a real occurrence in production is visible rather than a silent trace-shaped string that links nowhere. Correct for the Tabletop-facing `card.played`/`seat.joined` envelope. `HttpSpineGateway.sendEvent` also builds its envelope via this helper (shared `buildCardPlayedEvent`), and now that `envelope.v1.json` accepts `traceparent` as an optional field, it **posts the full envelope as-is** — no more stripping it before serializing. The HTTP header still carries trace context too (undici, automatic) — redundant with the body field for this particular single-event POST, but the body copy is what lets trace context reach the outbound SSE stream, and any future batched send. |
| `services/spine/lib/tabletop_notifier.rb` `send_joined` | Calls `OpenTelemetry.propagation.inject` immediately before JSON serialization and adds the value only when available; it never synthesizes or persists one. The approved Net::HTTP instrumentation independently injects the HTTP header automatically. The post-commit send has one-second open/read/write timeouts and is best-effort: all outcomes are recorded in bounded `tabletop.send.result`, and failures do not fail `/join`. |

### The Shuffler's browser bootstrap (one shell, `html-layout.ts`)

There is exactly ONE place the Shuffler's browser telemetry starts: `formatHtmlHead()` in
`apps/shuffler/src/view/common/html-layout.ts`.

Script order, load-bearing:

1. `<script src="/browser-tab-id.js">` — sets `window.browserTabId` from sessionStorage (mints a
   `crypto.randomUUID()` on first use; per-tab, survives reload). Also registers the
   document-level `htmx:configRequest` listener that adds `X-Browser-Tab-Id` to every htmx
   request.
2. `<script src="/hny.js">` — the vendored Honeycomb web SDK.
3. Inline init: `initHoneycombTracing(apiKey, devMode, tableName, playerName, gameId)` — a named
   function, guards on `window.Hny && window.browserTabId` **and** on the apiKey being
   non-empty/non-`"undefined"`, then calls `Hny.initializeTracing({ apiKey, serviceName:
   "mtg-deck-shuffler-web", ..., resourceAttributes })` where `resourceAttributes` always carries
   `"game.browser_tab_id"` and `"app.dev_mode"`, and **conditionally** adds `"table.name"` /
   `"player.name"` / `"game.id"` only when the corresponding arg is truthy (`if (tableName)` / `if
   (playerName)` / `if (gameId)`). Table/player omit for solo games, matching the server side;
   `game.id`, by contrast, is stamped on **every** `/game` page (solo and table alike — every game
   has a `gameId`), so its presence is not a "table mode" signal the way table/player are. The
   `devMode` argument is interpolated as an **unquoted boolean** (`initHoneycombTracing("...",
   ${devMode}, …)`), so that resource attribute is a real boolean; the three string args
   (`tableName`, `playerName`, `gameId`) are interpolated via `jsStringArg()` (`JSON.stringify` +
   `<`→`<`), which quotes them safely and neutralizes any `</script>` in a value — an absent
   value serializes to the literal `undefined`, which the `if` guard then skips. See the dev-mode,
   table/player, and game.id notes below.

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

### Dev mode is on telemetry as `app.dev_mode` (both datasets, same spelling)

The Shuffler's **dev mode** — an httpOnly `devMode` cookie toggled at `/dontdie` — now rides
telemetry as the boolean attribute **`app.dev_mode`**, spelled identically on the server dataset
(`mtg-deck-shuffler`) and the browser dataset (`mtg-deck-shuffler-web`), so one filter spans both.

- **Server side (per-request span attribute).** The cookie middleware in `apps/shuffler/src/app.ts`
  (`DEV_MODE_COOKIE = "devMode"`) computes `res.locals.devMode` and calls
  `setCommonSpanAttributes({ devMode: res.locals.devMode })`, so every root server span carries
  `app.dev_mode`. At that call site `devMode` is **always a real boolean** (the cookie either
  parses to `1` or it doesn't), so `app.dev_mode=false` is stamped and filterable — this is the
  one `CommonAttributes` field where a `false` deliberately survives (see the `tracing_util.ts`
  row). It reflects dev-mode **per request**.
- **Browser side (resource attribute).** `formatHtmlHead({ devMode })` threads the flag from
  `formatPageWrapper` and from `views/partials/head.ejs` (`locals.devMode`) into
  `initHoneycombTracing(apiKey, devMode, tableName, playerName)`, which adds `"app.dev_mode":
  devMode` to the OTel **resource**. Because it's a resource attribute it's immutable after init, so
  it reflects **dev-mode-at-page-load**, not per-request — but the `/dontdie` toggle is a full
  navigation, so the next page load picks up the new value.
- **Tests**: `apps/shuffler/test/html-layout-tracing-guard.test.ts` evals the exported script and
  asserts `app.dev_mode` reaches `resourceAttributes` (true and false);
  `apps/shuffler/test/html-layout-fleet-tokens.test.ts` asserts the **unquoted-boolean**
  interpolation (`initHoneycombTracing(".*", true|false)`) so a future edit can't quietly turn it
  into a string.

### The game's Table Name and Player Name are on telemetry as `table.name` / `player.name`

The Shuffler's table-mode games carry a Table Name and Player Name (Table Mode, JES-127); both now
ride telemetry on `/game` and every endpoint behind it — spelled `table.name` and `player.name`,
the **same spelling the Tabletop's browser wrapper already stamps** (`GlobalAttributesSpanProcessor`
puts `table.name` on every Tabletop span), so one filter can follow a table across ships. **Solo
games stamp nothing** — the attributes' absence is the "solo" signal (see the `tracing_util.ts`
row's `undefined`-is-dropped note).

- **Server side (per-request span attribute).** Two stamping sites keep telemetry in the
  HTTP/command layer, never in the domain `GameState`:
  - **Mutation routes** — `applyGameCommand()` (`apps/shuffler/src/apply-game-command.ts`) calls
    `setCommonSpanAttributes({ tableName: game.tableName, playerName: game.playerName })` right
    after the game loads, covering **all 13** game-mutation POST routes in one place (the same
    choke point that owns the not-found/version-conflict error stamping).
  - **GET fragment routes** — each `app.ts` route that reconstructs a `GameState`
    (`/game`, `/library-modal`, `/table-modal`, `/card-modal`, `/history-modal`, `/game-section`)
    calls `setCommonSpanAttributes({ tableName, playerName })` after `GameState.fromPersistedGameState`.
    `/debug-state` stamps from `persistedGame` directly (it never reconstructs a `GameState`).
- **Browser side (resource attributes).** `formatGamePageHtmlPage` (`active-game-page.ts`) passes
  `game.tableName`/`game.playerName` into `formatPageWrapper` → `formatHtmlHead` → the inline
  `initHoneycombTracing(..., tableName, playerName)` call, which conditionally adds
  `"table.name"`/`"player.name"` to the browser OTel **resource** next to `app.dev_mode`. Only
  `/game` inits tracing, so the HTMX fragments served behind it inherit the resource attributes
  — no per-fragment browser init.
- **Escaping**: the two name args are user-controlled strings interpolated into an inline
  `<script>`, so they go through `jsStringArg()` (`JSON.stringify` + `<`→`<`) — this both
  quotes the JS literal and neutralizes a name containing `</script>` (break-out / XSS). An absent
  name becomes the literal `undefined`, which the browser guard's `if (tableName)` then skips.
- **Tests**: `html-layout-tracing-guard.test.ts` (table/player reach `resourceAttributes` when
  supplied, omitted when empty) and `html-layout-fleet-tokens.test.ts` (arg-order regex, the
  `undefined` case, and `</script>` neutralization).

**The Tabletop's route param is now a slug carrying the Spine's real table id, and the
Tabletop server strips it back off before stamping `table.name`.** Since `TableSlug.mint`
(`services/spine/lib/table_slug.rb`) made a table's Spine-minted primary key itself
`<name-slug>-<8-hex-random>` — the same string used for the `/t/<slug>` URL, the
server-to-server event POST path, and (Tabletop-side) the room-registry key /
`/connect/:roomSlug` websocket key — the Tabletop's route param went from a bare
display name to an id-bearing slug. `apps/tabletop/src/shared/slugify.ts` adds
`tableNameFromSlug()` (strips a trailing `-<8-hex>`) specifically so `table.name` keeps
its old meaning (bare human name, matching the Shuffler) instead of silently becoming the
full slug. Every Tabletop **server**-side stamping site now calls it before writing
`table.name`, and stamps the untouched full slug alongside it under a **new** attribute,
`table.slug`: `apps/tabletop/src/server/seatJoined.ts`, `cardArrival.ts` (both the ambient
and the child-span attributes), `rooms.ts` (`room.created`, and the two `onSessionRemoved`
logs), and `server.ts` (the `"ws connect"` span). `table.slug` is Tabletop-only — it isn't
stamped by the Shuffler or the Spine, so don't expect it to correlate across ships the way
`table.name` does; query it when you want one specific table unambiguously (bare names
aren't unique over time, since a table can be re-created after its predecessor is gone).

**Gap: the Tabletop's browser dataset (`mtg-tabletop-web`) was NOT part of this fix.**
`TablePage.tsx`'s `setGlobalAttrs({ "table.name": tableSlug })` and its `inSpan("table page
opened", ..., { "table.name": tableSlug })` call still stamp the raw, id-bearing
`tableSlug` prop as `table.name` — only the **server**-side call sites above route through
`tableNameFromSlug()`. So today, `table.name` on `mtg-tabletop-web` spans carries the full
slug (name + id suffix) while `table.name` on the Tabletop's **server** dataset
(`mtg-tabletop`), the Shuffler's datasets, and the Spine's spans carries the bare name —
the "one filter follows a table across ships" guarantee holds for the server dataset but
not yet the browser one. If you're touching `TablePage.tsx` or `setGlobalAttrs`, this is
the next fix: import `tableNameFromSlug` client-side (it has no server-only dependencies)
and apply it before the `setGlobalAttrs`/`inSpan` calls, stamping the untouched `tableSlug`
separately as `table.slug` for symmetry with the server side.

### The Spine-minted seat id is on the Shuffler's join-route spans as `seat.id`

The Spine, not the Shuffler, is the sole authority on seat identity. The Spine mints the seat id
and threads it back to the Shuffler, which re-stamps it as `seat.id` on that request's span,
matching the spelling `apps/tabletop/src/server/cardArrival.ts` and `seatJoined.ts` already use —
so a Honeycomb query for `seat.id` follows one seat across all three ships.

- **Spine side.** `Table#join_outcome` (`services/spine/models/table.rb`) now includes `seat_id:
  seat.id` in the outcome hash. `POST /join` (`services/spine/app.rb`) adds `"seat.id" =>
  outcome[:seat_id]` to the same `current_span.add_attributes` call as `join.result`/`seat.number`,
  and `seatId: outcome[:seat_id]` to the JSON response, alongside `tableId`/`seatNumber`/`tableUrl`.
- **Shuffler side.** `SpineJoinResult`/`SpineJoinOutcome` (`apps/shuffler/src/port-spine/types.ts`,
  `sendToSpine.ts`) carry `seatId` through; `HttpSpineGateway`/`FakeSpineGateway` pass/mint it.
  `GameState.recordSpineJoin` (`apps/shuffler/src/GameState.ts`) adopts `outcome.seatId` as
  `this.seatId` when present (the field is no longer `readonly`) — **deliberately with no
  telemetry call inside `GameState` itself**, per the rule that stamping stays in the HTTP/command
  layer, never the domain model.
- **Stamping site: manual per-route `setAttribute`, not `CommonAttributes`.** Each of the three
  call sites in `apps/shuffler/src/app.ts` (`/start-game`, `/restart-game`, `/yo`) calls
  `trace.getActiveSpan()?.setAttribute("seat.id", spineJoin.seatId)` by hand right after
  `game.recordSpineJoin(spineJoin)`, guarded by `if (spineJoin.seatId)`. This does **not** go
  through `setCommonSpanAttributes`/`CommonAttributes` (the `tracing_util.ts` row) — unlike
  `table.name`/`player.name`, which apply to all 13 mutation routes plus the GET fragment routes,
  a seat id is only ever produced at the moment of a Spine join, so a shared choke point would be
  the wrong shape here. Don't "unify" this into `CommonAttributes` without checking that a join is
  actually in scope at every call site that would gain it.

**`game.id` (the Shuffler's incoming id) is on the same span too, correlated with the
Spine-minted `seat.id`.** See the `POST /join` wiring-table row above; `Table#prepare_seat`/
`Table.join!` (`services/spine/models/table.rb`) stay free of tracing calls on purpose, per the
house rule of stamping in the HTTP layer, not the model.

**`seat.id`'s shape (seat-session-attribution ticket 03):** `Table#prepare_seat`
(`services/spine/models/table.rb`) mints it as `"#{TableSlug.name_slug(player_name)}-#{SecureRandom.hex(4)}"`
— `<player-name-slug>-<8hex>` — reusing `Spine::TableSlug.name_slug` (`services/spine/lib/table_slug.rb`)
rather than a bare `SecureRandom.uuid`. This mirrors `table.id`'s own shape from `TableSlug.mint`
(`<table-name-slug>-<8hex>`, see the route-param note above) — both ids are now
`<name-slug>-<8hex>`, just slugging a different name. No format was documented here before this
change; a Honeycomb query filtering `seat.id` can now expect this shape rather than a bare UUID.

### session.id: a fresh per-page-load id, not per-tab

`initiator.sessionId` (contracts/envelope.v1.json, seat-session-attribution ticket 04) is the
Shuffler's own per-page-load identifier, minted fresh every time — unlike `seat.id`, it's not
tied to a Spine join, and unlike `browserTabId` it's never persisted client-side
(`sessionId` is free to reset every page load because `gameId` already anchors identity
durably; see `CONTEXT-MAP.md`'s "Initiator" table).

- **Client side.** A new `apps/shuffler/public/session-id.js`, loaded via the shared head
  (`formatHtmlHead`, `src/view/common/html-layout.ts`) right after `browser-tab-id.js`, sets
  `window.sessionId = crypto.randomUUID()` on every page load (no `sessionStorage`) and adds it
  as the `X-Session-Id` header on every htmx request, same `htmx:configRequest` hook
  `browser-tab-id.js` uses for `X-Browser-Tab-Id`.
- **Stamping site: through `CommonAttributes`, not a one-off `setAttribute`.** A new middleware
  in `apps/shuffler/src/app.ts`, placed right after the existing `x-browser-tab-id` middleware,
  reads the `x-session-id` header and calls `setCommonSpanAttributes({ sessionId })` — **this is
  the opposite call of `seat.id` above, deliberately**: `sessionId` is present on essentially
  every request (like `browserTabId`), not only at a join call site, so it belongs in the shared
  `CommonAttributes` funnel, not a manual per-route stamp. Don't move this into the `seat.id`-style
  manual pattern; the two attributes are genuinely different shapes.
- **Wire threading.** `res.locals.sessionId` also flows through `sendCardBeforeMutate` →
  `sendCardPlayedToSpineBestEffort` → `buildCardPlayedEvent`'s `initiator`
  (`apps/shuffler/src/port-tabletop/types.ts`), so `card.played` envelopes carry the same
  `sessionId` that's on the request span — one value, both places.

### The game's id is on the browser resource as `game.id` (browser only, so far)

Every browser span on the `/game` page carries the Shuffler's own game id as the resource
attribute **`game.id`** — added 2026-08-13. Unlike `table.name`/`player.name`, this is stamped on
**every** game, solo and table-mode alike, because every game has a `gameId`; its presence is not a
"table mode" signal.

- **Browser side only (resource attribute).** `formatGamePageHtmlPage` (`active-game-page.ts`)
  passes `gameId: String(game.gameId)` into `formatPageWrapper` → `formatHtmlHead` → the inline
  `initHoneycombTracing(..., gameId)` call, which adds `"game.id"` to the browser OTel **resource**
  next to `app.dev_mode`/`table.name`/`player.name`. Same conditional (`if (gameId)`) and same
  `jsStringArg()` escaping as the two name args. Only `/game` inits tracing, so HTMX fragments
  behind it inherit the resource attribute.
- **Server side does NOT stamp `game.id`** — this change was scoped to the `mtg-deck-shuffler-web`
  browser dataset. The server already carries the game id, but spelled differently: the
  route-param stamping writes `http.route.param.gameId` (via `stampRouteParamsOnSpan`), not
  `game.id`. So the browser↔server spelling is **asymmetric** (`game.id` on the web dataset vs.
  `http.route.param.gameId` on the server dataset) — a fair follow-up to reconcile, deliberately
  left out of this task. Don't assume one filter spans both datasets the way `table.name` does.
- **The prep page was deliberately left untouched** — `views/prepare.ejs` does not stamp `game.id`
  (a prep has a `prepId`, not a `gameId`; overloading `game.id` with a prep id would be a trap), and
  no table/player either.
- **Tests**: `html-layout-tracing-guard.test.ts` (stamps `game.id` when supplied, omits it when
  absent) and `html-layout-fleet-tokens.test.ts` (arg-order regex updated for the trailing 5th arg,
  plus a `game.id` case). Full suite: 372 pass.

### Button ids make click auto-instrumentation legible (`mtg-deck-shuffler-web`)

`hny.js`'s `UserInteractionInstrumentation` auto-instruments browser clicks into a span whose
sole click-identity attribute is **`target_xpath`** (plus `target_element` = the clicked
`tagName` and `http.url`). When the clicked element carries an `id`, that xpath **collapses to
`//*[@id="the-id"]`** — legible — instead of a long positional path. So every real `<button>` in
the Shuffler now carries a semantic kebab-case `id` (`draw-button`, `shuffle-button`,
`card-action-play`, `reveal-action-play-<index>`, `table-look-mat-<index>`, …) purely to make its
click span queryable. `views/design.ejs` (the `/design` gallery) is deliberately excluded — it
renders every component and would duplicate ids. **No telemetry wiring changed** — this rides the
existing browser SDK; it's a naming discipline in the views, not new plumbing.

Two `hny.js` mechanics worth not re-deriving (both confirmed by reading the vendored bundle):

- **`hny.js` vendors TWO `UserInteractionInstrumentation` classes.** The one at ~line 6204 calls
  `getElementXPath(element)` **without** the optimise flag and is **not** the one that runs. The
  one at ~line 14084 calls `getElementXPath(element, true)` — that's the class
  `getWebAutoInstrumentations`/`initializeTracing` actually registers, and **only the optimised
  path yields `//*[@id]`** (the `optimised && targetValue.indexOf("@id") > 0` early-return at
  ~line 5973). If a future SDK re-vendor changes which class registers or drops the flag, id-based
  xpaths silently revert to positional — check there first.
- **The click span is created on `event.target`, not on the button.** A click that lands on a
  button's *child* markup (an icon, a nested `<span>`, an embedded event fragment — e.g. the
  precon tiles and the undo button) resolves to the child node, which has no id, and falls back to
  a positional xpath. Giving the button an id doesn't help those; the child would need one too.
  **Disabled buttons emit no click span at all** — `_createSpan` early-returns on
  `hasAttribute("disabled")` (~line 14078).

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
page parses `message.event.traceparent` into an OTel `SpanContext` and calls
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

### The Shuffler's verify suite now spawns a real Spine, not just a real Tabletop

`verify-tabletop-integration.spec.ts` (`apps/shuffler/test/verification/`) is the fleet's
end-to-end proof that `card.played` reaches the canvas with **zero direct Shuffler→Tabletop HTTP
call in the code** — it spawns a real Spine
(`bundle exec puma`, `services/spine/`) alongside the real Tabletop, and drives
the whole path: Shuffler → best-effort POST to the Spine → Spine broadcast over SSE → Tabletop's
`spineEventDispatch.ts` → canvas. `apps/shuffler/verify.sh` gives this run's Spine its own random
port per run (`SPINE_URL`), mirroring the `VERIFY_TABLETOP_PORT` pattern, so a verify run
never collides with a locally-running dev Spine. Same telemetry posture as the
real-Tabletop spawn: no extra instrumentation added for the test process itself, it's just another
real backend the harness happens to also drive through Playwright.

**This is also why `playwright.config.ts`'s `"two-app"` project (depends on `"chromium"`) matters
for concurrency, not just organization**: it keeps this spec from running at the same time as
`verify-table-mode.spec.ts`'s "still succeeds when the Spine is unreachable" case, which needs
that same `SPINE_URL` to have **nothing** listening on it — the two specs make opposite claims
about that address and would race if run concurrently.

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
- The Shuffler's and the Tabletop's `deploy.sh` source `.be` then `.env` (the deploy marker's
  key lives in `.be`; ECR_REPO and OTEL settings live in `.env`). **The Spine's `deploy.sh` is the
  exception**: it sources `.be` only — `ECR_REPO` lives there instead of a `.env` (comment in the
  script: "this ship has no `.env` needed at deploy time"), because the Spine's OTEL config is
  baked directly into `k8s/configmap.yaml` rather than read from a deploy-time env file. Don't
  "fix" this to match the other two — it's a real difference in how each ship's prod OTEL config
  is sourced, not an oversight.
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
