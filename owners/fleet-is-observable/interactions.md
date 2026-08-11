# Interactions — the fleet is observable

_Distilled edges; the full story (invariants, per-ship wiring table) is in `README.md`._

## Depends on

- **`.be`-before-`.env` source order** — `HONEYCOMB_API_KEY` lives in repo-root `.be`; each ship's
  `.env` interpolates it at source time. Wrong order → silent 401 export.
- **OTel dependency versions and the ESM `--import` loader** (Shuffler, Tabletop) — the `-r`
  require hook silently fails to patch `import`ed modules.
- **Express instrumentation config** — `ignoreLayersType: [MIDDLEWARE]` keeps traces at 2 spans,
  not 8.
- **Samplers reading both semconv spellings** (`http.user_agent`/`user_agent.original`,
  `http.target`/`url.path`) — a sampler that stops matching fails open, silently.
- **The Tabletop's browser collector** (`apps/tabletop/k8s/collector.yaml`, same-origin
  `/v1/traces` + `/v1/logs`) — keyless browser export, on a dedicated ALB serving plain `http://`
  (tldraw license gate, no 443 listener). An `https://` browser OTLP URL against it is
  connection-refused and silently kills browser telemetry.
- **The Shuffler's one page shell** (`formatHtmlHead` in
  `apps/shuffler/src/view/common/html-layout.ts`) — every page's browser telemetry bootstrap
  (tab-id script → `hny.js` → guarded `Hny.initializeTracing`, in that order) comes from this one
  function; EJS pages reach it through `views/partials/head.ejs`. The `X-Browser-Tab-Id`/
  `game.browser_tab_id` browser↔server correlation depends on it.
- **Auto-instrumentation carrying the trace** — the Shuffler creates zero manual spans; everything
  hangs off the ambient request span.
- **The NodeSDK owning logs as well as traces** (`logRecordProcessors`) — that shared wiring is
  what gives log records the same resource (`service.name`, so the same dataset) and shutdown path
  as spans. It also means `OTEL_LOGS_EXPORTER` is inert on those ships.
- **`shutdownHooks.ts`'s `installShutdownHandlers`** — the SIGTERM/SIGINT flush-and-exit hook both
  Node ships' `tracing.ts` call right after `sdk.start()`. Without it, SIGTERM (from `verify.sh`'s
  `cleanup()`, and from k8s on every pod termination) kills the process before the last OTel batch
  flushes.
- **Which provider class reads `OTEL_SERVICE_NAME`** — `BasicTracerProvider` can't see it
  (`resource ?? defaultResource()`, no `envDetector`); `NodeSDK` merges detected attrs on **top**
  of explicit ones, so it wins. Per-provider, opposite directions. README → How it works now.
- **`.env` producing a keyless `x-honeycomb-team=`** — "header present" is not "telemetry
  configured"; a silent-off guard must check the key is non-empty.
- **The `traceparent`-in-body minting sites** — `apps/tabletop/src/client/observability/index.ts`
  (Tabletop, optional/websocket) and `apps/shuffler/src/port-tabletop/traceparent.ts` (Shuffler,
  required for the Tabletop-facing envelope). The Spine's inbound event contract
  (`contracts/envelope.v3.json`) has no `traceparent` field at all — trace context there travels
  only via the HTTP header. `HttpSpineGateway.sendEvent` still reuses the Shuffler's
  Tabletop-facing helper for the Spine leg, which is wrong now that the contract rejects that
  field — tracked as `shuffler-spine-gateway-stale` in `TODO.md`.

## Depended on by

- **Every production diagnosis** — the North Star includes "when something breaks, Honeycomb
  shows you why."
- **`verify.sh` telemetry checks** and the "app is up" confirmation from 1%-sampled probe traces.
- **Knowing why the verify suite is slow** — the suite traces itself to `mtg-fleet-verify` (one
  trace per run, `verify.run.id` on every span). Suite-speed work optimizes against those numbers,
  so the harness spans are load-bearing evidence, not decoration.
- **Correlating behaviour with releases** — `scripts/deploy-marker.sh` puts a `deploy` marker on
  every graph in env `mtg-deck-shuffler`. Local `deploy-*` git tags are never pushed, so the marker
  is the durable record of what shipped when.
- **Safe Harbor's "deployed and observable in Honeycomb"** — that claim should ship with a link.
  Honeycomb query runs and viewed traces never expire, so the URL is a permanent citation (README
  → Evidence).

## Watch points

- **Editing any `run`/`verify.sh`/`deploy.sh`**: preserve `.be`-then-`.env` sourcing. Exception:
  `apps/shuffler/run` deliberately skips `.be` (documented in `notes/AGENT-NOTES.md`) — don't "fix"
  it. All three `deploy.sh` source `.be` because the deploy marker's key lives there; that's not
  the `run` exception and shouldn't be "made consistent" with it.
- **Reaching for `HONEYCOMB_API_KEY`**: it is the **`local`** environment's ingest key,
  `createDatasets` access only. It cannot write markers and it targets the wrong environment.
  Markers use `HONEYCOMB_MARKER_KEY` (env `mtg-deck-shuffler`). Check any key with `GET
  https://api.honeycomb.io/1/auth`; **writing to the wrong environment succeeds silently.**
- **Touching `scripts/deploy-marker.sh` or its callers**: keep it *after* `kubectl rollout status`
  and keep it non-fatal (`|| true`). Keep the `/1/auth` environment guard.
- **Adding a new telemetry init path, or a fourth ship**: it must carry the build sha as a
  resource attribute (README → Invariant 5, still not implemented anywhere; `build-sha-on-every-span`
  in `TODO.md`). The verify harness already does this — copy its shape.
- **Touching `apps/shuffler/test/harness-telemetry/`**: never swap `BasicTracerProvider` for
  `NodeSDK` — `.env`'s `OTEL_SERVICE_NAME` would silently reclaim these spans into the app's
  dataset. Keep the non-default `BatchSpanProcessor` sizing (8192 / 1000ms; defaults drop silently
  around 1,090 spans/run). Keep manual parenting and the parent-child assertions. Keep every path
  non-fatal.
- **Anything that would `export` telemetry env in a script after `.env` is sourced**: pass
  per-command vars on the command line (`VERIFY_* … npx playwright test`), never `export`.
- **Propagating trace context into the browser from a test, or from anything that hits static
  assets**: don't. The app's `ParentBasedSampler` honors a sampled remote parent and bypasses
  `BackgroundChatterSampler` — every static asset at 100%. Correlate by a run/session id attribute
  instead.
- **Wrapping or decorating an OTel exporter**: a *synchronous* throw from `export()` means the
  result callback never fires and `BatchSpanProcessor` leaves its flush timer armed forever.
  Report failures through the callback (`NeverThrowingExporter` in `harnessTracing.ts` is the
  pattern). The ships hand bare OTLP exporters to `NodeSDK` and have the same latent gap.
- **Reaching for a cost or budget argument about telemetry volume**: there isn't one. Ingestion is
  free. Don't reintroduce it, and don't let its absence read as license to be cautious.
- **Adding a span type to a high-volume emitter**: ask "what would I learn from this span?", never
  "what does it cost?". If nothing, by construction, roll it into a count attribute on the span
  that already exists.
- **Deciding whether a trace is "too big"**: ~10,000 spans is where a waterfall gets hard to read;
  ~1,000 is comfortable. That's a usability ceiling, unaffected by ingestion cost.
- **Lowering `EXPECT_THRESHOLD_MS` in `otelReporter.ts`**: owner's call is keep it at 100ms. Lower
  it for one investigative run if a specific question needs it; don't change the default.
- **Synthesizing spans from timestamps captured outside the process**: OTel reads a bare number as
  **millis** and errors on none of the ways you can get it wrong. Validate against a plausibility
  window and skip the span rather than emit garbage.
- **Touching the Tabletop's ingress, its URL scheme, or "just adding TLS back"**: prod
  `table.jessitron.honeydemo.io` is plain http on purpose (tldraw license gate), on its own ALB,
  IngressGroup `tabletop-http`. Four config spots are scheme-coupled and must agree:
  `BROWSER_OTLP_TRACES_URL` + `BROWSER_OTLP_LOGS_URL` (`apps/tabletop/k8s/configmap.yaml`), CORS
  `allowed_origins` (`apps/tabletop/k8s/collector.yaml`), plus the Shuffler's
  `TABLETOP_PUBLIC_URL`. An `https://` OTLP URL against this ALB is connection-refused — all
  browser spans and the uncaught-error log pipeline vanish while the page works fine.
- **Adding, editing, or re-deploying any ingress in the `tabletop-http` (or any) IngressGroup**:
  ingresses sharing `alb.ingress.kubernetes.io/group.name` reconcile as **one ALB** — a single
  malformed ingress can produce `FailedDeployModel` on every ingress in the group, not just the
  broken one, blocking routing changes fleet-wide for as long as it stays applied.
- **Upgrading `@opentelemetry/*`**: bare `GET` spans with no `http.route` afterward = ESM patching
  broke. Check the loader wiring (`node --import`, `register(...)`).
- **Touching `apps/shuffler/src/telemetry-sampler.ts`**: keep `test/telemetry-sampler.test.ts`
  passing and meaningful — a prior inline sampler was silently broken for months (a case-mismatch
  in a string match), and every ALB probe was traced at 100% as a result.
- **`services/spine/app.rb`'s `current_span`/`mark_span_failed` helpers**: the Spine's hand-rolled
  span-attribute code — `current_span.add_attributes(...)` for inputs/outcome on both `POST /join`
  and `POST /tables/:table_id/events`, and one shared `mark_span_failed(attribute, result, error)`.
  Both still live directly in `app.rb`; extract to a shared file if a third route needs them.
  `join.result` does not currently distinguish `created` from `joined` — both set `"joined"`.
  `event.result`'s dedup path does get its own value (`"duplicate"`, distinct from `"accepted"`) —
  don't collapse it back if this code is touched again.
- **Mounting a Rack-based OTel instrumentation gem** (any Ruby service, not just the Spine): Rack
  has no railtie-style auto-injection, so the app must explicitly mount the middleware via
  `middleware_args` — already done in `services/spine/app.rb`. A new Rack-based service needs the
  same explicit mount or it boots clean with nothing reaching Honeycomb.
- **Recording that something happened**: never `span.addEvent`. Attributes on the span you're in
  — always the first choice — or, when there's no span to hang it on, `log.info/warn/error` from
  that ship's `log.ts` (the two Node ships) or `logError()` in the Tabletop's browser. The Spine
  doesn't have one yet (`spine-logs-in-traces` in `TODO.md`).
- **Touching either Node ship's `log.ts` or its `logRecordProcessors`**: nothing pins the two
  ships' OTel dependency versions to match, and OTel JS classes have changed constructor shape
  across versions before. Don't paste between ships without checking both `package.json`s still
  match; run both ships' tests. **If the correct shape suddenly fails to typecheck, suspect the
  resolver, not the code** — a fresh worktree with no `node_modules` resolves the main checkout's
  hoisted types from whatever version the main checkout is on; the fix is `npm install` in the
  worktree, never a constructor-shape change (`notes/AGENT-NOTES.md` → worktree node_modules leak).
- **Adding logging to a hot path**: logs are not sampled, on purpose. That's readable only because
  nothing logs per-request. If you're about to, put it on the span instead, or reopen the sampling
  question deliberately (README → Invariant 2).
- **Adding HTTP middleware or changing routes**: confirm spans still get `http.route` and the
  route-param stamping (`stampRouteParamsOnSpan`) still fires.
- **Editing `apps/shuffler/src/view/common/html-layout.ts` or `views/partials/head.ejs`**: the
  browser bootstrap's script order is load-bearing — `browser-tab-id.js` must run before the
  inline `initHoneycombTracing(apiKey)` call, because the tab id goes into the OTel **resource**,
  immutable after init. The guard checks both `window.Hny && window.browserTabId` **and** the
  apiKey — it skips init with a `console.warn` when the key is empty or the literal string
  `"undefined"`. That string constant is exported and is exactly what
  `apps/shuffler/test/html-layout-tracing-guard.test.ts` evals — if you touch the guard, keep the
  source-of-truth exported and run that test. Keep the two-var apiKey fallback
  (`HONEYCOMB_INGEST_API_KEY || HONEYCOMB_API_KEY`) — check prod before "simplifying" it. Never add
  a **second** bootstrap anywhere — one shell is the whole point.
- **Adding a game-mutation route in `apps/shuffler/src/app.ts`**: all 13 game-mutation routes go
  through `apply-game-command.ts`'s `applyGameCommand()`, which owns the
  "not-found"/"incompatible-version" `markCurrentSpanAsError` calls for all of them — don't re-add
  per-route copies of those two. A route whose response can't be expressed as a returned string
  can still use `applyGameCommand`/`renderCommandOutcome` — `renderApplied` may return `string |
  void`. A route that needs a required side effect before mutating (not just permission-checking)
  can use `beforeMutate` and throw `TableSendFailedError` — don't hand-roll a second
  send-then-commit protocol.
- **Adding another best-effort outbound send from the Shuffler** (a third destination, or a new
  event kind to an existing one): copy the existing shape — span attribute (`<name>.send_failed:
  true`) + `log.warn`, never throw, ride ambient auto-instrumentation (no manual span). If the
  payload needs a durable `traceparent` field, reuse the existing minting call for that event kind
  rather than adding a new site — and remember each call site mints its own event `id`, so sending
  the "same" logical event to two destinations produces two different `id`s sharing one
  `traceparent`.
- **A new service/ship**: OTel from its first commit (`notes/add-opentelemetry.md` is the
  runbook). Rack-based Ruby services need the explicit `middleware_args` mount (see above); there's
  no traceparent-minting site to add for Spine-style inbound events, since the contract carries no
  such field.
- **Installing or editing a process signal handler for shutdown**: installing a SIGTERM/SIGINT
  handler changes Node's *default* behavior — with no handler, Node exits immediately on the
  signal; once a handler exists, Node no longer exits on its own, so the handler must call `exit()`
  itself once the drain settles or the process hangs forever on every signal.
  `apps/shuffler/src/shutdownHooks.ts` is the reference shape: bound the drain with a
  `Promise.race` against an `unref()`'d timer, and guard idempotency so a second signal doesn't
  fire twice. Both ships have their own copy — a verbatim port, not a shared module.
- **Adding a new named event to `usePhysicsAnnouncements.ts`** (or a third `store.listen()` →
  `inSpan()` hook alongside it and `useCardArrivalSpans.ts`): keep detection where the gesture's
  own hook already computes it — this listener only translates the resulting store diff into a
  span name. Filter by tldraw's `source` option, not by re-deriving "was this me." If the new event
  can fire from a diff tldraw writes repeatedly during a drag, it needs the same debounce the
  generic fallback uses (`GENERIC_SETTLE_MS` = 300ms per shape id).
- **Callbacks and timers**: they outlive the span that scheduled them. AsyncLocalStorage still
  hands you the *context*, so `getActiveSpan()` returns an **ended** span — `addEvent` throws there
  rather than no-op'ing. Use a log; it still carries the trace id, so it lands on the trace anyway.
- **Adding or editing a `traceparent`-in-body minting helper** (Tabletop `currentTraceparent`,
  Shuffler `traceparent.ts`): keep the `00-{traceId}-{spanId}-{flags}` format identical across
  both. If the field the caller writes into is required by a JSON Schema contract, the helper must
  never return `undefined`/`nil` — synthesize a well-formed random one, and flag the synthesis on
  the active span (`traceparent.synthesized: true`) so a real occurrence in production is visible.
  If the field is optional and only used for point-to-point propagation, `undefined`-on-no-span is
  correct and no flag is needed. **Do not add a Roda-Spine equivalent for inbound events** —
  `envelope.v3.json` deliberately has no `traceparent` property to receive. Check
  `apps/shuffler/src/port-tabletop/traceparent.ts`'s existing call sites before assuming they're
  all still valid — `HttpSpineGateway.sendEvent` calls it to build an envelope the Spine's contract
  now rejects.

## Not related to

- **The Honeycomb MCP server config** (`honeycomb-modernity`) — that's the query side; this owner
  guards the emit side.
- **The Shuffler's clipboard/tabletop send flow** — its failure handling is Table Mode's business;
  only its spans are mine.
- **The envelope schema's shape** (`contracts/envelope.v3.json` — which fields exist and their
  types/enums) — that's contract-owned. This owner's stake starts only where an envelope field also
  becomes a span attribute; each such field gets a one-line row in the README wiring table so
  contract and telemetry don't drift apart silently.
