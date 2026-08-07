# Plan — ticket 01, instrument the verify harness

Ticket: `.scratch/verify-suite-speed/issues/01-instrument-the-harness.md`
Mountain: overhead

## Shape

A **custom Playwright reporter is the only emitter**, as the owner recommended. Nothing in
any spec changes. Three new files under `apps/shuffler/test/harness-telemetry/`:

- `harnessTracing.ts` — the dedicated tracer provider.
- `spanPlan.ts` — a **pure** function from Playwright's result objects to a description of the
  spans to emit. This is where the logic lives, so it can be unit-tested without a browser.
- `otelReporter.ts` — the Playwright `Reporter`. Thin: owns lifecycle and flush, delegates all
  shape decisions to `spanPlan.ts`.

`tsconfig.json` has `include: ["src/**/*.ts"]` and `rootDir: "./src"`, so nothing under
`test/` compiles into `dist/`. Playwright transpiles the reporter itself. Jest's `testMatch`
is `**/*.test.ts` with `test/verification` ignored, so a `spanPlan.test.ts` in this new
directory runs under `npm test` with no config change. All three of those are existing
behavior I'm relying on, not changes.

## The provider (`harnessTracing.ts`)

`BasicTracerProvider` from `@opentelemetry/sdk-trace-base`, with:

- `resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: "mtg-fleet-verify", ... })` —
  **service name written in code.**
- `spanProcessors: [new RunAttributesSpanProcessor(runAttrs), new BatchSpanProcessor(new OTLPTraceExporter())]`
  — the first stamps the run id (and ship, and git sha) onto every span at `onStart`, copying
  the Tabletop browser wrapper's `GlobalAttributesSpanProcessor`. The exporter takes endpoint
  and headers from the inherited env, which `verify.sh` has already sourced correctly.
- **No auto-instrumentation. No ESM hook. No sampler** (default `AlwaysOn`).
- Not `NodeTracerProvider` — we want no context manager and no propagators, since nothing
  here propagates.

**Silent-off when unconfigured.** If `OTEL_EXPORTER_OTLP_HEADERS` and
`OTEL_EXPORTER_OTLP_ENDPOINT` are both absent, the reporter installs nothing and returns. This
is what makes it safe to put the reporter in `playwright.config.ts` rather than only in
`verify.sh`: a bare `npx playwright test` (no `.be`, no `.env`) stays silent instead of
retrying an unauthenticated exporter for the length of the run. Same posture as the Tabletop's
`initTracing()`, which quietly does nothing when the server offers no destination.

**Resource-vs-env check to run before writing this.** `.env` exports
`OTEL_SERVICE_NAME=mtg-deck-shuffler`, and the Playwright process inherits it. I do not want to
assume how OTel JS 2.8 merges an explicitly-passed `resource` with env-detected attributes — if
`defaultResource()` gets merged in on top, the app's service name could win and harness spans
would land in the app's dataset, which is failure mode #1 arriving by the back door. So the
first thing I'll do is a throwaway script that builds the provider with
`OTEL_SERVICE_NAME=mtg-deck-shuffler` set, exports one span to an in-memory exporter, and
prints the resolved `service.name`. Measure, don't reason.

## What gets a span

One trace per run.

| Span | Source | Notes |
| --- | --- | --- |
| `verify run` (root) | synthesized | starts at script start, ends at `onEnd` |
| `verify build` | synthesized from `verify.sh` timestamps | `npm run build` is a full `tsc` on **every** run and is currently invisible |
| `verify server boot` | synthesized | server spawn → first successful `curl` |
| `spec: <file>` | grouped from test results | |
| `test: <title>` | `onTestBegin` / `onTestEnd` | `result.startTime`, `result.duration`, status, retry |
| `step: <title>` | the `result.steps` tree | nested as Playwright nests them |

Steps carry a `category` (`pw:api`, `expect`, `hook`, `test.step`). **I'm including `expect`
steps**, not filtering them: an `expect(...).toBeVisible()` waits up to 5s for a locator, so
auto-retrying assertions are exactly where invisible time hides. Each `waitForTimeout` and
`page.goto` arrives as a `pw:api` step for free, which is the ticket's per-wait requirement met
without touching a spec.

The three phases before Playwright starts can't be seen from inside it, so `verify.sh` records
epoch-millis boundaries and passes them on the `npx playwright test` invocation; the reporter
synthesizes those spans with explicit start/end times. **Note on cost:** macOS ships bash 3.2
and BSD `date` has no `%N`, so there is no cheap epoch-millis in this script. I'll use
`node -e 'console.log(Date.now())'` — about 40ms per call, five calls, on a run of 3.6–9.5
minutes. Cheap, but it is real added time and I'd rather name it than hide it.

## Root-span attributes

- `verify.run.id` — a uuid minted in `verify.sh` so the script can **echo it to the terminal**
  along with the dataset name. Falls back to one minted in the reporter for a bare
  `npx playwright test`. On *every* span via the processor, so the run survives a fragmented
  trace.
- `verify.ship` = `shuffler`. The service name is deliberately fleet-wide, so the ship belongs
  on an attribute — this is what lets the Tabletop's suite join the same dataset later.
- `verify.git.sha` — `git rev-parse --short HEAD`. Also `service.version` on the resource, so
  Invariant 5 (`build-sha-on-every-span`) is satisfied on day one for this new init path.
- `verify.data_db.existed` (bool) and `verify.data_db.bytes` — **captured in `verify.sh` before
  the server starts**, because the server creates `data.db` at boot and after that the question
  is unanswerable. This is the cold-vs-warm condition; without it the 9.5 → 3.6 minute warming
  is unqueryable and every optimization number after this ticket lies.
- Totals: test count, pass/fail counts, and the number of spans emitted (so I can see whether
  the per-run span volume is sane rather than guessing at it).

## `verify.sh` changes

1. `now_ms()` helper, and timestamp captures at script start, around `npm run build`, and
   around the server-boot poll.
2. `stat` on `data.db` **before** the server starts.
3. Mint `VERIFY_RUN_ID`, read the git sha, and echo both.
4. Pass all of it **on the `npx playwright test` line only**, alongside the existing
   `BASE_URL=`:

   ```
   VERIFY_RUN_ID="$VERIFY_RUN_ID" ... BASE_URL="$BASE_URL" npx playwright test "$@"
   ```

**Nothing is `export`ed after `.env` is sourced.** The `.be`-then-`.env` block is not touched
at all. And note this plan sets **no** `OTEL_SERVICE_NAME` anywhere: because the service name
is written into the resource in code, the env var is redundant, and not setting it is strictly
safer than setting it per-command. That closes failure mode #1 by construction rather than by
discipline — the app server's env is byte-identical to what it inherits today, and so is the
env of the second server that `verify-tabletop-integration.spec.ts` spawns from inside a spec.

`playwright.config.ts` gets `reporter: [['list'], ['./test/harness-telemetry/otelReporter.ts']]`.

## Flush

`onEnd` awaits `provider.shutdown()` (which flushes) inside a `Promise.race` against a bounded
timeout. Every path is wrapped so that **no telemetry failure can change the suite's exit
code** — a bad key or an unreachable collector prints one line and the suite result stands.
Same posture as `deploy-marker.sh`'s `|| true`.

## Explicitly not doing

- **No `traceparent` into the browser.** No `page.setExtraHTTPHeaders`, no `context.route`, no
  header the app reads. The app's `ParentBasedSampler` would honor a sampled remote parent and
  never consult `BackgroundChatterSampler`, tracing every static asset at 100% across 51 tests
  — the volume regression `0f42c95` fixed, wearing the costume of success. Harness and app
  spans will be correlated by run id and time, in separate datasets, which is enough to answer
  every question this ticket asks.
- No in-test spans; no changes to any spec file.
- No optimization: not one `waitForTimeout` deleted, `workers: 1` and `fullyParallel: false`
  untouched, `data.db` not reset. That's ticket 02, and it needs this ticket's data first.
- Not reusing `src/tracing.ts`, and not touching it — including its missing SIGTERM flush,
  which is buoyed separately as `no-ship-flushes-on-sigterm`.

## How I'll verify

1. **Unit, first and failing:** `spanPlan.test.ts` feeds hand-built Playwright result objects
   (fakes — real object shapes, no mocking library) through `spanPlan.ts` and asserts the span
   tree: names, parent-child structure, timings, attributes. Plus a test that drives the whole
   provider with `InMemorySpanExporter` and asserts every span carries `verify.run.id` and that
   `service.name` is `mtg-fleet-verify` **even with `OTEL_SERVICE_NAME` set to the app's name in
   the environment** — the regression test for failure mode #1.
2. **Real run:** `./verify.sh verify-game-menu` (4 tests, fast) then a full `./verify.sh`.
3. **Honeycomb, via MCP:** confirm `mtg-fleet-verify` receives the trace; confirm the app's
   spans are still arriving in `mtg-deck-shuffler` with `service.name` unchanged; compare the
   app-dataset span count for a run before and after this change to prove no propagation leak.
4. **Failure injection:** run with a deliberately bad `OTEL_EXPORTER_OTLP_HEADERS` and confirm
   the suite's exit code is unaffected.

## Review outcome (`fleet-is-observable`, 2026-08-07)

Approved, with five required changes and a **reversal of the owner's own non-negotiable #1**.

**The deviation was right, and for a second reason I didn't have.** The owner checked
`node_modules` instead of reasoning: `BasicTracerProvider` does
`this._resource = mergedConfig.resource ?? defaultResource()` — `??`, not `.merge()`, so an
explicit resource *replaces* the default. And `defaultResource()` never runs `envDetector` at
all; `OTEL_SERVICE_NAME` is read only by `EnvDetector`, which only `NodeSDK` wires up. A
`BasicTracerProvider` is **structurally incapable** of seeing `OTEL_SERVICE_NAME`. So setting
nothing is safer, and the env var is inert against this provider anyway.

**But the trap is real one layer over**: `NodeSDK` does
`this._resource = this._resource.merge(detectResources(...))` — **detected wins**, so under
`NodeSDK` an ambient `OTEL_SERVICE_NAME` overrides an explicitly configured `service.name`.
That gets a comment in `harnessTracing.ts` warning against swapping the provider for `NodeSDK`,
and the regression test stays — it now guards against exactly that swap.

**Required changes, all taken:**

1. **Threshold the `expect` steps** at 100ms (parameterized). Below the floor, no span — roll
   into `test.expect.count` / `test.expect.total_ms` attributes on the test span. An assertion
   that resolved in 3ms hid no time by definition, and this is Invariant 1 applied literally:
   attributes on a span that already exists, over a new span. Then **measure** the span count
   before deciding on trace-per-spec. The owner's volume point is the real argument: at 3,000
   spans/run this dev tool would become the largest single source of spans in env `local` by an
   order of magnitude, from a thing nobody queries most days.
2. **`set -e` + `stat` on a missing `data.db` would kill the run** — a telemetry-only addition
   turning into a hard verify failure on a fresh clone or in CI, and it would never reproduce
   locally because `data.db` exists here. Guarded with `[ -f ]`, and `wc -c <` instead of `stat`.
3. **The silent-off guard didn't fire in the case it exists for.** With `.be` missing, `.env`
   still sets `OTEL_EXPORTER_OTLP_HEADERS="x-honeycomb-team="` — present and non-empty, so a
   presence check passes and the reporter 401s once per batch for the whole run. An empty team
   key now counts as unconfigured. Plus a warning when neither `.be` candidate is found (the
   loop currently falls through silently; the repo-root `run` warns and this should too).
4. **`BatchSpanProcessor` defaults would drop spans silently** at this volume (`maxQueueSize`
   2048, `scheduledDelayMillis` 5000) — and the root-span count attribute counts spans
   *emitted*, not *exported*, so it would report a number that never arrived. `maxQueueSize`
   8192, `scheduledDelayMillis` 1000.
5. **Timestamp guards.** OTel takes a bare number as epoch **millis**; seconds gives a span in
   1970 and nanos one in the year 55000, neither of which errors. And `Number(undefined)` is
   `NaN`, which silently produces nonsense timestamps on a bare `npx playwright test`. Parse
   with a plausibility window and **skip the synthetic span** rather than emit garbage.

**Also named, and load-bearing:** with no context manager, `context.active()` is always
`ROOT_CONTEXT`, so parenting must be passed by hand
(`trace.setSpan(ROOT_CONTEXT, parentSpan)`). Miss it and you get 3,000 sibling roots that still
carry the right run id and still answer most queries — which is how it would land unnoticed.
The parent-child assertions in `spanPlan.test.ts` are the guard, not thoroughness.

Synthesizing spans from shell timestamps: **wanted in the fleet.** Same machine, same second,
no skew — and `verify build` being an invisible full `tsc` on every run is, in the owner's
words, the single most valuable span in this plan.
