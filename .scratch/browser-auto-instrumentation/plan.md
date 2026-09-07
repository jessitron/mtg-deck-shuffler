# Plan: browser fetch/XHR auto-instrumentation for the Tabletop

## Problem
`apps/tabletop/src/client/observability/index.ts` builds a `WebTracerProvider` but never
calls `registerInstrumentations()`. No fetch/XHR auto-instrumentation exists, so nothing
injects `traceparent` into browser-initiated HTTP calls automatically.
`DiagnosticButton.tsx` works around this by calling `currentTraceparent()` synchronously
and attaching the header by hand.

Owner (`fleet-is-observable-context`) confirmed: fetch/XHR only, not document-load or
user-interaction — those solve a different problem, and the browser tracer has no
static-asset downsampling equivalent to `BackgroundChatterSampler`. This KB entry already
anticipated this change (interactions.md) and named `DiagnosticButton.tsx` and
`TablePage.tsx` as the two workaround call sites.

**Important finding**: `TablePage.tsx`'s `currentTraceparent()` use (line ~197) attaches
`traceparent` as a query param to a **WebSocket** connection URI (`useSync({ uri, ... })`),
not an HTTP fetch/XHR call. Fetch/XHR instrumentation cannot cover this — it must stay as
a manual workaround. Only `DiagnosticButton.tsx`'s `fetch()` call is in scope to retire.

## Changes

1. **Install** (from repo root, matching this ship's existing 0.221 OTel line):
   - `@opentelemetry/instrumentation@^0.221.0`
   - `@opentelemetry/instrumentation-fetch@^0.221.0`
   - `@opentelemetry/instrumentation-xml-http-request@^0.221.0`
   All three peer-depend only on `@opentelemetry/api ^1.3.0`, already satisfied
   (`^1.9.0`). Confirmed via `npm view` these versions exist and match the line used by
   `api-logs`/`exporter-trace-otlp-http`/`sdk-logs` in `apps/tabletop/package.json`
   (not the 2.x line `sdk-trace-web`/`resources`/`core` are on).

2. **In `apps/tabletop/src/client/observability/index.ts`** (`initTracing`, after
   `provider.register()`):
   - Import `registerInstrumentations` from `@opentelemetry/instrumentation`,
     `FetchInstrumentation` from `@opentelemetry/instrumentation-fetch`,
     `XMLHttpRequestInstrumentation` from `@opentelemetry/instrumentation-xml-http-request`.
   - Build an `ignoreUrls` list containing `config.tracesUrl` and `config.logsUrl` (both
     collector-or-direct-Honeycomb destinations from `/otel-config.json`) so the exporter's
     own outbound requests are never traced — this is the export-feedback-loop trap.
   - Call `registerInstrumentations({ instrumentations: [new FetchInstrumentation({ ignoreUrls }), new XMLHttpRequestInstrumentation({ ignoreUrls }) ] })`.
   - Do NOT set `propagateTraceHeaderCorsUrls` — all real client API calls are
     same-origin (confirmed: `/api/tables/...`, `/otel-config.json`), so the default
     same-origin propagation is correct and we don't want to leak `traceparent` to any
     third-party origin.
   - Only register instrumentations when tracing is actually configured (inside the
     existing `if (!config.tracesUrl) return;` guard), matching the "quietly off" pattern
     already used for logging.

3. **`DiagnosticButton.tsx`**: remove the manual `currentTraceparent()` call and the
   `headers: traceparent ? {...} : {}` — auto-instrumentation now injects `traceparent`
   into the `fetch()` call. Update the docstring paragraph that explains the workaround.
   Only remove `currentTraceparent` import here if `TablePage.tsx` still needs it — it does
   (WebSocket URI), so `currentTraceparent()` itself is NOT dead code and stays exported.

4. **Verification**: extend/add a test proving the fetch call now carries a real
   `traceparent` without manual attachment (unit-level: spy/check request headers via a
   fake fetch, or trust the browser E2E check). Then real end-to-end verification via
   `./run` + Chrome extension + Honeycomb query (per task instructions) — confirm one
   trace, no export-feedback-loop spans for the collector/ingest endpoint.

## Risk / things reviewed
- Sampler interaction: browser-sampled fetch calls to the Tabletop server will now carry
  a sampled remote parent, which `ParentBasedSampler` on the server honors regardless of
  `BackgroundChatterSampler` — intentional (end-to-end correlation), just noting the
  behavior change is real, not a regression.
- No document-load/user-interaction instrumentation added (out of scope per owner).
