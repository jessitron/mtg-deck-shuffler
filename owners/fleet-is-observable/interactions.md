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
- **`apps/shuffler/src/shutdownHooks.ts`'s `installShutdownHandlers`** — the SIGTERM/SIGINT flush-and-exit hook `tracing.ts` calls right after `sdk.start()`. Without it, SIGTERM (from `verify.sh`'s `cleanup()`, and from k8s on every pod termination) killed the process before the last OTel batch flushed. Fixed 2026-08-07 (`08-no-shutdown-flush-hook`). The Tabletop's `tracing.ts` has the same gap, not yet fixed.
- **Which provider class reads `OTEL_SERVICE_NAME`** — `BasicTracerProvider` can't see it (`resource ?? defaultResource()`, no `envDetector`); `NodeSDK` merges detected attrs on **top** of explicit ones, so it wins. Per-provider, opposite directions. README → How it works now.
- **`.env` producing a keyless `x-honeycomb-team=`** — "header present" is not "telemetry configured"; a silent-off guard must check the key is non-empty.

## Depended on by

- **Every production diagnosis** — the North Star includes "when something breaks, Honeycomb shows you why."
- **The Spine's `/admin/tables`** — renders per-event Honeycomb trace links; assumes trace context propagates Shuffler → Spine (Rack extracts W3C headers).
- **`verify.sh` telemetry checks** and the "app is up" confirmation from 1%-sampled probe traces.
- **Knowing why the verify suite is slow** — since `277bdfd` the suite traces itself to `mtg-fleet-verify` (one trace per run, `verify.run.id` on every span). Suite-speed work optimizes against those numbers, so the harness spans are load-bearing evidence, not decoration.
- **Correlating behaviour with releases** — `scripts/deploy-marker.sh` puts a `deploy` marker on every graph in env `mtg-deck-shuffler`. Local `deploy-*` git tags are never pushed, so the marker is the durable record of what shipped when.
- **Safe Harbor's "deployed and observable in Honeycomb"** — that claim should ship with a link. Honeycomb query runs and viewed traces never expire, so the URL is a permanent citation (README → Evidence).

## Watch points

- **Editing any `run`/`verify.sh`/`deploy.sh`**: preserve `.be`-then-`.env` sourcing. Exception: `apps/shuffler/run` deliberately skips `.be` (documented in `notes/AGENT-NOTES.md`) — don't "fix" it. **All three `deploy.sh` DO source `.be`** (the Shuffler's since 2026-08-01) because the deploy marker's key lives there; that is not the `run` exception and shouldn't be "made consistent" with it.
- **Reaching for `HONEYCOMB_API_KEY`**: it is the **`local`** environment's ingest key, `createDatasets` access only. It cannot write markers and it targets the wrong environment. Markers use `HONEYCOMB_MARKER_KEY` (env `mtg-deck-shuffler`). Check any key with `GET https://api.honeycomb.io/1/auth`; **writing to the wrong environment succeeds silently.** See README → How it works now.
- **Touching `scripts/deploy-marker.sh` or its callers**: keep it *after* `kubectl rollout status` (a marker should mean a deploy that landed) and keep it non-fatal (`|| true`) — the deploy is already done, so a marker problem must not report as a deploy failure. Keep the `/1/auth` environment guard; it exists because the failure it prevents is invisible.
- **Adding a new telemetry init path, or a fourth ship**: it must carry the build sha as a resource attribute (README → Invariant 5). The verify harness does; the three ships still don't (`build-sha-on-every-span` in `TODO.md`). There is now a worked example to copy, so "not yet implemented anywhere" is no longer an excuse.
- **Touching `apps/shuffler/test/harness-telemetry/`** (the verify suite's own tracing): **never swap `BasicTracerProvider` for `NodeSDK`** — `.env`'s `OTEL_SERVICE_NAME` would silently reclaim these spans into the app's dataset. Keep the non-default `BatchSpanProcessor` sizing (8192 / 1000ms; defaults drop silently at ~1,090 spans/run). Keep manual parenting (`trace.setSpan(...)`) and the parent-child assertions — with no context manager, forgetting it yields thousands of sibling roots that still answer most queries. Keep every path non-fatal: nothing here may change the suite's exit code. Full rationale: README → Dev-tooling telemetry.
- **Anything that would `export` telemetry env in a script after `.env` is sourced**: `.env` exports `OTEL_SERVICE_NAME` for the app server, and child processes inherit it. Pass per-command vars on the command line (`VERIFY_* … npx playwright test`), never `export`.
- **Propagating trace context into the browser from a test, or from anything that hits static assets**: don't. The app's `ParentBasedSampler` honors a sampled remote parent and bypasses `BackgroundChatterSampler` — every static asset at 100%, the `0f42c95` noise regression disguised as success (real user traces buried under identical asset fetches). Correlate by a run/session id attribute instead.
- **Wrapping or decorating an OTel exporter**: a *synchronous* throw from `export()` means the result callback never fires and `BatchSpanProcessor` leaves its flush timer armed forever. Report failures through the callback (`NeverThrowingExporter` in `harnessTracing.ts` is the pattern). The ships hand bare OTLP exporters to `NodeSDK` and have the same latent gap — worth fixing next time either `tracing.ts` is opened.
- **Reaching for a cost or budget argument about telemetry volume**: there isn't one. **Ingestion is free** _(Jess, 2026-08-07: "I work at Honeycomb.")_ — the old "a dev tool must not become the environment's largest span source" concern is **retired**, in `local` and in prod. Don't reintroduce it, and don't let its absence read as license to be cautious. README → Volume: what still matters and what doesn't.
- **Adding a span type to a high-volume emitter**: ask **"what would I learn from this span?"**, never "what does it cost?". If the answer is "nothing, by construction" (a 3ms assertion, 200 static-asset fetches), threshold it and roll the small ones into attributes on the span that already exists (`test.expect.count`/`.total_ms`/`.suppressed_count` is the worked example). If it would answer a real question, emit it however many that is. Invariant 1 is a *signal* control, not a volume control.
- **Deciding whether a trace is "too big"**: don't re-guess it — **~10,000 spans is where a waterfall gets hard to read; ~1,000 is comfortable** (Jess, 2026-08-07, from the real 1,090-span harness waterfall; three agent guesses before that were all too conservative). That is a *usability* ceiling, and it is unaffected by ingestion being free. The other surviving question is signal-to-noise: 10,000 trivial spans are harder to query well than 1,000 informative ones. README → Volume.
- **Lowering `EXPECT_THRESHOLD_MS` in `otelReporter.ts`**: owner's call is **keep it at 100ms**.
  It was never a cost measure — an assertion that resolved in 3ms hid no time by definition, so
  those spans are confirmed-empty. Lower it for one investigative run if a specific question
  needs it; don't change the default.
- **Looking for `verify.data_db.existed` / `verify.data_db.bytes` in Honeycomb**: they're gone —
  `verify.sh` now gives every run its own fresh `SQLITE_DB_PATH`, so the cold/warm condition they
  tracked no longer varies. Don't reintroduce them as a "helpful" restore; a condition that's now
  constant makes the attribute worthless, not just outdated. README → Dev-tooling telemetry.
- **Adding a per-run resource override in `verify.sh` (a temp file, a temp path, anything scoped to
  one run)**: copy the existing shape — mint it keyed to `VERIFY_RUN_ID` (or similarly unique),
  pass it inline on the one command that needs it (never `export`), clean it up in the `cleanup()`
  trap. `VERIFY_PORT` and `VERIFY_DB_PATH` are both this shape now; don't invent a second one.
- **Synthesizing spans from timestamps captured outside the process**: OTel reads a bare number as **millis** and errors on none of the ways you can get it wrong (seconds → 1970, nanos → year 55000, `undefined` → `NaN`). Validate against a plausibility window and skip the span rather than emit garbage. Recipe in README → Dev-tooling telemetry.
- **Upgrading `@opentelemetry/*`**: bare `GET` spans with no `http.route` afterward = ESM patching broke. Check the loader wiring (`node --import`, `register(...)`).
- **Touching `apps/shuffler/src/telemetry-sampler.ts`**: keep `test/telemetry-sampler.test.ts` passing and meaningful — the previous inline sampler was silently broken for months (see README → History).
- **Recording that something happened**: never `span.addEvent`. Attributes on the span you're in — always the first choice — or, when there's no span to hang it on, `log.info/warn/error` from that ship's `log.ts`. The two Node ships have that; the Spine doesn't yet (`spine-logs-in-traces` in `TODO.md`). The browser claim in README is stale — `logs-docs-catch-up` will fix it. Violation inventory in README.
- **Touching either Node ship's `log.ts` or its `logRecordProcessors`**: the two ships are on different OTel version lines (0.219 / 0.221) with **incompatible constructor signatures** for the same classes. Don't paste between ships; run both ships' tests. Wrong shape = silent no-export.
- **Adding logging to a hot path**: logs are not sampled, on purpose. That's *readable* only because nothing logs per-request (not a money question — ingest is free). If you're about to, put it on the span instead, where it correlates with everything else — or reopen the sampling question deliberately (README → Invariant 2).
- **Adding HTTP middleware or changing routes**: confirm spans still get `http.route` and the route-param stamping (`stampRouteParamsOnSpan`) still fires.
- **Adding a game-mutation route in `apps/shuffler/src/app.ts`**: 11 of them (`reveal-card`,
  `put-in-hand`, `put-on-top`, `put-on-bottom`, `shuffle`, `mulligan`, `move-hand-card`, `undo`,
  `draw`, `flip-card`, `flip-card-modal`) now go through `apply-game-command.ts`'s
  `applyGameCommand()`, which owns the "not-found"/"incompatible-version" `markCurrentSpanAsError`
  calls for all of them — don't re-add per-route copies of those two. Only `play-card`/
  `discard-card` (they need a tabletop-send veto hook `applyGameCommand` doesn't support yet)
  still run the old inline retrieve/reconstruct/status-check/version-check/mutate/persist protocol
  with their own copies of those calls. `loadGameFromParams`/`requireValidVersion` — the middleware
  pair the first 9 routes used to share — are **gone**, deleted once `flip-card`/`flip-card-modal`
  left them with no callers; don't resurrect that pair for a new route. A route whose response
  can't be expressed as a returned string (e.g. it calls `res.render(...)` itself, like
  `flip-card-modal`) can still use `applyGameCommand`/`renderCommandOutcome` — `renderApplied` may
  return `string | void`; returning `undefined` tells `renderCommandOutcome` the callback already
  sent the response. README → wiring table (`apply-game-command.ts` row) and History.
- **A new service/ship**: OTel from its first commit (`notes/add-opentelemetry.md` is the runbook).
- **Installing or editing a process signal handler for shutdown**: installing a SIGTERM/SIGINT handler changes Node's *default* behavior — with no handler, Node exits immediately on the signal; once a handler exists, Node no longer exits on its own, so the handler must call `exit()` itself once the drain settles or the process hangs forever on every signal. `apps/shuffler/src/shutdownHooks.ts` is the reference shape: bound the drain with a `Promise.race` against an `unref()`'d timer (a hung exporter must not outlast a k8s termination grace period), and guard idempotency so a second signal doesn't fire twice. The Tabletop's `tracing.ts` still has no such hook — copy this pattern there, don't re-derive it.
- **Callbacks and timers**: they outlive the span that scheduled them. AsyncLocalStorage still hands you the *context*, so `getActiveSpan()` returns an **ended** span — `addEvent` throws there rather than no-op'ing. Use a log; it still carries the trace id, so it lands on the trace anyway. (`rooms.ts` was the worked example; fixed in `6f319a2`, kept in README as the argument.)

## Not related to

- **The Honeycomb MCP server config** (`honeycomb-modernity`) — that's the query side; this owner guards the emit side.
- **The Shuffler's clipboard/tabletop send flow** — its failure handling is Table Mode's business; only its spans are mine.
