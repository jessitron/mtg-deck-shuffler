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
explains it, and the data stays queryable.** The trace follows HTTP calls within this app.

**Volume is not a cost concern on this fleet.** _(Jess, 2026-08-07: "I work at Honeycomb.
Ingestion is free.")_ See "Volume: what still matters and what doesn't" below before you plan
around a budget.

## Invariants

### 1. Add great attributes to spans. Attributes are ALWAYS better than a log. _(Jess, authoritative)_

Attributes are free in Honeycomb, and they make every span more valuable, because they correlate with each other.
When receiving a request, add all parameters as attributes. Add return values.
When there is a conditional in the code, but the condition in an attribute; this reveals code paths.
There is no PII to worry about in this app.

**A log is for when there is no span to hang it on** — startup, shutdown, callbacks, timers. If
there's an active span, `setAttributes` on it instead.

This was never a cost argument, and don't let anyone turn it into one. An attribute on the span
that already exists is *more* useful than a separate record: it correlates with everything else on
that span, and it doesn't add a row someone has to filter past. The reason to prefer it is signal,
not billing.

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
attributes, error?)` from `apps/shuffler/src/log.ts` or `apps/tabletop/src/server/log.ts` — and
the Tabletop's browser has one too: `logError(message, attributes, error?)` in
`apps/tabletop/src/client/observability/index.ts`. The Spine does **not** yet
(`spine-logs-in-traces` in `TODO.md`); there, put the information on a span you created and
therefore own. Never treat a missing logger as license to reach for `addEvent`.

**Why this loses nothing:** Honeycomb renders a log that carries trace and span ids with
`meta.annotation_type = span_event` — it lands on the trace looking exactly like a span event
would. Verified in env `local` when the pipeline went in. So the invariant costs no fidelity; it
only buys the cases `addEvent` can't serve (arrives before the span ends, works with no active
span, arrives if the span never ends).

**Logs are deliberately NOT sampled.** A LogRecord does not inherit its span's sampling decision,
and we chose not to make it. See Invariant 4 — the sampler keeps 1% of health-check traces so we
can see the probe passing; if the probe starts *failing* we want every log explaining why, not 1%
of them. The OTel spec defaults `traceBased` to `false` for the same reason. Unsampled logs stay
*readable* because nothing logs on the hot path — which Invariant 1 already produces: attributes are
the default answer and a log is the exception. (Cost was never the reason; see "Volume" below.)

### 3. While ingest keys are OK to commit to git and publish in the browser, Collectors are better.

Prod: same-origin `/v1/traces` and `/v1/logs`, ALB-routed to a dedicated
`mtg-tabletop-collector` (`apps/tabletop/k8s/collector.yaml`, `BROWSER_OTLP_TRACES_URL` /
`BROWSER_OTLP_LOGS_URL` in `apps/tabletop/k8s/configmap.yaml`) — no key in the page, no CORS.
Local: `otel-collector-local.yaml`, or the local-only `ALLOW_BROWSER_DIRECT_HONEYCOMB=true` key
fallback in `apps/tabletop/src/server/server.ts:33-45`.

**Since `tabletop-http` (2026-08-09) the destination is `http://`, not `https://`, on purpose.**
The Tabletop left the shared `only-one-alb-please` IngressGroup for its own group `tabletop-http`
(`apps/tabletop/k8s/ingress.yaml`): a dedicated ALB with a single HTTP:80 listener and **no 443
listener at all** — tldraw's license gate blanks an unlicensed canvas on HTTPS non-loopback
origins, and `ssl-redirect` is exclusive across an IngressGroup, so there was no per-host http
carve-out in the shared group. Consequence for this invariant: an `https://` browser OTLP URL is
**connection-refused**, silently killing all browser telemetry including the uncaught-error
pipeline. **Four config spots are scheme-coupled and must agree**: `BROWSER_OTLP_TRACES_URL` and
`BROWSER_OTLP_LOGS_URL` in `apps/tabletop/k8s/configmap.yaml`, the CORS `allowed_origins` in
`apps/tabletop/k8s/collector.yaml`, and the Shuffler's `TABLETOP_PUBLIC_URL`
(`apps/shuffler/k8s/configmap.yaml`, fallback in `apps/shuffler/src/view/play-game/active-game-page.ts`).
The collector→Honeycomb leg stays `https://api.honeycomb.io`. Access logs: both ALBs write to the
same bucket/prefix (`orion-alb-access-logs` / `orion-alb`); object keys embed the ALB name, so
they stay distinguishable.

### 4. Head-sample heath checks; keep all user activity.

A sampler that stops matching keeps 100% of the chatter and says nothing about it. So sampling logic
lives in its own module with tests (`apps/shuffler/src/telemetry-sampler.ts` +
`apps/shuffler/test/telemetry-sampler.test.ts`), and reads **both** semconv spellings of every
attribute it depends on.

### 5. Every span says which build it came from. _(True for ONE init path; `build-sha-on-every-span` in `TODO.md` for the ships)_

**Not yet implemented on any ship.** Recorded here at Jess's request (2026-08-01) so it's held as
an invariant from the moment it lands rather than being rediscovered later.

**One init path now satisfies it, and it's the newest one**: the verify harness
(`apps/shuffler/test/harness-telemetry/harnessTracing.ts`) puts the git short sha on its resource
as `service.version` from day one, plus `verify.git.sha` on every span. That is the standing check
below working as intended on its first outing — a new init path carried the version without being
told twice. The three ships still don't.

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

Have, as of `ca6553f`: logging libraries that participate in traces — **in the two Node ships**,
plus the Tabletop's **browser**: `logError()` in `apps/tabletop/src/client/observability/index.ts`,
its own `LoggerProvider`, and a collector route at `/v1/logs` (`apps/tabletop/k8s/collector.yaml`,
`apps/tabletop/k8s/ingress.yaml`) carrying the ingress path through to Honeycomb. The Spine still
has none (`spine-logs-in-traces` in `TODO.md`).
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

**The same skew also produces PHANTOM type errors — a build failure against correct code.**
(2026-08-09.) A fresh worktree has no `node_modules`, and because worktrees live *inside* the repo
(`.claude/worktrees/…`), tsc walks up and resolves the main checkout's hoisted sdk-logs **0.219**
types — so the Tabletop's correct 0.221 options-object line at
`apps/tabletop/src/server/tracing.ts:64` "fails" with `'exporter' does not exist in type
'LogRecordExporter'`. **The fix is `npm install` from the worktree root, never a code change** —
"fixing" the line to the positional shape would compile clean and silently export nothing (the
exact bug the comment at that line warns about). Documented in `notes/AGENT-NOTES.md` → "Harness
gotchas"; a STOP verdict from this owner prevented exactly that miscorrection.

**`service.name` from a resource vs. from the environment: the two providers behave OPPOSITELY.**
Checked in `node_modules` at OTel JS 2.8 (2026-08-07), not reasoned:

| Provider | What it does with your `resource` | Sees `OTEL_SERVICE_NAME`? |
| --- | --- | --- |
| `BasicTracerProvider` (`sdk-trace-base`) | `mergedConfig.resource ?? defaultResource()` — a plain `??`. An explicit resource **replaces** the default entirely. | **No.** `defaultResource()` never runs `envDetector`; only `EnvDetector` reads the var, and only `NodeSDK` wires it up. Structurally incapable. |
| `NodeSDK` (`sdk-node`) | `this._resource = this._resource.merge(detectResources(...))` — **detected wins**. | **Yes, and it OVERRIDES you.** An ambient `OTEL_SERVICE_NAME` beats an explicitly configured `service.name`. |

Consequences worth holding:

- Writing `service.name` into the resource in code is **safe under `BasicTracerProvider` and unsafe
  under `NodeSDK`**. Swapping one for the other silently relocates a service's spans to another
  dataset. There is a comment against exactly that swap at the call site in `harnessTracing.ts`, and
  a regression test asserting `service.name` is `mtg-fleet-verify` even with
  `OTEL_SERVICE_NAME=mtg-deck-shuffler` in the environment.
- **Don't `export` anything telemetry-ish in a script after `.env` is sourced.** `.env` exports
  `OTEL_SERVICE_NAME` for the app server; a second process launched from the same script inherits it.
  `verify.sh` passes its `VERIFY_*` vars on the one `npx playwright test` command line instead.
- If you ever want `telemetry.sdk.*` back on a `BasicTracerProvider`, the order matters:
  `defaultResource().merge(yours)`, never the reverse.

| Where                                                 | What it is                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/shuffler/src/tracing.ts`                        | Node SDK init. ESM loader hook (`register("@opentelemetry/instrumentation/hook.mjs")`) + `node --import`. Auto-instrumentations; `fs` off; **Express middleware spans off** (`ignoreLayersType: [ExpressLayerType.MIDDLEWARE]`). `ParentBasedSampler({root: BackgroundChatterSampler})`. Also `logRecordProcessors: [BatchLogRecordProcessor(OTLPLogExporter)]` — logs ride the same NodeSDK so they share the resource (`service.name`) and, **since `08-no-shutdown-flush-hook` (2026-08-07), the shutdown path with traces for real** — see the next row; before that fix "share the shutdown path" was true of the SDK's design but nothing ever called `sdk.shutdown()`, so it was aspirational. **Passing `logRecordProcessors` makes the SDK skip its `OTEL_LOGS_EXPORTER` branch entirely** (`sdk-node/build/src/sdk.js:144-156`), so that env var would be dead config on these two ships — don't add it. (The Spine's `OTEL_LOGS_EXPORTER=none` is real; it has no pipeline.)                                                                                                                                                              |
| `apps/shuffler/src/shutdownHooks.ts`                  | `installShutdownHandlers(drain, options)` — the SIGTERM/SIGINT flush-and-exit hook, called from `tracing.ts` right after `sdk.start()` as `installShutdownHandlers(() => sdk.shutdown(), { onTimeout, onDrainError })`. Listens on an injectable `signalSource` (default `process`), races `drain()` against an `unref()`'d `setTimeout` (default 5000ms — same bounded-wait shape as the verify harness's `bounded()` helper), and calls an injectable `exit` (default `process.exit`) **exactly once** regardless of how many signals fire or whether `drain()` resolves, rejects, or times out. `onTimeout`/`onDrainError` let the caller log without this file depending on `log.ts` — `tracing.ts` wires both to `log.warn`. **Installing this handler changes Node's default SIGTERM behavior**: with no handler, SIGTERM terminates the process immediately; once one exists, Node no longer exits on its own, so the file must call `exit()` itself once the race settles. Tested with a real `EventEmitter` as the fake signal source (no mocks) in `apps/shuffler/test/shutdownHooks.test.ts`: happy path, hung drain, rejecting drain, double-signal idempotency, SIGINT.                                                                                                                                                              |
| `apps/shuffler/src/telemetry-sampler.ts`              | `BackgroundChatterSampler` — keeps `CHATTER_SAMPLE_RATIO = 0.01` of probes (`kube-probe`, `elb-healthchecker` by UA) + `/health` + static assets by extension; 100% of everything else. Reads `http.user_agent`/`user_agent.original` and `http.target`/`url.path`. Unit tested.                                                                                                                                                                      |
| `apps/shuffler/src/log.ts`                            | The log surface: `log.info/warn/error(message, attributes, error?)`. Writes to **stdout and OTLP**. Takes its logger from the `api-logs` global, so it no-ops cleanly where no provider was registered (tests, `src/scripts/*`). An `Error` becomes `exception.type`/`.message`/`.stacktrace` attributes. Tested: `test/log.test.ts`. Duplicated in the Tabletop on purpose.                                                             |
| `apps/tabletop/src/server/log.ts`                     | The same file, at the 0.221 version line. Tested: `apps/tabletop/test/log.test.ts` (vitest).                                                                                                                                                                                                                                                                                                                                          |
| `apps/shuffler/src/tracing_util.ts`                   | **Helpers, not a wrapper**: `setCommonSpanAttributes()` (a `CommonAttributes` → span-attribute-name table), `stampRouteParamsOnSpan()` (writes `http.route.param.<key>`), `markCurrentSpanAsError()`. Callers still `import { trace } from "@opentelemetry/api"` directly.                                                                                                                                                                            |
| `apps/shuffler/src/apply-game-command.ts`             | **First route-protocol module with `markCurrentSpanAsError` calls living outside `app.ts`**, and the first route-level protocol logic in this app with unit-test coverage that needs neither Express nor Playwright (`test/apply-game-command.test.ts`, against the in-memory fakes). `applyGameCommand(deps, gameId, expectedVersion, mutate, beforeMutate?)` is Express-free — no `req`/`res` — and owns the "not-found" / "incompatible-version" `markCurrentSpanAsError` calls (moved verbatim from the old `loadGameFromParams` middleware) plus the persist-then-return protocol shared by **all 13** of `app.ts`'s game-mutation routes (`reveal-card`, `put-in-hand`, `put-on-top`, `put-on-bottom`, `shuffle`, `mulligan`, `move-hand-card`, `undo`, `draw`, `flip-card`, `flip-card-modal`, and — as of the tabletop-send veto hook (2026-08-08) — `play-card`/`discard-card`). This works because `markCurrentSpanAsError` itself has no Express dependency — just `trace.getActiveSpan()` — so centralizing it here continues the house pattern rather than breaking it, and guarantees the two error outcomes get identical telemetry across every route regardless of each route's rendering. Two request-parsing facts (`game.game_id.param`, `game.game_id.valid`) stayed in `app.ts`'s new `parseGameIdParam()` helper, since that's where the `:gameId` route param is actually parsed. `renderCommandOutcome`'s `renderApplied` callback widened from `(game, whatHappened) => string` to `(game, whatHappened) => string | void`, so a route that must send the response itself — `flip-card-modal` calls `res.render("partials/card-modal", …)` rather than returning a fragment string — can do so; `renderCommandOutcome` sends nothing further when the callback returns `undefined`. **The optional 5th parameter, `beforeMutate?: (game: GameState) => Promise<void>`, runs after the status/version checks and before `mutate`** — added so `play-card`/`discard-card` could keep their send-then-commit shape (tabletop gets the card first; only on success does `mutate` run) without forking back onto a hand-rolled protocol. A new `TableSendFailedError` class (message + `errorHtml`) is the only error `beforeMutate` may throw to abort the command before `mutate`/persist run; `applyGameCommand` catches specifically that class into a new `CommandOutcome` kind, `{ kind: "send-failed"; errorHtml: string }` — any other error `beforeMutate` throws propagates uncaught, same contract as `mutate`. `app.ts`'s `renderCommandOutcome` grew a matching `"send-failed"` case: 502 + `HX-Retarget`/`HX-Reswap` to `#modal-container` + the pre-rendered `errorHtml`, the same header shape as `"version-conflict"`. Both routes' `beforeMutate` closures call a shared local helper, `sendCardBeforeMutate(game, card, zoneHint, action)` in `app.ts`: it builds one attributes object (`table.name`, `card.instance_id`, `zone.hint`), stamps it on the active span via `trace.getActiveSpan()?.setAttributes`, and on `sendCardToTableFirst`'s failure calls `markCurrentSpanAsError(message, attributes)` then `log.error(message, attributes, error)` — attributes first, then the log for the stack, the house failure-path pattern — before throwing `TableSendFailedError`. `loadGameFromParams`/`requireValidVersion` themselves were already **deleted from `app.ts`** once `flip-card`/`flip-card-modal` (2026-08-08) left them with no remaining callers; with `play-card`/`discard-card` migrated too, **no route in `app.ts` still runs the old inline retrieve/reconstruct/status-check/version-check/mutate/persist protocol.** **Open, not done**: stamping `CommandOutcome.kind` on the span for every outcome (not just the error paths) was recommended in review but not implemented this pass — would make the "put the condition in an attribute" invariant apply to `not-active`/`version-conflict`/`applied` too. |
| `apps/tabletop/src/server/tracing.ts`                 | A **separate** Node SDK init, "modeled on the Shuffler's". Own inline `KubeProbeAwareSampler` (0.001 kube-probe / 0.01 ELB). **No middleware suppression, no static-asset or `/health` handling, reads only `http.user_agent`, and no test.** See Watch points. Same `logRecordProcessors` wiring as the Shuffler but with the 0.221 options-object constructor. **Since `19e1bdf` (2026-08-10, `tabletop-no-shutdown-flush`)** also calls `installShutdownHandlers(() => sdk.shutdown(), { onTimeout, onDrainError })` right after `sdk.start()`, same as the Shuffler — see the `shutdownHooks.ts` row below.                                                                                                                                                                                       |
| `apps/tabletop/src/server/shutdownHooks.ts`           | **A verbatim port of the Shuffler's `shutdownHooks.ts`** (2026-08-10, `19e1bdf`) — same `installShutdownHandlers(drain, options)` signature and logic (bounded drain via `Promise.race` against an `unref()`'d timer, exactly-once exit, injectable `signalSource`/`exit` for tests, log-agnostic `onTimeout`/`onDrainError`). Wired into `tracing.ts` using the Tabletop's own `log.ts` for the callbacks. Ported rather than shared, per the fleet's `tracing.ts`/`log.ts` duplication convention — the logic itself is version/framework-agnostic (just `EventEmitter`, `Promise.race`, `setTimeout().unref()`), so it needed no adaptation beyond the header comment. Tested in `apps/tabletop/test/shutdownHooks.test.ts` (adapted copy of the Shuffler's test, same 5 cases: drain-then-exit, bounded timeout, drain rejection, exactly-once on double signal, SIGINT). This closes the last open half of Invariant-adjacent shutdown coverage — both Node ships now flush their last OTel batch on SIGTERM/SIGINT instead of losing it. |
| `apps/shuffler/src/view/common/html-layout.ts`        | **The Shuffler's browser telemetry bootstrap — single-sourced since arch ticket 06 (`b268414`, 2026-08-08).** `formatHtmlHead(options)` is the one page shell: every Shuffler page's `<head>` — EJS pages via `views/partials/head.ejs` (a thin adapter reached through `app.locals`) and TS pages (`/game`, error pages) via `formatPageWrapper` — comes from here, so the bootstrap appears exactly once and cannot diverge again. Since `33b54d3` (2026-08-10) the guard+init is `initHoneycombTracing(apiKey)`, shipped as the exported literal string `HONEYCOMB_TRACING_INIT_SCRIPT`, tested by evaling that exact string in `apps/shuffler/test/html-layout-tracing-guard.test.ts`. See "The Shuffler's browser bootstrap" below for the script order, the ordering constraint, the guard (now key-aware), and the apiKey fallback.                                                                                                                                                              |
| `apps/tabletop/src/client/observability/index.ts`     | **The only real wrapper in the fleet.** Browser-only, self-described as "our own wrapper around the standard OpenTelemetry web SDK — nothing Honeycomb-specific". Surface: `initTracing()`, `inSpan()`, `setGlobalAttrs()` (via `GlobalAttributesSpanProcessor`, stamping e.g. `table.name` on every span), `currentTraceparent()`. Learns its destination by fetching `/otel-config.json`; tracing off is a valid local mode (logs a line, returns). |
| `services/spine/config/initializers/opentelemetry.rb` | Ruby: `SDK.configure` + `use_all`, then (since `spine-sampler`, 2026-08-10) `OpenTelemetry.tracer_provider.sampler = OpenTelemetry::SDK::Trace::Samplers.parent_based(root: TelemetrySampler::BackgroundChatterSampler.new)`. No wrapper. Rack instrumentation extracts inbound W3C context, so a Shuffler-initiated trace continues through event ingestion. In test nothing is configured and the SDK exports nowhere — fine by design.                                                                                                                                                                                    |
| `services/spine/lib/telemetry_sampler.rb`             | **First Ruby sampler in the fleet**, ported from the Shuffler's `telemetry-sampler.ts` — same `CHATTER_SAMPLE_RATIO = 0.01`, same "trickle, not zero" reasoning (a failing probe should stay visible). `TelemetrySampler.background_chatter?(attributes)` matches `kube-probe`/`elb-healthchecker` in the user-agent, or path exactly `/up`/`/rails/health` (query string stripped). Reads **both** semconv spellings per Invariant 4: `http.user_agent`/`user_agent.original`, `http.target`/`url.path`. `TelemetrySampler::BackgroundChatterSampler` duck-types `OpenTelemetry::SDK::Trace::Samplers`' interface (`description`, `should_sample?(trace_id:, parent_context:, links:, name:, kind:, attributes:)`) and delegates to `Samplers.trace_id_ratio_based(1.0)` or `.trace_id_ratio_based(CHATTER_SAMPLE_RATIO)`. Unit tested in `test/lib/telemetry_sampler_test.rb` (Minitest): both semconv spellings, non-matching cases, and a 2000-trace-id spread test on the sampler class. |
| `apps/shuffler/test/harness-telemetry/`               | **The fourth init path, and the first that isn't a ship** — the verify suite tracing itself. `harnessTracing.ts` (provider), `spanPlan.ts` (pure + tested), `otelReporter.ts` (Playwright reporter). Service `mtg-fleet-verify`. See "Dev-tooling telemetry" below.                                                                                                                                                                                    |

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

### The Spine's sampler: the first Ruby precedent (`spine-sampler`, 2026-08-10)

Until this change the Spine had **no sampler at all** — `use_all` traced every request at
100%, including the k8s liveness/readiness probe hitting `GET /up` on a 30-60s cycle
(`k8s/deployment.yaml`), roughly half of all Spine spans. `lib/telemetry_sampler.rb` +
`config/initializers/opentelemetry.rb` close that gap, and establish how a custom Ruby
sampler gets installed on this stack — worth copying verbatim the next time a Ruby service
needs one.

**There is no in-block `sampler=` option on `SDK.configure`.** Confirmed by reading the
installed gem source (opentelemetry-sdk 1.13.0): `Configurator#configure` has no
`sampler=`/`trace_config=` setter. The supported extension point is
`OpenTelemetry.tracer_provider.sampler =`, set **after** `configure` runs — `TracerProvider#sampler`
(`trace/tracer_provider.rb`) is a plain `attr_accessor` read fresh on every
`internal_start_span` call, so assigning it once `OpenTelemetry.tracer_provider` exists takes
effect immediately, no restart or re-`configure` needed. This is the Ruby analogue of the two
Node ships passing a `sampler:` option into `NodeSDK`'s constructor — different mechanism
(post-hoc assignment vs. constructor option), same place in the pipeline (root sampler on the
tracer provider), same reason to wrap in `parent_based(root: ...)` so a request that already
carries a sampled remote parent isn't re-sampled down.

**Confirmed Rack instrumentation attribute names** (`opentelemetry-instrumentation-rack`
0.31.1, read from `middlewares/old/event_handler.rb#request_span_attributes`): `http.method`,
`http.host`, `http.scheme`, `http.target` (path **+** query string), `http.user_agent` (only
set if the header is present) — the old-style semconv names. This is why
`TelemetrySampler.background_chatter?` checks `http.user_agent`/`http.target` first and falls
back to `user_agent.original`/`url.path` (Invariant 4): today's gem only emits the old names,
but the fallback means a future instrumentation-gem bump to stable semconv can't silently stop
this sampler from matching.

### The Shuffler's browser bootstrap (one shell, `html-layout.ts`)

Since arch ticket 06 (`b268414`, 2026-08-08) there is exactly ONE place the Shuffler's browser
telemetry starts: `formatHtmlHead()` in `apps/shuffler/src/view/common/html-layout.ts`. Before
that, `/game` carried its own inline copy of the tab-id logic and a duplicate `htmx:configRequest`
listener, and the two heads had drifted (the EJS head's init was guarded, `/game`'s wasn't — the
guarded one was kept).

**Script order, and why it's load-bearing:**

1. `<script src="/browser-tab-id.js">` — sets `window.browserTabId` from sessionStorage key
   `"browserTabId"` (mints a `crypto.randomUUID()` on first use; sessionStorage = **per-tab**,
   survives reload). Also registers the document-level `htmx:configRequest` listener that adds
   `X-Browser-Tab-Id` to every htmx request — one registration, every page.
2. `<script src="/hny.js">` — the vendored Honeycomb web SDK.
3. Inline init: `initHoneycombTracing(apiKey)` — a **named function**, not a bare guarded block
   (since `33b54d3`, 2026-08-10). It still guards on `window.Hny && window.browserTabId` first,
   then calls `Hny.initializeTracing({ apiKey, serviceName: "mtg-deck-shuffler-web", debug:
   false, provideOneLinkToHoneycomb: true, resourceAttributes: { "game.browser_tab_id":
   window.browserTabId } })`. See "The guard now covers the key" below — the function body is
   also the fix for the gap this section used to describe as open.

The order is a real constraint, stated in a code comment at the site: **the tab id is baked into
the OTel resource, which is immutable after init** — so `browser-tab-id.js` must have run before
the init. Don't reorder, and don't move the init into a deferred script.

**How the correlation works:** `game.browser_tab_id` lands on every browser span (resource
attribute), and the `X-Browser-Tab-Id` header lands on every htmx request, where `app.ts:52-57`
middleware stamps it on the server span via `setCommonSpanAttributes({ browserTabId })`. That
pair is the browser↔server join key, per tab.

**The apiKey**: `process.env.HONEYCOMB_INGEST_API_KEY || process.env.HONEYCOMB_API_KEY`, read
per-render. `HONEYCOMB_INGEST_API_KEY` is set **nowhere in this repo**; in prod the k8s secret
supplies `HONEYCOMB_API_KEY`, so the fallback is what actually fires everywhere today. **Don't
simplify away the first choice without checking prod** — it's the deliberate override slot.
Key-in-page is **sanctioned here** (Invariant 3: ingest keys are OK to publish in the browser;
Collectors are better, but the Shuffler has no collector — only the Tabletop does).

**The guard now covers the key too (fixed `33b54d3`, 2026-08-10; was the open buoy
`browser-tracing-key-guard`).** The guard used to check only `window.Hny && window.browserTabId`
— not the key — so when neither env var was set, the template interpolation baked in the truthy
literal string `"undefined"` and export silently 401'd: the browser cousin of the
`x-honeycomb-team=` keyless-header entry below, fails-open-invisibly again. Fixed by pulling the
guard body and the `Hny.initializeTracing` call into a named function,
`initHoneycombTracing(apiKey)`, shipped as one exported literal script-source string constant,
`HONEYCOMB_TRACING_INIT_SCRIPT` (`apps/shuffler/src/view/common/html-layout.ts`) — the inline
`<script>` tag both declares that function and immediately calls
`initHoneycombTracing("${apiKey}")`. The guard inside it now also skips init (with a
`console.warn`) when `apiKey` is empty or the literal string `"undefined"`, in addition to the
original `window.Hny && window.browserTabId` check. **Why a literal string constant, not a plain
TS function:** the script has to ship as-is inside the page's inline `<script>` tag (browser JS,
no build step reaches it) — shipping it as one exported constant means the exact source the
browser runs is also what `apps/shuffler/test/html-layout-tracing-guard.test.ts` evals (via
`new Function`) and exercises, so there is no separate reimplementation of the guard to drift out
of sync. That test covers all three cases: empty key, literal `"undefined"`, and a real key.
Untouched by this fix, as the buoy and the `-review` verdict both required: the
`HONEYCOMB_INGEST_API_KEY || HONEYCOMB_API_KEY` fallback, the script load order (tab-id before
tracing), and the single-bootstrap shape (one function, one shell, still reached by every page
through `formatHtmlHead`).

`/game`'s page-specific scripts (`htmx.js`, then the 409/502 `responseHandling` block — which must
stay after `htmx.js` — then `game.js`, `modal-query-params.js`) ride in the shell's `scriptsHtml`
tail as `GAME_HEAD_SCRIPTS_HTML`. One side effect of unification: `/game` now fetches
`/browser-tab-id.js` as a static asset instead of inlining it — covered by the existing
by-extension asset sampling, not a new noise source.

### Trace context embedded in event bodies (`traceparent`-in-body)

**Two separate, complementary mechanisms carry trace context on this fleet, and this file
had no section on the second one until `tabletop-cards-come-and-go` ticket 05
(2026-08-09) even though two ships were already doing it.**

1. **HTTP-header propagation** — automatic, via undici auto-instrumentation on outbound
   `fetch`/HTTP calls. This is how a Shuffler-initiated trace continues into the Spine
   (Rack instrumentation extracts the inbound W3C header) with zero application code.
   Ephemeral: it only exists on the wire for that one request.
2. **Body-embedded `traceparent`** — a W3C `00-{traceId}-{spanId}-{flags}` string minted
   into the JSON payload itself, alongside durable fields like `id` and `occurredAt`.
   This is for data that outlives the request: the Spine's persisted event log and its
   `/admin/tables` trace-link rendering need a `traceparent` *value*, not a header, because
   by the time an admin views the table the original request's span is long gone.
   `contracts/envelope.v1.json`'s `traceparent` field (pattern
   `^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$`, required) is explicit that this is
   **observability only, never durable causality** — that's the envelope's `id`.

Header propagation and body-embedded `traceparent` answer different questions ("what
trace is this HTTP call part of" vs. "what trace should this stored record link back
to") and neither substitutes for the other.

**The mint/format pattern now exists in three places, one per ship, each reading its own
tracing API's ambient span:**

| Where | Signature | Behavior with no active span |
| --- | --- | --- |
| `services/spine/app/controllers/application_controller.rb` `current_traceparent` | `-> String` | Synthesizes a well-formed random traceparent (`SecureRandom.hex`) — the Spine's own events (`table.created`, `seat.taken`) always need a value to persist. |
| `apps/tabletop/src/client/observability/index.ts` `currentTraceparent` | `-> string \| undefined` | Returns `undefined` — used only for propagation on a websocket connection URL, never for a durable field, so "no span, no value" is correct there. |
| `apps/shuffler/src/port-tabletop/traceparent.ts` `currentTraceparent` (new, ticket 05) | `-> string` | Synthesizes a well-formed random traceparent, same as the Spine — the envelope's `traceparent` field is **required**, so this helper can never return `undefined`. Additionally sets `traceparent.synthesized: true` on the active span (if one exists but lacks a valid `SpanContext`) when the fallback fires, so a real occurrence in production (vs. the expected test-only case, since every `card.played`/`seat.joined` send happens inside an Express request span) is visible on the trace rather than silently masquerading as a real trace link. |

All three format identically: `00-{32 hex traceId}-{16 hex spanId}-{2 hex flags}`. The
Shuffler's is the newest and the only one with the synthesized-fallback attribute — worth
copying to the Spine's `current_traceparent` if its silent fallback is ever suspected of
firing outside tests.

### Dev-tooling telemetry (the pattern for instrumenting our own tools)

`277bdfd` (2026-08-07) added the fleet's **first instrumentation of a tool rather than a ship**: the
Shuffler's Playwright verify suite traces itself to service **`mtg-fleet-verify`**, team `modernity`,
env `local`. Files: `apps/shuffler/test/harness-telemetry/`. It exists because the suite took 3.6–9.5
minutes while the app — the only instrumented part — was already known to be ~1–2% of wall clock, so
~98% of a developer-facing wait was invisible. **This is the shape `notes/add-opentelemetry.md` should
point at when the next tool wants tracing.**

The shape, and why each piece:

- **One emitter, and it's the reporter.** With `workers: 1`, Playwright's step tree already carries
  every `page.goto`, every `waitForTimeout` and every auto-retrying assertion. So one process = one
  provider = one flush, **no spec-file changes**, no per-worker lifecycle to get wrong. Spans are
  *built at the end from recorded timestamps* rather than held open across hooks — which is what lets
  the shape logic (`spanPlan.ts`) be a pure, unit-tested function.
- **Own `BasicTracerProvider` + `BatchSpanProcessor`.** No `NodeSDK` (see the resource table above),
  no auto-instrumentation (it would trace the runner's own fs/http/child_process — noise on top of the
  signal), no sampler, no context manager, no propagators.
- **No context manager means parenting is manual.** `context.active()` is always `ROOT_CONTEXT`, so
  every child is parented by hand via `trace.setSpan(parentContext, span)`. Forgetting it doesn't
  error — you get a few thousand sibling roots that still carry the right run id and still answer most
  queries. That's how it would land unnoticed, so the parent-child assertions in `spanPlan.test.ts`
  are a guard, not thoroughness.
- **Fleet-neutral service name.** `mtg-fleet-verify`, with the ship as a `verify.ship` attribute, so
  the Tabletop's and Spine's suites can export to the same place and be compared.
- **Run identity on EVERY span**, via a `RunAttributesSpanProcessor` that stamps at `onStart` —
  copied from the Tabletop browser wrapper's `GlobalAttributesSpanProcessor`, which is now the fleet's
  established way to do this. Carries `verify.run.id`, `verify.ship`, `verify.git.sha`. On every span,
  not just the root, so the run survives a fragmented trace and so per-condition breakdowns are
  possible.
- **RETIRED: `verify.data_db.existed` / `verify.data_db.bytes`.** These used to carry the
  cold/warm condition, because `data.db` was never reset between runs and four identical runs
  went 9.5 → 5.4 → 5.2 → 3.6 minutes purely from cache warmth — a duration without its cold/warm
  flag was not a number, it was a rumour. Every `verify.sh` run now gets its **own fresh SQLite
  file** (`VERIFY_DB_PATH`, deleted in the exit trap; see "How it works now" below), so every run
  is cold now, on purpose, and measured as no slower (52.0s cold, in line with prior warm runs).
  Once every run answers the same, the attribute answers nothing — worse, it would read as
  still-meaningful telemetry that is now permanently `false`/`0`, a fails-open-invisibly
  regression of the same shape this file keeps cataloguing. So the attribute-setting code was
  deleted from `otelReporter.ts` rather than left to silently stop meaning anything. **If you go
  looking for `verify.data_db.existed`/`.bytes` in Honeycomb, they stopped being emitted — don't
  read their absence as a pipeline break.**
- **Non-default `BatchSpanProcessor` settings are required at this volume**: `maxQueueSize: 8192`,
  `scheduledDelayMillis: 1000`. The defaults (2048 / 5000ms) drop on overflow **silently**, and the
  root's own `verify.span.count` counts spans *emitted*, not *exported* — invisible twice over.
  Measured on the first full run: 1,090 spans, and `verify.span.count` matched the dataset count
  exactly, so nothing was dropped.
- **Attributes beat spans here too (Invariant 1, applied to signal).** An `expect` faster than 100ms
  hid no time by definition, so it becomes `test.expect.count` / `.total_ms` /
  `.suppressed_count` on the test span instead of a span of its own. `EXPECT_THRESHOLD_MS` in
  `otelReporter.ts`. **This threshold is not a cost measure** — it exists because a 3ms assertion
  span answers no question anybody asks. Owner's call: **keep it at 100ms**. The suite optimizes
  against *where the time went*, and by construction the suppressed spans contain none of it;
  dropping to 0 would add ~1,000–2,000 spans of confirmed-empty duration to every waterfall. If a
  specific investigation actually needs sub-100ms fidelity, lower it for that run rather than for
  the default — the dial is one constant and the aggregates all carry `verify.run.id`.
- **Telemetry is never fatal and never blocking.** Same posture as `deploy-marker.sh`'s `|| true`:
  an empty Honeycomb team key counts as unconfigured, `shutdown()` is bounded by a `Promise.race`
  with an `unref`'d timer, and every reporter hook is wrapped. Proven end to end with a
  syntactically-valid-but-wrong key: exit code 0.
- **Trace context is deliberately NOT propagated into the browser.** The app's `ParentBasedSampler`
  would honor a sampled remote parent and never consult `BackgroundChatterSampler`, tracing every
  static asset at 100% across 51 tests — the exact noise regression `0f42c95` fixed, wearing the
  costume of success. Harness and app spans correlate by `verify.run.id` and time, in separate
  datasets. Verified: 33% of app spans are still their own trace roots (unchanged), and querying
  `verify.run.id` in the app dataset errors with "unknown column" — the cleanest possible proof that
  no harness attribute leaked across.

**Volume verdict: one trace per run STANDS, at 1,090 spans — with ~9× headroom.**

**Fact, with provenance: a trace becomes hard to read around ~10,000 spans; ~1,000 is comfortable.**
_(Jess, 2026-08-07, after opening the harness's actual 1,090-span waterfall in Honeycomb: "oh yeah, a
thousand spans is totally manageable. ten thousand gets bad.")_ This number got re-guessed three times
before anyone looked — triage said "a few hundred", this owner's review said "~1,000", this owner
post-measurement said "~2,000", and each guess was conservative. **It is now measured and
human-confirmed; use it instead of re-deriving it.** Splitting the verify harness into a trace per
spec is off the table for the foreseeable future.

Supporting the trace-per-run call either way: every acceptance query is an aggregate that never opens
the waterfall, and `verify.run.id` is on every span, so splitting later costs almost nothing.

### Volume: what still matters and what doesn't

**RETIRED (2026-08-07): "span volume against env `local`'s budget."** This KB carried a numbered
concern that "a dev tool must not become the environment's largest single span source," with a
~3,000-spans/run figure framed against a budget. **There is no budget.** _(Jess, directly,
2026-08-07: "I work at Honeycomb. Ingestion is free.")_ Ingest volume is not a cost constraint on
this fleet's telemetry decisions, in env `local` or in prod. Do not reintroduce it, in any ship, for
any signal — spans, logs, or attributes.

It is written down as retired rather than deleted on purpose. An agent who finds *no* guidance
invents a conservative one, and this file has already documented that exact loop: the trace-size
ceiling was guessed "a few hundred" → "~1,000" → "~2,000" before anyone looked and got ~10,000.
Absence of a rule is not silence; it reads as license to be cautious.

**Do not overshoot into "volume never matters."** Two reasons to be deliberate survive, and neither
is money:

1. **Can a human read the trace?** ~10,000 spans is where a waterfall gets hard; ~1,000 is
   comfortable (Jess, 2026-08-07, measured — above). Unaffected by the cost correction; it was always
   a usability ceiling.
2. **Does this span tell anyone anything?** A dataset of 10,000 mostly-trivial spans is harder to
   query well than 1,000 informative ones — noise crowds out the `GROUP BY` you actually wanted and
   makes every heatmap flatter. This is the surviving reason to threshold or aggregate, and it's the
   reason Invariant 1 prefers attributes: an attribute on an existing span sharpens it, a trivial
   child span dilutes the dataset.

So the question to ask of a proposed span is **"what would I learn from it?"**, never "what does it
cost?". If the answer is "nothing, by construction" — a 3ms assertion, 200 static-asset fetches — roll it
into a count attribute. If the answer is "which of 51 specs burned the minute", emit it, however many
that turns out to be.

**Synthesizing a span from shell timestamps — the recipe, because we want more of these.**
`verify build` is a full `tsc` on every run and was invisible; it is exactly the kind of phase that
lives outside the instrumented process. `verify.sh` captures epoch **millis** with
`node -e 'console.log(Date.now())'` (macOS bash 3.2 + BSD `date` have no `%N`; ~40ms per call, 6
calls) and passes them on the `npx playwright test` line; the reporter emits spans with explicit
start/end times. Measured: `verify build` 1.6s, `verify server boot` 0.7s.

Three guards, all unit tested, because **OTel reads a bare number as millis and errors on none of
the ways you can get it wrong**:

1. A **plausibility window** (within 24h of now) — seconds gives you a span in 1970, nanos one in the
   year 55000, neither of which throws.
2. **Absent means skip the span**, not `Number(undefined)` → `NaN` → nonsense timestamps.
3. **End-before-start is rejected.**

And in the shell: `stat`/`wc` on a file that may not exist needs a `[ -f ]` guard, or `set -e` turns a
telemetry-only addition into a hard verify failure on a fresh clone — a failure that never reproduces
on the machine where the file exists.

**Two exporter-robustness findings from this work, and one applies to the ships.**

- `provider.shutdown()` **rejects** when the exporter throws. Swallowed inside a `bounded()` helper:
  no telemetry problem may reach the caller.
- A **synchronously-throwing exporter leaves `BatchSpanProcessor`'s flush timer armed forever** — the
  result callback never arrives. Surfaced here as jest force-exiting a worker; in a long-lived process
  it is a real leak. Fixed with a `NeverThrowingExporter` wrapper: *a failed export must look like a
  failed export, not like an exception.* **Owner's judgment (2026-08-07): the ships want this too, but
  not urgently, and not as a copy-paste.** `apps/shuffler/src/tracing.ts` and the Tabletop's hand
  their bare `OTLPTraceExporter`/`OTLPLogExporter` to `NodeSDK`, so the same armed-timer path exists —
  but the observed trigger was a *test* exporter throwing synchronously, and `OTLPTraceExporter`
  reports transport failures through the callback rather than by throwing. So this is a latent
  robustness gap, not a live bug: worth doing when either ship's telemetry init is next opened, and
  worth remembering the moment anyone wraps or decorates an exporter (the natural place to introduce a
  synchronous throw). Not buoyed as its own ticket.

**Per-run isolation follows the same one-line-override pattern as the port.** `verify.sh` already
gave each run its own `VERIFY_PORT`; it does the same for persistence:
`VERIFY_DB_PATH="$(mktemp -u -t "mtg-verify-$VERIFY_RUN_ID").db"`, passed
inline as `SQLITE_DB_PATH="$VERIFY_DB_PATH"` on the same `node --import ./dist/tracing.js
dist/server.js &` line that sets `PORT=$VERIFY_PORT` — no app change needed, since
`src/server.ts` already read `SQLITE_DB_PATH || "./data.db"` at all three adapter construction
sites. `cleanup()`'s `EXIT INT TERM` trap does `rm -f "$VERIFY_DB_PATH"` alongside the existing
server `kill`. This is env wiring, not a secret, but it lives in the same script and follows the
same "override on the command line, never `export`" discipline as `VERIFY_*` below — the fresh
path only exists for the one `node` invocation it's set on.

**Secrets and source order.** `.env` in each ship sets
`OTEL_EXPORTER_OTLP_HEADERS="x-honeycomb-team=$HONEYCOMB_API_KEY"`, interpolated **at source time**.
`HONEYCOMB_API_KEY` lives in `.be` **at the repo root**. So `.be` must be sourced **before** `.env`,
or export silently 401s ("unknown API key"). Who does what:

- repo-root `run` — sources `.be`, warns if absent, then delegates. ✅
- `apps/tabletop/run`, `services/spine/run`, `apps/shuffler/verify.sh`, `apps/tabletop/verify.sh` —
  each walk `.be` then `"$REPO_ROOT/.be"`, then `.env`. ✅ `apps/shuffler/verify.sh` also **warns
  when neither candidate is found** (2026-08-07) instead of falling through in silence, matching the
  repo-root `run`.

**"Configured" is not "present": `.env` alone produces a keyless header.** Without `.be`, `.env` still
sets `OTEL_EXPORTER_OTLP_HEADERS="x-honeycomb-team="` — present, non-empty, and useless. A presence
check passes and you then 401 once per batch for the whole run. Any silent-off guard must treat an
**empty team key as unconfigured**; `isTelemetryConfigured()` in `harnessTracing.ts` is the reference
implementation.
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
`mtg-tabletop-web`, and — since `277bdfd` — **`mtg-fleet-verify`**, the verify harness's own dataset
(dev tooling, not a ship; fleet-wide by design so other suites can join it). Prod → env
`mtg-deck-shuffler` (orion cluster, jessitron-sandbox). The Spine's `/admin/tables` renders Honeycomb
trace links per event.

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
claim something is verified. (The Tabletop's browser `logError()` does have real callers now —
its own `window.onerror`/`unhandledrejection` handlers at
`apps/tabletop/src/client/observability/index.ts:130,135` — this row just predates that wiring.)

- `19e1bdf` (2026-08-10) "Flush OTel telemetry on shutdown in the Tabletop server" — closed the
  gap this file's Watch points had flagged since the Shuffler's own fix (`08-no-shutdown-flush-hook`,
  2026-08-07): the Tabletop's `tracing.ts` had no SIGTERM/SIGINT handler, so `verify.sh`'s
  `cleanup()` and every k8s pod termination could drop the last OTel batch. Ported
  `shutdownHooks.ts` verbatim (adapted copy, not a shared module — same duplication convention as
  `log.ts`), wired identically to the Shuffler's pattern. Confirmed with a red-then-green test
  (5/5 cases) and the full Tabletop suite (97/97) plus a clean build. Also re-hit the known
  worktree phantom-TS-types gotcha (README → History 2026-08-09) resolving itself with `npm
  install` from the worktree root, no code change — a second data point for that entry.

## History (why these rules exist)

- `spine-sampler` (2026-08-10) — the Spine got its first sampler, closing the gap this file's
  wiring table had flagged ("No wrapper", implicitly 100%-sample-everything). Ported the
  Shuffler's `BackgroundChatterSampler` shape into `lib/telemetry_sampler.rb`; wired via
  `OpenTelemetry.tracer_provider.sampler =` set right after `SDK.configure` runs, since
  `Configurator#configure` has no in-block sampler setter (confirmed against the installed gem
  source, opentelemetry-sdk 1.13.0). Also confirmed the Rack instrumentation's actual
  span-start attribute names (`http.method`/`http.host`/`http.scheme`/`http.target`/`http.user_agent`,
  opentelemetry-instrumentation-rack 0.31.1) rather than assuming semconv parity with the Node
  ships. 13 new Minitest cases, all passing; the pre-existing `bin/rails test` failure count
  (14 failures / 17 errors, an unrelated envelope-contract issue, confirmed via `git stash`)
  was unchanged by this work. See README → "The Spine's sampler: the first Ruby precedent."
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

  **Re-framed 2026-08-07: this was a signal problem, not a billing one.** The commit title says
  "drowning Honeycomb", which reads like a cost story; it isn't, and ingestion is free here anyway
  (see "Volume" above). The damage was that identical health-check traces outnumbered real user
  traces, so every dataset-wide query answered a question about the load balancer. The sampler is
  still right and still wanted — for that reason.
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

- `33b54d3` (2026-08-10) "Warn instead of silently 401'ing on browser tracing with no API key" —
  closed the `browser-tracing-key-guard` buoy this owner had surfaced 2026-08-08 during arch
  ticket 06. Confirms the fails-open-invisibly pattern one more time: a guard that checks
  `window.Hny && window.browserTabId` but not the key looks complete and isn't — an unset
  `HONEYCOMB_INGEST_API_KEY`/`HONEYCOMB_API_KEY` interpolated as the truthy string `"undefined"`,
  the guard passed, and export 401'd with nothing visible in the browser console. Fix and
  worked-example both in "The Shuffler's browser bootstrap" above.

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

- `277bdfd` (2026-08-07) "Trace the verify suite itself, to a new `mtg-fleet-verify` service" — the
  first non-ship init path, and the first time this owner's own review guidance was **overturned by
  measurement**. Full pattern in "Dev-tooling telemetry" above; what it taught the rules:
  - **The owner's non-negotiable was wrong, and checking `node_modules` is why we know.** The review
    demanded `OTEL_SERVICE_NAME` be set per-invocation. Reading the source showed
    `BasicTracerProvider` *cannot see that variable at all*, while `NodeSDK` lets it **override** an
    explicit `service.name`. So setting nothing was strictly safer than setting it. Two lessons:
    resource-vs-env merge behavior is per-provider and must be looked up, not recalled; and "measure,
    don't reason" applies to this KB's own claims. See the table under "How it works now".
  - **Fails-open-invisibly, instances four through six.** (1) `BatchSpanProcessor`'s default
    `maxQueueSize` drops on overflow while a span-count attribute — counting *emitted*, not
    *exported* — reports success. (2) A presence check on `OTEL_EXPORTER_OTLP_HEADERS` passes on
    `x-honeycomb-team=`, then 401s all run. (3) Manual parenting with no context manager: omit it and
    you get thousands of sibling roots that still answer most queries. Each got a test or a guard;
    none would have produced an error.
  - **A telemetry-only addition can still break the thing it measures**, in two ways that don't
    reproduce locally: `set -e` plus `stat` on a `data.db` that doesn't exist on a fresh clone, and
    `provider.shutdown()` rejecting when the exporter throws. Both fixed at the source rather than
    worked around.
  - **Instrumenting our own tooling is now a thing we do.** Also the first measured proof that
    Invariant 5's "new init paths must carry the build sha" check works: this one did, unprompted.
  - **The trace-size ceiling was guessed three times before anyone looked, always low.** "A few
    hundred" (triage) → "~1,000" (this owner's review) → "~2,000" (this owner, post-measurement) →
    **~10,000, from Jess opening the actual waterfall** (2026-08-07). Nobody was reasoning badly; the
    number is just unknowable from the armchair, and every armchair estimate erred toward caution and
    toward more engineering. Two rules fall out: **record human-confirmed numbers as facts with their
    provenance**, so the next agent inherits the observation instead of re-deriving a safer one; and
    **one measurement retires only the question it measured** — so "can a human read this trace"
    stayed separate from a second, cost-framed question. That second question turned out not to
    exist at all; Jess retired it hours later. See the next entry.
  - It immediately overturned the standing assumption about *why* the suite is slow —
    `waitForLoadState("networkidle")` at 141 calls / 76.5s beat the fixed sleeps at 38.8s. Which is
    the whole argument for the change: ~98% of the wait had been unmeasured.

- **2026-08-07, hours after `1a5d3a6`: "I work at Honeycomb. Ingestion is free." _(Jess, directly.)_**
  This voided a constraint the KB had reasoned under since its first version — that telemetry volume
  is a cost to be managed — and retired the numbered "span volume against env `local`'s budget"
  concern along with its ~3,000-spans/run figure. Recorded as **retired, not deleted** (see "Volume:
  what still matters and what doesn't"), because this file has documented the failure mode: an agent
  who finds no guidance invents a conservative one, which is the same "few hundred → ~1,000 →
  ~2,000" chain one entry up. What changed and what didn't:
  - Gone: cost as a reason to sample, threshold, aggregate, or not log. Everywhere, on every ship.
  - Unchanged: the ~10,000-span waterfall ceiling (always usability), the health-check sampler
    (always signal — that history entry is re-framed above), and Invariant 1's preference for
    attributes (never a cost argument; an attribute on an existing span is simply more useful than a
    row beside it).
  - New shape of the question: **"what would I learn from this span?"**, not "what does it cost?"
  - Two owner's calls made on the spot: **`EXPECT_THRESHOLD_MS` stays at 100** even with ~9× trace
    headroom, because the suppressed spans are empty *by construction* and
    would dilute the dataset they're meant to explain; and **the correction does not license
    volume-indifference** — this KB now names signal-to-noise as the surviving reason to be
    deliberate, so the next agent can't read "free" as "unbounded".
  - The general lesson: an *economic* premise can be as wrong as a technical one, and this KB had no
    provenance on that one at all — nobody ever measured or asked, it was just assumed from habits
    formed elsewhere. Assumptions about the world outside the code deserve the same "measure, don't
    reason" treatment as `node_modules`. Ask Jess.

- **Installing a signal handler changes Node's default behavior.** Once one exists, Node no
  longer exits on its own — the handler must call `exit()` itself after the drain settles, or
  every SIGTERM hangs the process forever. The easiest way to get this exactly backwards; it's
  why `apps/shuffler/src/shutdownHooks.ts` exists (see the wiring table) rather than a bare
  `sdk.start()` with no handler, which was the Shuffler's own state until this was found —
  dropping whatever batch hadn't flushed on **every** `verify.sh` run and **every** k8s pod
  termination in prod. `sdk.shutdown()` can hang or reject, so the drain is bounded by a
  `Promise.race` against an `unref()`'d timer, and both SIGTERM and SIGINT must trigger it
  exactly once. The Tabletop has the same gap, unfixed (`tabletop-no-shutdown-flush` in
  `TODO.md`).

- **2026-08-08, "Collapse 9 game-mutation routes onto `applyGameCommand`"** — `app.ts` had 9
  routes each starting with a copy-pasted `loadGameFromParams`/`requireValidVersion` middleware
  pair. Pulling the shared protocol into `apply-game-command.ts` moved two `markCurrentSpanAsError`
  calls (not-found, incompatible-version) off Express middleware and into an Express-free function
  — the first route-protocol code in this app with unit tests that need neither Express nor
  Playwright. This **worked without incident** because `markCurrentSpanAsError` was already
  Express-free (`trace.getActiveSpan()` only, per Invariant "manual span creation is almost
  nonexistent" above): moving its callers doesn't touch the ambient-span dependency this app
  leans on everywhere else. The two per-request-parsing facts (`game.game_id.param`,
  `game.game_id.valid`) stayed behind in `app.ts`'s new `parseGameIdParam()`, on the "attributes
  belong where the fact is actually known" principle — genuinely request-shaped facts don't
  migrate just because the surrounding logic did. Left undone, on purpose, for a future pass:
  stamping `CommandOutcome.kind` on the span for every outcome, not just the two error ones —
  currently `not-active`/`version-conflict`/`applied` produce no attribute of their own, so
  "which branch did this request take" is only answerable from the two failure paths.

- **2026-08-08, later the same day: `flip-card`/`flip-card-modal` migrated onto `applyGameCommand`
  too, and `loadGameFromParams`/`requireValidVersion` deleted.** These two were left behind in the
  first pass specifically because `flip-card-modal` doesn't return a fragment string — it calls
  `res.render("partials/card-modal", …)` itself, mid-handler, after computing prev/next navigation
  and building action-button HTML. `renderCommandOutcome`'s `renderApplied` callback signature
  widened from `(game, whatHappened) => string` to `(game, whatHappened) => string | void`: when it
  returns `undefined`, `renderCommandOutcome` trusts the callback already sent the response, rather
  than calling `res.send(undefined)`. `flip-card` (which does return a string, via
  `formatFlippingContainer`) needed no such accommodation — it migrated as plainly as the earlier 9.
  With both flip routes moved, `loadGameFromParams` and `requireValidVersion` had no remaining
  callers and were deleted outright, along with their inline `markCurrentSpanAsError` calls (now
  fully superseded by `apply-game-command.ts`'s copies). Only `play-card`/`discard-card` still run
  the old inline protocol, blocked on the tabletop-send veto hook they need that `applyGameCommand`
  doesn't yet support. **Lesson for the next migration of this shape:** a route that renders itself
  isn't a reason to leave it on the old protocol — widen the callback's return type instead, the way
  this one did, so the shared error-attribution telemetry doesn't end up permanently forked across
  two protocols for cosmetic reasons.

- **2026-08-08, later still: `play-card`/`discard-card` migrated too, closing out the tabletop-send
  veto hook `applyGameCommand` was missing.** `applyGameCommand` gained an optional 5th parameter,
  `beforeMutate?: (game: GameState) => Promise<void>`, running after the status/version checks and
  before `mutate` — the shape needed to keep send-then-commit (tabletop gets the card first; only on
  success does the game mutate) without a second hand-rolled protocol. A new `TableSendFailedError`
  class is the one error `beforeMutate` may throw to abort the command pre-mutate/persist;
  `applyGameCommand` catches specifically that class into a new `CommandOutcome` kind,
  `{ kind: "send-failed"; errorHtml: string }` — any other error still propagates uncaught, matching
  `mutate`'s existing contract. `app.ts` grew a `"send-failed"` case in `renderCommandOutcome` (502 +
  `HX-Retarget`/`HX-Reswap` to `#modal-container`, same header shape as `"version-conflict"`) and a
  shared local helper, `sendCardBeforeMutate(game, card, zoneHint, action)`, that both routes'
  `beforeMutate` closures call: one attributes object (`table.name`, `card.instance_id`,
  `zone.hint`) stamped on the active span, then on failure `markCurrentSpanAsError` followed by
  `log.error` (switched from bare `console.error`, now matching the house failure-path pattern)
  before throwing `TableSendFailedError`. **With this, no route in `app.ts` runs the old inline
  retrieve/reconstruct/status-check/version-check/mutate/persist protocol any more** — the
  migration that started with 9 routes, then 2 more (flip-card/flip-card-modal), is now complete
  for all 13. One near-miss caught by code review before commit, not by a test: a first draft of
  `/play-card`'s `mutate` callback dropped the `game.gameStatus()`/`cardsInLibrary`/`cardsInHand`/
  `game.full_json` span attributes that every other mutate callback in this file sets (`/draw`,
  `/shuffle`, etc.) — restored in the same commit. **Lesson: when a route's `mutate` callback grows
  a second responsibility (send-then-commit), diff it against a sibling route's callback, not just
  against its own pre-migration behavior** — the attributes are easy to drop because they're pure
  side effect on the span, not something a functional test would catch missing.

- **2026-08-08, arch ticket 06 (`b268414`): the Shuffler's two page-shell builders became one,
  and the browser telemetry bootstrap became single-sourced.** Before this, the EJS head and the
  `/game` head each carried their own copy of the tab-id + `Hny.initializeTracing` bootstrap, and
  they had **already drifted**: the EJS copy guarded init with `if (window.Hny &&
  window.browserTabId)`, `/game`'s was unguarded; `/game` also had its own inline tab-id
  implementation and a second `htmx:configRequest` listener. The unification kept the guarded
  variant and one listener registration. Two lessons: duplicated telemetry bootstrap drifts
  exactly like duplicated telemetry init does (the 0.219/0.221 story, browser edition — this KB
  had **no section on the browser bootstrap at all**, which is how the drift went unnoticed); and
  the review surfaced a latent fails-open-invisibly (the `"undefined"`-apiKey gap, buoyed as
  `browser-tracing-key-guard`) precisely because unifying forced someone to read both copies side
  by side. Full wiring now documented in "The Shuffler's browser bootstrap" above.

- **2026-08-09 (`11b6230`): the 0.219/0.221 skew gained a second failure mode, and this time the
  danger ran the other way.** An agent in a fresh worktree hit TS2561 on the Tabletop's correct
  `BatchLogRecordProcessor({ exporter })` line and came asking how to "fix" it. The build error was
  the *environment*: no `node_modules` in the worktree, so tsc resolved the main checkout's hoisted
  sdk-logs 0.219 types. The tempting fix — rewriting to 0.219's positional shape — would have
  compiled and **silently exported nothing**, the original skew bug reintroduced by its own
  compiler-shaped disguise. This owner's context consult said STOP, no code change; `npm install`
  from the worktree root resolved it and all tests (including the constructor-shape assertion in
  `apps/tabletop/test/log.test.ts`) pass. Lesson: **when duplicated-on-purpose telemetry code
  suddenly fails to typecheck, suspect the resolver before the code** — the constructor-shape test
  exists precisely so the code's correctness is a checkable fact, not a judgment call under a red
  build. Gotcha recorded in `notes/AGENT-NOTES.md`.

- **2026-08-09, `tabletop-http` (branch worktree-tabletop-http): prod Tabletop went plain http,
  and the browser telemetry destination moved with it.** tldraw ≥ 4 blanks an unlicensed canvas 5s
  after load on HTTPS non-loopback origins; plain http is exempt, so
  `table.jessitron.honeydemo.io` now rides its own ALB (IngressGroup `tabletop-http`, HTTP:80
  only, no TLS). What this owner learned and caught:
  - **The review caught a would-be silent outage before it shipped**: the first draft left
    `BROWSER_OTLP_TRACES_URL`/`BROWSER_OTLP_LOGS_URL` as `https://` absolute URLs. With no 443
    listener that's connection-refused — every browser span *and* the uncaught-error log pipeline
    gone, with a page that otherwise works perfectly. Fails-open-invisibly, browser-transport
    edition. Fixed in the same change; the configmap now carries a comment saying why http.
  - **Scheme is now coupled config across ships**: the four spots listed under Invariant 3 must
    agree (tabletop configmap ×2, collector CORS `allowed_origins`, Shuffler
    `TABLETOP_PUBLIC_URL`). "Add TLS back" is a four-file change plus reading the Tabletop
    README → Licensing, not an ingress tweak.
  - Also landed: `apps/tabletop/deploy.sh` dropped its `TLDRAW_LICENSE_KEY` hard-fail and checks
    the deployed canvas over http; a new runtime guard
    (`apps/tabletop/src/client/chooseLicenseKey.ts`) withholds any baked tldraw key on non-https
    origins — withholding means **empty string, not `undefined`** (undefined lets tldraw read the
    vite-baked env key itself). Healthcheck annotations (path `/health`, 30s interval — the probe
    sampling story) carried over to the new ALB unchanged; `KubeProbeAwareSampler` untouched;
    marker call and `.be`/`.env` sourcing in `deploy.sh` untouched.
  - **Post-deploy verification still owed at time of writing**: open the deployed table over http
    and confirm browser spans land in `mtg-tabletop-web` (env `mtg-deck-shuffler`).

- **2026-08-09, `tabletop-cards-come-and-go` ticket 05 ("contract validation gets
  real"): the Shuffler gained a third `traceparent`-minting helper.**
  `apps/shuffler/src/port-tabletop/traceparent.ts` mints the `traceparent` string
  `contracts/envelope.v1.json` now requires on every `card.played`/`seat.joined` send,
  in the same `00-{traceId}-{spanId}-{flags}` format already used by the Spine's
  `current_traceparent` and the Tabletop's `currentTraceparent`. This was the point at
  which the KB noticed it had **no section at all** on the body-embedded-`traceparent`
  pattern despite two ships already doing it — added above as "Trace context embedded
  in event bodies". The new helper's one deliberate difference from its two precedents:
  because the envelope field is required (unlike the Tabletop's `string | undefined`,
  used only for websocket-URL propagation), it always returns a well-formed string, and
  it stamps `traceparent.synthesized: true` on the active span when the no-span fallback
  fires — a fails-open-invisibly guard in the same family as this file's other ones: the
  fallback is expected only in tests (every real send happens inside an Express request
  span), so if it ever fires in production, the span says so instead of quietly minting
  a trace-shaped string that links to nothing.

- **2026-08-10, `logs-docs-catch-up`: this file's own stale claims about the browser logger,
  fixed.** Three spots (README Invariant 2, README "How it works now", README "Evidence") and one
  in `interactions.md` still said the Tabletop's browser had no logger and `log.ts` had "no real
  callers" — false since `ca6553f`'s log pipeline landed `logError()`, its own `LoggerProvider`,
  and the `/v1/logs` collector route (verified against source: `apps/tabletop/src/client/
  observability/index.ts`, `apps/tabletop/k8s/collector.yaml`, `apps/tabletop/k8s/ingress.yaml`).
  `logError` in fact has two real callers already — the file's own `window.onerror` and
  `unhandledrejection` handlers (lines 130, 135) — so "no real callers" was wrong even at face
  value, not just stale. `notes/add-opentelemetry.md` was also extended to cover onboarding a
  fourth ship's **logs** pipeline, not just tracing, so the next new ship doesn't repeat the gap
  this owner's README used to describe (Spine still has it: `spine-logs-in-traces` in `TODO.md`).
- **2026-08-10 (`.scratch/console-log-sweep/`): the Shuffler's remaining `console.*` calls were
  swept onto `log.ts`/span attributes, closing the app out as a worked example of Invariant 1 +
  Invariant 2 together, not just in `app.ts`.** Confirmed by reading the diff, not just the
  agent's report: `apps/shuffler/src/GameState.ts` (2 sites — the deck-has->2-commanders warning
  and the misnamed `warn()` helper, which called `console.log` despite its name), `server.ts`
  (5 module-load `log.info` calls, including the `tabletopUrl`/`dbPath` values that used to be
  string-interpolated into the message — now structured attributes), `SqlitePersistStateAdapter.ts`
  (1, a per-row parse failure recoverable by falling back to a placeholder — request still
  succeeds, so `log.warn`, not `log.error`), and `ArchidektDeckToDeckAdapter.ts` (1, the documented
  best-effort Scryfall-enrichment fallback, same reasoning). All four recoverable/no-request-failure
  sites follow the house pattern's spirit even though they're warnings, not errors: attributes on
  the active span (`trace.getActiveSpan()?.setAttributes(attrs)`) *and* `log.warn(message, attrs)`,
  not attributes-only — because unlike an in-request error, there's no guarantee anyone is looking
  at that specific span, so the fact needs to be findable as a log too.
  **The `GameState.ts` `warn()` helper is worth remembering as its own small fails-open-invisibly
  instance**: it was named `warn` but called `console.log`, so every warning it emitted (2 call
  sites, "card already on this face", "found card in unexpected location") looked like a routine
  log line with no severity, in no logging pipeline at all until this sweep — a warning that reads
  as fine is the same shape as a guard that "passes" without checking what it claims to check.
  `app.ts`'s existing 36 `markCurrentSpanAsError`+`log.error` sites (real request failures) and 8
  `server.ts`-style `log.info` startup lines were already the pattern; this pass extended it to the
  three files that had been missed. Confirmed clean:
  `grep -rn "console\." apps/shuffler/src | grep -v src/scripts` now returns only `log.ts`'s own
  three `console.*` calls (its intentional stdout mirror) — everything else in `src/` is `log.*`.
  `src/scripts/*` (documented CLI-script exception) and the two inline browser `<script>` strings
  in `state-copy.ts`/`html-layout.ts` are literal browser JS, not server code this owner's rule
  reaches. Verified with `npm test` (334/334, 40 suites) and `./verify.sh verify-yo-fast-start`.

## Related reading

`SEAMAP.md` + the three ship SEAMAPs (the "Observability is mandatory" line),
root `CLAUDE.md` → Observability, `notes/AGENT-NOTES.md` (`.be` ordering, browser collector, card
shapes carry no trace context, the sampler incident, middleware spans),
`notes/add-opentelemetry.md` (the runbook for a new TS service),
`notes/instrument-essential-fields.md`,
`services/spine/interpreter/docs/journeys/guide/15-listeners-and-telemetry.md`.
