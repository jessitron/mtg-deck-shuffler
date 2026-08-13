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
  only via the HTTP header. `HttpSpineGateway.sendEvent` reuses the Shuffler's Tabletop-facing
  helper to build the envelope (shared `buildCardPlayedEvent`), then **strips `traceparent` back
  out of the body before serializing** — the mint-then-strip is correct, not a leftover, because
  undici's OTel auto-instrumentation already puts a live `traceparent` header on the outbound
  `fetch()` regardless (`shuffler-spine-gateway-stale` closed).

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
  the `run` exception and shouldn't be "made consistent" with it. **`services/spine/deploy.sh` is
  also an exception on the `.env` side**: it never sources a `.env` at all — `ECR_REPO` lives in
  `.be` and the Spine's prod OTEL config is baked into `k8s/configmap.yaml` instead of read from a
  deploy-time env file. Don't add a Spine `.env` sourcing line to "match" the other two ships;
  that's a real difference in wiring, not a gap.
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
- **Touching either ship's `telemetry-sampler.ts`** (`apps/shuffler/src/telemetry-sampler.ts` or
  `apps/tabletop/src/server/telemetry-sampler.ts` — both Node ships now have an extracted, tested
  sampler module as of 2026-08-12): keep the paired `test/telemetry-sampler.test.ts` passing and
  meaningful — a prior inline sampler was silently broken for months (a case-mismatch in a string
  match), and every ALB probe was traced at 100% as a result. Both read **both** semconv spellings
  and check the probe UA before the path. They are **not** identical: the Shuffler also
  head-samples static assets by extension; the Tabletop deliberately does not (probes + `/health`
  only). Don't "unify" them into one behavior without asking — the difference is intentional.
- **`services/spine/app.rb`'s `current_span`/`mark_span_failed` helpers**: the Spine's hand-rolled
  span-attribute code — `current_span.add_attributes(...)` for inputs/outcome on `POST /join`,
  `POST /tables/:table_id/events`, and now `GET /admin/tables`/`GET /admin/tables/:id`
  (`admin.table_count`, `table.id`, `admin.result`) — and one shared
  `mark_span_failed(attribute, result, error)` used by all of them. Still lives directly in
  `app.rb`; extract to a shared file if it keeps growing. `join.result` does not currently
  distinguish `created` from `joined` — both set `"joined"`. `event.result`'s dedup path does get
  its own value (`"duplicate"`, distinct from `"accepted"`) — don't collapse it back if this code
  is touched again.
- **The Spine's `GET /admin/tables/:id` show page and its `HONEYCOMB_ENV_SLUG` default**: the
  page's inline `<script>` builds Honeycomb trace links client-side from live SSE messages'
  `meta.traceparent`, using `ENV.fetch("HONEYCOMB_ENV_SLUG", "local")`. **Resolved**: the Spine's
  first prod deploy (`services/spine/k8s/configmap.yaml`) now sets `HONEYCOMB_ENV_SLUG:
  "mtg-deck-shuffler"` (and `HONEYCOMB_TEAM_SLUG: "modernity"`), so the `"local"` fallback fires
  only in dev — the `app.rb` comment at the `ENV.fetch` call site was updated to say so. If a
  future admin-page trace link points at `local` in prod, check this configmap key first.
- **The Spine's `SPINE_BASE_PATH` route wrapping** (`app.rb`'s `route do |r| ... end` wraps the
  whole table in `r.on(prefix) { dispatch(r) }` when `SPINE_BASE_PATH` is set — prod value
  `"/spine"`, `services/spine/k8s/configmap.yaml`, needed because the Spine now shares the
  Shuffler's ALB/host at `mtg.jessitron.honeydemo.io/spine` and AWS ALB ingress can't strip a path
  prefix): this is the first place in the fleet a route table sits behind an extra routing layer
  the Rack instrumentation didn't ask for. Only smoke-tested locally in Docker so far (spans still
  emit, `/spine/up` and `/spine/admin/tables` both respond) — `http.route`/span-naming shape under
  the wrapped prefix has **not** been confirmed against a real deployed ALB. If a route's
  `http.route` attribute looks wrong (missing, doubled `/spine`, or the prefix swallowed) once this
  is live, this wrapper is the first suspect.
- **The `only-one-alb-please` IngressGroup** (`services/spine/k8s/ingress.yaml` +
  `apps/shuffler/k8s/ingress.yaml`, both on host `mtg.jessitron.honeydemo.io`) is a **second,
  separate** IngressGroup from `tabletop-http` — don't conflate the two watch points. Rules in one
  group aren't auto-sorted by path specificity, so `/spine` (Spine's ingress,
  `alb.ingress.kubernetes.io/group.order: "1"`) must be evaluated before the Shuffler's catch-all
  `/` (`group.order: "1000"`) or the catch-all would swallow `/spine` first. The same
  "malformed-ingress-in-a-group blocks the whole group's routing changes" hazard documented for
  `tabletop-http` applies here too — a bad edit to either of these two ingresses can block routing
  changes to both, not just the one that's broken.
- **The Spine's admin show page now mints a real child span from `meta.traceparent`, not just a
  link** (`views/admin/tables/show.html.erb`, `Hny.inChildSpan("spine-admin",
  "table.event.displayed", spanContext, fn)`): keep it a **child of the same `trace_id`**, never a
  link to a new trace — the point is one trace covering "player joined" through "operator saw it on
  screen." This deliberately stretches that trace's reported duration (child starts after the
  parent server span has already ended) — don't read that as a performance regression, and don't
  "fix" it by reverting to a link. `honeycomb_api_key: ENV["HONEYCOMB_API_KEY"]` now also flows into
  the show-page locals (same direct-key-in-page shape as the Shuffler, Invariant 3) alongside
  `team_slug`/`env_slug`. Browser-side service name is `"mtg-spine-admin"`, separate from the
  server-side `"mtg-spine"` — don't collapse them.
- **The Spine's first browser JS/telemetry, and its no-bundler shape**: `services/spine/public/hny.js`
  is the Shuffler's `hny.js` vendored byte-for-byte, served via Roda's `plugin :public` + `r.public`
  (`app.rb`) — the Spine had zero static-asset serving before this. The next Spine page that needs
  browser telemetry should mirror this shape (vendor `hny.js`, serve via `plugin :public`, guard init
  like the Shuffler's `initHoneycombTracing`) rather than inventing a new one.
- **Mounting a Rack-based OTel instrumentation gem** (any Ruby service, not just the Spine): Rack
  has no railtie-style auto-injection, so the app must explicitly mount the middleware via
  `middleware_args` — already done in `services/spine/app.rb`. A new Rack-based service needs the
  same explicit mount or it boots clean with nothing reaching Honeycomb.
- **Adding, removing, or restyling a Shuffler `<button>`** (or re-vendoring `apps/shuffler/public/hny.js`):
  every real button carries a semantic kebab-case `id` so `hny.js`'s click auto-instrumentation
  records a legible `target_xpath` (`//*[@id="..."]`) instead of a positional path on the
  `mtg-deck-shuffler-web` dataset. Give a new button an id; leave `views/design.ejs` (the gallery)
  idless to avoid duplicates. Two gotchas: `hny.js` vendors two `UserInteractionInstrumentation`
  classes and only the registered one (~line 14084, `getElementXPath(element, true)`) uses the
  optimise flag that yields the `@id` form — a re-vendor that changes which registers, or drops the
  flag, silently reverts every click to a positional xpath. And the span is minted on
  `event.target`, so a click on a button's child markup (icon/nested span) has no id and falls back
  positional; disabled buttons emit no click span at all. See README → "Button ids make click
  auto-instrumentation legible."
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
  a **second** bootstrap anywhere — one shell is the whole point. `initHoneycombTracing(apiKey,
  devMode, tableName, playerName, gameId)` now takes **five** args. `devMode` is interpolated as an
  **unquoted boolean** (`, ${devMode},`) and becomes the `app.dev_mode` browser **resource**
  attribute — keep it a real boolean, not a quoted string. `tableName`/`playerName`/`gameId` are
  strings interpolated via the `jsStringArg()` helper (`JSON.stringify` + `<`→`<`) — **never
  raw-interpolate them**, that helper is what neutralizes a `</script>` (break-out/XSS); they become
  the browser resource attributes `table.name`/`player.name`/`game.id`, each added **conditionally**
  (`if (tableName)` / `if (gameId)`). Solo games omit table/player, but **`game.id` is stamped on
  every `/game` page** (solo and table alike — every game has a `gameId`), so it's not a table-mode
  signal. **`game.id` is browser-only** — the server carries the id as `http.route.param.gameId`,
  not `game.id`, so the two datasets spell it differently (a fair follow-up, deliberately left
  out). The static `HONEYCOMB_TRACING_INIT_SCRIPT` constant must stay static (values pass as args,
  per the guard test) — don't fold a value into the string. `html-layout-fleet-tokens.test.ts`
  guards the unquoted-boolean interpolation, the arg order, the `undefined` case, and the
  `</script>` neutralization; keep
  `formatHtmlHead`/`formatPageWrapper`/`head.ejs`/`active-game-page.ts` threading `devMode`,
  `tableName`, `playerName`, and `gameId` through so the flags actually reach init. **The prep page
  (`views/prepare.ejs`) deliberately does not stamp `game.id`** — a prep has a `prepId`, not a
  `gameId`; don't overload `game.id` with it.
- **Adding a game-mutation route in `apps/shuffler/src/app.ts`**: all 13 game-mutation routes go
  through `apply-game-command.ts`'s `applyGameCommand()`, which owns the
  "not-found"/"incompatible-version" `markCurrentSpanAsError` calls for all of them — don't re-add
  per-route copies of those two. A route whose response can't be expressed as a returned string
  can still use `applyGameCommand`/`renderCommandOutcome` — `renderApplied` may return `string |
  void`. A route that needs a required side effect before mutating (not just permission-checking)
  can use `beforeMutate` and throw `TableSendFailedError` — don't hand-roll a second
  send-then-commit protocol. `applyGameCommand` also `setCommonSpanAttributes({ tableName,
  playerName })` right after the game loads, so every mutation route gets `table.name`/`player.name`
  for free — a new mutation route needs nothing extra. The **GET fragment routes** don't share that
  choke point, so each one that reconstructs a `GameState` (`/game`, `/library-modal`,
  `/table-modal`, `/card-modal`, `/history-modal`, `/game-section`; `/debug-state` from
  `persistedGame`) stamps it by hand — add the same call to a new such route.
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
  `envelope.v3.json` deliberately has no `traceparent` property to receive. `HttpSpineGateway.sendEvent`
  calls the Tabletop-facing helper to build the envelope, then strips `traceparent` from the body
  before POSTing — keep that split (mint the field because the helper is shared plumbing; strip it
  because the contract rejects it) rather than "fixing" it by skipping the mint or adding the field
  back. **Never hand-set a `traceparent` header on a Spine (or any) outbound `fetch()` to
  compensate for stripping it from the body** — undici's OTel auto-instrumentation already injects
  a live one on every outbound call, appending its own after any explicit headers unconditionally,
  so a hand-set value would only produce a duplicate or a stale header. If a future send path needs
  trace context on the wire to the Spine, the header is already there for free; don't add body
  plumbing for it.

## Not related to

- **The Honeycomb MCP server config** (`honeycomb-modernity`) — that's the query side; this owner
  guards the emit side.
- **The Shuffler's clipboard/tabletop send flow** — its failure handling is Table Mode's business;
  only its spans are mine.
- **The envelope schema's shape** (`contracts/envelope.v3.json` — which fields exist and their
  types/enums) — that's contract-owned. This owner's stake starts only where an envelope field also
  becomes a span attribute; each such field gets a one-line row in the README wiring table so
  contract and telemetry don't drift apart silently.
