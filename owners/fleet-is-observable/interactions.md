# Interactions — the fleet is observable

_Distilled edges; the full story (violation inventory, history, per-ship wiring table) is in `README.md`._

## Depends on

- **`.be`-before-`.env` source order** — `HONEYCOMB_API_KEY` lives in repo-root `.be`; each ship's `.env` interpolates it at source time. Wrong order → silent 401 export.
- **OTel dependency versions and the ESM `--import` loader** (Shuffler, Tabletop) — the `-r` require hook silently fails to patch `import`ed modules.
- **Express instrumentation config** — `ignoreLayersType: [MIDDLEWARE]` keeps traces at 2 spans, not 8.
- **Samplers reading both semconv spellings** (`http.user_agent`/`user_agent.original`, `http.target`/`url.path`) — a sampler that stops matching fails open, silently.
- **The Tabletop's browser collector** (`apps/tabletop/k8s/collector.yaml`, same-origin `/v1/traces` + `/v1/logs`) — keyless browser export. Since `tabletop-http` (2026-08-09) the destination is **`http://`** on a dedicated ALB with no 443 listener (tldraw license gate); an `https://` browser OTLP URL is connection-refused and silently kills browser telemetry.
- **The Shuffler's one page shell** (`formatHtmlHead` in `apps/shuffler/src/view/common/html-layout.ts`, since `b268414`) — every page's browser telemetry bootstrap (tab-id script → `hny.js` → guarded `Hny.initializeTracing`, in that order) comes from this one function; EJS pages reach it through `views/partials/head.ejs`. The `X-Browser-Tab-Id`/`game.browser_tab_id` browser↔server correlation depends on it.
- **Auto-instrumentation carrying the trace** — the Shuffler creates zero manual spans; everything hangs off the ambient request span.
- **The NodeSDK owning logs as well as traces** (`logRecordProcessors`) — that shared wiring is what gives log records the same resource (`service.name`, so the same dataset) and shutdown path as spans. It also means `OTEL_LOGS_EXPORTER` is inert on those ships.
- **`apps/shuffler/src/shutdownHooks.ts`'s `installShutdownHandlers`** — the SIGTERM/SIGINT flush-and-exit hook `tracing.ts` calls right after `sdk.start()`. Without it, SIGTERM (from `verify.sh`'s `cleanup()`, and from k8s on every pod termination) killed the process before the last OTel batch flushed. Fixed 2026-08-07 (`08-no-shutdown-flush-hook`). **The Tabletop got the same fix on 2026-08-10** (`19e1bdf`, `tabletop-no-shutdown-flush`): `apps/tabletop/src/server/shutdownHooks.ts` is a verbatim port, wired into `apps/tabletop/src/server/tracing.ts` identically — `installShutdownHandlers(() => sdk.shutdown(), { onTimeout, onDrainError })` right after `sdk.start()`, using the Tabletop's own `log.ts`. Both ships now close this gap; there is no longer a ship with an un-hooked `tracing.ts`.
- **Which provider class reads `OTEL_SERVICE_NAME`** — `BasicTracerProvider` can't see it (`resource ?? defaultResource()`, no `envDetector`); `NodeSDK` merges detected attrs on **top** of explicit ones, so it wins. Per-provider, opposite directions. README → How it works now.
- **`.env` producing a keyless `x-honeycomb-team=`** — "header present" is not "telemetry configured"; a silent-off guard must check the key is non-empty.
- **The `traceparent`-in-body minting sites** — same `00-{traceId}-{spanId}-{flags}` format, each reading its own tracing API's ambient span. **Still two live sites**: `apps/tabletop/src/client/observability/index.ts` and `apps/shuffler/src/port-tabletop/traceparent.ts`. `services/spine/app/controllers/application_controller.rb`'s `current_traceparent` was deleted with the rest of the Rails app (ticket 01, 2026-08-10); the Roda rewrite's boot-only ticket (02, 2026-08-11) has OTel wiring back but no tables/seats/events yet, so there's still nothing to mint a `traceparent` for. A later ticket adding events will need an equivalent never-`nil` minting site (README → "Trace context embedded in event bodies" has the shape to copy) before the Spine can round-trip a `traceparent` into its own persisted events again. This is separate from HTTP-header propagation (automatic, via undici auto-instrumentation); it exists because `contracts/envelope.v1.json` requires a durable `traceparent` value in the persisted event body, which a header can't provide once the request is over. **Still exactly two sites, not three**: the Shuffler's Spine send (`shuffler-posts-to-spine`, 2026-08-10, `src/port-spine/sendToSpine.ts`) reuses the Shuffler's existing site (`buildCardPlayedEvent` → `currentTraceparent()`) rather than minting its own — it just calls that same function a second time per play (once for the Tabletop's envelope, once for the Spine's), so the two envelopes get different event `id`s but an identical `traceparent` value, since both calls read the same still-active request span.

## Depended on by

- **Every production diagnosis** — the North Star includes "when something breaks, Honeycomb shows you why."
- **The Spine's `/admin/tables`** — historical: it rendered per-event Honeycomb trace links and assumed trace context propagates Shuffler → Spine (Rack extracts W3C headers), confirmed live end-to-end by `shuffler-posts-to-spine` (2026-08-10). The whole Rails Spine, `/admin/tables` included, was deleted the same day (ticket 01 of `spine-roda-rewrite`); the Roda rewrite's boot-only ticket (02, 2026-08-11) has OTel back but no admin view or events yet — a later ticket will need an equivalent admin view before this dependency is real again.
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
- **Touching the Tabletop's ingress, its URL scheme, or "just adding TLS back"**: prod
  `table.jessitron.honeydemo.io` is **plain http on purpose** (tldraw license gate — see
  `apps/tabletop/README.md` → Licensing), on its own ALB, IngressGroup `tabletop-http`. The
  app itself is served only from `mtg-tabletop-ingress` (HTTP:80). A second ingress in the same
  group, `mtg-tabletop-https-downgrade`, owns a 443 listener meant to catch https-first browsers
  — **its redirect action is currently broken** (see the `group.name` incident below); don't
  assume it works or copy its shape. Four config spots are scheme-coupled and must agree, and
  three of them are telemetry: `BROWSER_OTLP_TRACES_URL` + `BROWSER_OTLP_LOGS_URL`
  (`apps/tabletop/k8s/configmap.yaml`), CORS `allowed_origins`
  (`apps/tabletop/k8s/collector.yaml`), plus the Shuffler's `TABLETOP_PUBLIC_URL`. An
  `https://` OTLP URL against this ALB is **connection-refused** — all browser spans and the
  uncaught-error log pipeline vanish while the page works fine. Keep the healthcheck
  annotations (`/health`, 30s) if the ingress moves again — they're part of the probe-noise
  story. Both ALBs share the access-log bucket/prefix; ALB name in the object key tells them
  apart.
- **Adding, editing, or re-deploying any ingress in the `tabletop-http` (or any) IngressGroup**:
  ingresses sharing `alb.ingress.kubernetes.io/group.name` reconcile as **one ALB** — a single
  malformed ingress (invalid action, conflicting listener config, etc.) produces
  `FailedDeployModel` on **every** ingress in the group, not just the broken one, blocking routing
  changes fleet-wide for as long as it stays applied. This actually happened 2026-08-10:
  `mtg-tabletop-https-downgrade`'s HTTPS→HTTP redirect action (`redirectConfig.protocol: "HTTP"`)
  is invalid per AWS (`InvalidLoadBalancerAction`), and it blocked `mtg-tabletop-ingress` — the
  ingress carrying `/v1/traces`/`/v1/logs` — for ~27 hours before someone `kubectl delete`d it live.
  **The git file and `apps/tabletop/deploy.sh`'s `kubectl apply` of it were never fixed** — the next
  Tabletop deploy re-applies the broken ingress and can reopen this. Before touching either ingress
  in this group, check whether `k8s/ingress-https-downgrade.yaml` still contains the broken action;
  if so, fix or remove it before deploying, don't just work around it. README → Invariant 3 has the
  full incident writeup and what a real HTTPS-downgrade fix would require (a real ACM cert + HTTPS
  target, not a same-group redirect ingress).
- **Upgrading `@opentelemetry/*`**: bare `GET` spans with no `http.route` afterward = ESM patching broke. Check the loader wiring (`node --import`, `register(...)`).
- **Touching `apps/shuffler/src/telemetry-sampler.ts`**: keep `test/telemetry-sampler.test.ts` passing and meaningful — the previous inline sampler was silently broken for months (see README → History).
- **`services/spine/lib/telemetry_sampler.rb` no longer exists** (deleted with the whole Rails Spine, ticket 01 of `spine-roda-rewrite`, 2026-08-10). The shape and reasoning (both semconv spellings, 1% not 0%) are kept in README → "The Spine's sampler: the first Ruby precedent" as a worked example, but **the rewrite spec says don't port `BackgroundChatterSampler` back** — it was flagged broken, and the new Roda service (booted in ticket 02, 2026-08-11, currently at 100% sampling, no sampler module) starts at 100% sampling. Don't go looking for the old file or its test, and don't add a sampler back without a fresh decision — "revisit once start/stop behavior is confirmed clean" is the standing condition (`services/spine/config/telemetry.rb`'s header comment).
- **Mounting a Rack-based OTel instrumentation gem (any Ruby service, not just the Spine)**: Rack/Roda has no railtie-style auto-injection point. The gem (e.g. `opentelemetry-instrumentation-rack`) only *registers* itself via `SDK.configure`'s `use` — it emits **zero spans** until the app explicitly mounts its middleware, e.g. `services/spine/app.rb`'s `use(*OpenTelemetry::Instrumentation::Rack::Instrumentation.instance.middleware_args)`. Skipping this fails silently: the app boots, logs "successfully installed", requests return 200, and nothing reaches Honeycomb. Use `middleware_args` (not a hardcoded middleware class) — the right `TracerMiddleware` variant depends on `OTEL_SEMCONV_STABILITY_OPT_IN`. README → wiring table (`services/spine/` row) and History, 2026-08-11.
- **Recording that something happened**: never `span.addEvent`. Attributes on the span you're in — always the first choice — or, when there's no span to hang it on, `log.info/warn/error` from that ship's `log.ts` (the two Node ships) or `logError()` in the Tabletop's browser (`apps/tabletop/src/client/observability/index.ts`). The Spine doesn't have one yet (`spine-logs-in-traces` in `TODO.md`). Violation inventory in README.
- **Touching either Node ship's `log.ts` or its `logRecordProcessors`**: both ships are on the **same** OTel version line now (0.221, since `align-otel-versions`, 2026-08-10) — but nothing pins them to stay that way, and the two copies have genuinely **incompatible constructor signatures** across version lines for the same classes (`new BatchLogRecordProcessor(exporter)` pre-0.221 vs `new BatchLogRecordProcessor({ exporter })` at 0.221+). Don't paste between ships without checking both `package.json`s still match; run both ships' tests. Wrong shape = silent no-export. **And if the correct shape suddenly fails to typecheck, suspect the resolver, not the code**: a fresh worktree with no `node_modules` resolves the main checkout's hoisted types from whatever version line the main checkout is on — phantom TS errors against correct code, "fixed" only by `npm install` in the worktree, never by changing the constructor shape (`notes/AGENT-NOTES.md` → worktree node_modules leak; README → History 2026-08-09, and → History 2026-08-10 `align-otel-versions`).
- **Adding logging to a hot path**: logs are not sampled, on purpose. That's *readable* only because nothing logs per-request (not a money question — ingest is free). If you're about to, put it on the span instead, where it correlates with everything else — or reopen the sampling question deliberately (README → Invariant 2).
- **Adding HTTP middleware or changing routes**: confirm spans still get `http.route` and the route-param stamping (`stampRouteParamsOnSpan`) still fires.
- **Editing `apps/shuffler/src/view/common/html-layout.ts` or `views/partials/head.ejs`**: the
  browser bootstrap's script order is load-bearing — `browser-tab-id.js` must run before the
  inline `initHoneycombTracing(apiKey)` call, because the tab id goes into the OTel **resource**,
  immutable after init. The guard (inside `HONEYCOMB_TRACING_INIT_SCRIPT`, fixed `33b54d3`,
  2026-08-10) now checks both `window.Hny && window.browserTabId` **and** the apiKey — it skips
  init with a `console.warn` when the key is empty or the literal string `"undefined"`. That
  string constant is exported and is exactly what
  `apps/shuffler/test/html-layout-tracing-guard.test.ts` evals via `new Function` — if you touch
  the guard, keep the source-of-truth exported and run that test, don't reimplement it. Keep the
  two-var apiKey fallback (`HONEYCOMB_INGEST_API_KEY || HONEYCOMB_API_KEY`): the first is set
  nowhere in-repo but is the deliberate override slot — check prod before "simplifying" it.
  Key-in-page is sanctioned (Invariant 3; the Shuffler has no collector). And never add a
  **second** bootstrap anywhere — one shell is the whole point (README → The Shuffler's browser
  bootstrap).
- **Adding a game-mutation route in `apps/shuffler/src/app.ts`**: **all 13** game-mutation routes
  (`reveal-card`, `put-in-hand`, `put-on-top`, `put-on-bottom`, `shuffle`, `mulligan`,
  `move-hand-card`, `undo`, `draw`, `flip-card`, `flip-card-modal`, `play-card`, `discard-card`)
  now go through `apply-game-command.ts`'s `applyGameCommand()`, which owns the
  "not-found"/"incompatible-version" `markCurrentSpanAsError` calls for all of them — don't re-add
  per-route copies of those two. **No route in `app.ts` still runs the old inline
  retrieve/reconstruct/status-check/version-check/mutate/persist protocol** — `play-card`/
  `discard-card` were the last holdouts and migrated 2026-08-08 using `applyGameCommand`'s new
  optional `beforeMutate?: (game) => Promise<void>` parameter (runs after the status/version
  checks, before `mutate`) as their tabletop-send veto hook: throwing the new `TableSendFailedError`
  aborts the command pre-mutate/persist and yields a `{ kind: "send-failed"; errorHtml }`
  `CommandOutcome`, rendered by a new `"send-failed"` case in `renderCommandOutcome` (502 +
  `HX-Retarget`/`HX-Reswap` to `#modal-container`). Both routes' `beforeMutate` closures call a
  shared `sendCardBeforeMutate()` helper in `app.ts` for the attribute-then-log failure telemetry.
  `loadGameFromParams`/`requireValidVersion` — the middleware pair the first 9 routes used to share
  — are **gone**, deleted once `flip-card`/`flip-card-modal` left them with no callers; don't
  resurrect that pair for a new route. A route whose response can't be expressed as a returned
  string (e.g. it calls `res.render(...)` itself, like `flip-card-modal`) can still use
  `applyGameCommand`/`renderCommandOutcome` — `renderApplied` may return `string | void`; returning
  `undefined` tells `renderCommandOutcome` the callback already sent the response. A route that
  needs a required side effect before mutating (not just permission-checking) can use
  `beforeMutate` and throw `TableSendFailedError` (or let any other error propagate uncaught, same
  as `mutate`'s contract) — don't hand-roll a second send-then-commit protocol. README → wiring
  table (`apply-game-command.ts` row) and History.
- **Adding another best-effort outbound send from the Shuffler** (a third destination, or a new event kind to an existing one): copy `sendCardPlayedToSpineBestEffort`/`sendSeatJoinedBestEffort`'s shape — span attribute (`<name>.send_failed: true`) + `log.warn`, never throw, and let the outbound `fetch` ride ambient auto-instrumentation (no manual span). If the payload needs a durable `traceparent` field, reuse the existing minting call for that event kind (see the "three sites" bullet above) rather than adding a fourth site — and remember each call site mints its own event `id`, so sending the "same" logical event to two destinations from two separate `buildXEvent()` calls produces two different `id`s with one shared `traceparent`, which is fine but worth knowing before assuming dedup-by-`id` works across destinations.
- **A new service/ship**: OTel from its first commit (`notes/add-opentelemetry.md` is the runbook). **The Roda Spine did this** — ticket 02 of `spine-roda-rewrite` (2026-08-11) landed `config/telemetry.rb` + `app.rb`'s explicit Rack middleware mount + `run`/`.env` in the same commit as the boot-only `GET /up`, with no sampler port-over (the spec explicitly excludes `BackgroundChatterSampler` — flagged broken — and starts at 100% sampling; see README wiring-table row and History). **Remaining gap for whoever adds a Rack-based instrumentation gem to any future Ruby service**: unlike Rails' railtie, Rack/Roda has no auto-injection point — the gem only registers itself, and produces zero spans until the app explicitly mounts `middleware_args` (see the new Watch point below). No events/traceparent-minting site yet either (README → "Trace context embedded in event bodies") — that lands once a later ticket gives the Spine tables/seats/events again.
- **Installing or editing a process signal handler for shutdown**: installing a SIGTERM/SIGINT handler changes Node's *default* behavior — with no handler, Node exits immediately on the signal; once a handler exists, Node no longer exits on its own, so the handler must call `exit()` itself once the drain settles or the process hangs forever on every signal. `apps/shuffler/src/shutdownHooks.ts` is the reference shape: bound the drain with a `Promise.race` against an `unref()`'d timer (a hung exporter must not outlast a k8s termination grace period), and guard idempotency so a second signal doesn't fire twice. **The Tabletop has its own copy now** (`apps/tabletop/src/server/shutdownHooks.ts`, 2026-08-10, `19e1bdf`) — a verbatim port, per the fleet's duplication convention, not a shared module. Both ships' `tracing.ts` now install it right after `sdk.start()`.
- **Adding a new named event to `usePhysicsAnnouncements.ts` (or a third `store.listen()` → `inSpan()` hook alongside it and `useCardArrivalSpans.ts`)**: keep detection where the gesture's own hook already computes it (`MtgCardShapeUtil`'s `onClick`/`onTranslateEnd`/`onDragShapesIn`) — this listener only translates the resulting store diff into a span name, it never re-implements gesture detection. Filter by tldraw's `source` option (`"user"` vs `"remote"`), not by re-deriving "was this me" — a remote peer runs the same hook and announces its own gestures under its own `actor: TAB_ID`. If the new event can fire from a diff that tldraw writes repeatedly during a drag (anything under `Translating.ts`, no batching to settle), it needs the same debounce the generic `shape.moved`/`shape.changed` fallback uses (`GENERIC_SETTLE_MS` = 300ms per shape id) — a single-shot write (`onClick`, `onTranslateEnd`) does not.
- **Callbacks and timers**: they outlive the span that scheduled them. AsyncLocalStorage still hands you the *context*, so `getActiveSpan()` returns an **ended** span — `addEvent` throws there rather than no-op'ing. Use a log; it still carries the trace id, so it lands on the trace anyway. (`rooms.ts` was the worked example; fixed in `6f319a2`, kept in README as the argument.)

- **Adding or editing a `traceparent`-in-body minting helper** (Tabletop `currentTraceparent`, Shuffler `traceparent.ts`, and eventually a new Roda-Spine equivalent to replace the deleted `current_traceparent` — see the "Depends on" note above): keep the `00-{traceId}-{spanId}-{flags}` format identical across all of them. If the field the caller writes into is required by a JSON Schema contract (like `contracts/envelope.v1.json`'s `traceparent`), the helper must never return `undefined`/`nil` — synthesize a well-formed random one, and flag the synthesis on the active span (`traceparent.synthesized: true`, the Shuffler's addition) so a real occurrence in production is visible rather than a silent trace-shaped string that links nowhere. If the field is optional and only used for point-to-point propagation (like the Tabletop's websocket URL), `undefined`-on-no-span is correct and no flag is needed. README → "Trace context embedded in event bodies".

## Not related to

- **The Honeycomb MCP server config** (`honeycomb-modernity`) — that's the query side; this owner guards the emit side.
- **The Shuffler's clipboard/tabletop send flow** — its failure handling is Table Mode's business; only its spans are mine.
- **The envelope schema's shape** (`contracts/envelope.v1.json`/`v2.json` — which fields exist, like `origin`/`significance`, and their types/enums) — that's contract-owned. This owner's stake starts only where an envelope field also becomes a span attribute; each such field gets a one-line row in the README wiring table (e.g. `Table#record_span_attributes`) so contract and telemetry don't drift apart silently.
