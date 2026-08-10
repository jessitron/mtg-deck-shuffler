# Add OpenTelemetry Instrumentation to a TypeScript Service v1

Please help me add OpenTelemetry instrumentation to a TypeScript Node.js service to send telemetry data to Honeycomb.

This instruction is applicable only to a Node.js project written in TypeScript. It is based on documentation at https://docs.honeycomb.io/send-data/javascript-nodejs/opentelemetry-sdk/

**Instrumenting a dev tool rather than a service? This runbook is the wrong shape.** A test
harness, build script or CLI wants a `BasicTracerProvider` it owns and flushes, no
auto-instrumentation, no NodeSDK, and manual parenting. The fleet's worked example is
`apps/shuffler/test/harness-telemetry/` (the Playwright verify reporter → service
`mtg-fleet-verify`); the pattern, the traps, and the recipe for synthesizing spans from shell
timestamps are written up in `owners/fleet-is-observable/README.md` → "Dev-tooling telemetry".
Read that first, then come back here only for the Honeycomb/env bits.

## Prerequisites

[] Do you have tools to access Honeycomb data? If not, ask the user to set this up. Give them this link: https://docs.honeycomb.io/integrations/mcp/configuration-guide/

[] Which region of Honeycomb are you using? Ask the user. The Honeycomb endpoint for US region is https://api.honeycomb.io/ . For the EU region, it is https://api.eu1.honeycomb.io/. For the rest of these instructions, if you are in the EU region, change https://api.honeycomb.io to https://api.eu1.honeycomb.io, and for links, change https://ui.honeycomb.io to https://ui.eu1.honeycomb.io.

[] As a task, find out how environment variables are set in this project. See whether HONEYCOMB_API_KEY is currently set.

[] If HONEYCOMB_API_KEY is not set, ask the user to create one. Link them to these instructions: https://docs.honeycomb.io/configure/environments/manage-api-keys/#create-api-key . It is also OK if the user promises that $HONEYCOMB_API_KEY will be available at runtime.

[] What is the name of this service? Ask the user if you can't figure it out. If the name has spaces or punctuation in it, replace them with hyphens. This will also be the name of the dataset.

[] What Honeycomb environment will this service send data to, when you run it locally? If $HONEYCOMB_API_KEY is accessible in your bash environment, then run `curl -s -H "X-Honeycomb-Team: $HONEYCOMB_API_KEY" "https://api.honeycomb.io/1/auth"` to find out. If not, ask the user for the name of the Honeycomb environment. Remember this Honeycomb environment name.

## Dependencies

Use whatever tool this project uses for dependency management, such as yarn or npm.

Install the latest version of the required OpenTelemetry packages:

- `@opentelemetry/auto-instrumentations-node` - for automatic instrumentation
- `@opentelemetry/sdk-node` - core SDK
- `@opentelemetry/exporter-trace-otlp-http` - HTTP trace exporter
- `@opentelemetry/api` - for custom instrumentation
- `@opentelemetry/exporter-logs-otlp-http` - HTTP log exporter (needed for the Logs section below)
- `@opentelemetry/sdk-logs` - for `BatchLogRecordProcessor`
- `@opentelemetry/api-logs` - for `logs.getLogger(...).emit(...)`

**Pin exact versions, and pin them together.** This fleet has two Node ships on different
OTel version lines (0.219 and 0.221), and the same class — `BatchLogRecordProcessor` — takes
its exporter **positionally** on 0.219 and as an **options object** on 0.221. Passing the
wrong shape leaves the exporter `undefined` and the pipeline silently exports nothing, with
no error anywhere. Check `node_modules/@opentelemetry/sdk-logs/package.json` for the
installed version before writing the constructor call, don't copy the line from another
ship's `tracing.ts` without checking it still matches.

## Environment Variables

Define these variables:

```
OTEL_SERVICE_NAME="your-service-name"
OTEL_EXPORTER_OTLP_PROTOCOL="http/protobuf"
OTEL_EXPORTER_OTLP_ENDPOINT="https://api.honeycomb.io:443"
OTEL_EXPORTER_OTLP_HEADERS="x-honeycomb-team=$HONEYCOMB_API_KEY"
OTEL_LOG_LEVEL="info"
```

Change your-service-name to the name of this service.

The x-honeycomb-team header tells Honeycomb who is sending this data. Encoded in that API key is both the team and the environment. That's why we never have to specify environment.
The OTEL_SERVICE_NAME will be sent in the service.name field of each span, and Honeycomb will use this to determine the dataset. That's why we do not specify dataset.

## Initialize tracing in code

[] Where is the main entry point for the service?

[] In the same directory as that main entry point, create `tracing.ts` with the following content:

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

```
const sdk: NodeSDK = new NodeSDK({
  traceExporter: new OTLPTraceExporter(),
  instrumentations: [
    getNodeAutoInstrumentations({
      // We recommend disabling fs automatic instrumentation because it is noisy during startup
      '@opentelemetry/instrumentation-fs': {
        enabled: false,
      },
    }),
  ],
});

sdk.start();
```

[] Make sure this tracing.ts will be compiled whenever the main entry point is compiled.

## Load the initialization before startup

There are two options for this. Which can you make work?

### Option 1: Ideally, load tracing.ts before startup:

[] Here is a task: locate all places that this service is started up. For instance: README instructions, package.json, scripts, Dockerfiles, makefiles.

[] In each of those places, make sure that tracing.ts is loaded before the main entry point.

For example, if the service is started with `node dist/server.js`, change it to `node -r dist/tracing.js dist/server.js`.

For example, if the service is started with `ts-node src/index.ts`, change it to `ts-node -r src/tracing.ts src/index.ts`.

#### ESM gotcha: `-r` does NOT instrument `import`ed modules

`-r` / `--require` is the **CommonJS** preload. OTel's instrumentations patch modules
via `require-in-the-middle`, which only intercepts `require()` calls. If this project is
ESM (`"type": "module"` in package.json, or `module: ESNext`/`NodeNext` in tsconfig),
then framework modules are loaded with `import` and **never get patched**. The classic
symptom: `instrumentation-http` still works (it patches Node's built-in `http`, reachable
through the CJS preload), so you see bare `GET`/`POST` server spans — but there are **no
framework spans** (no `middleware - …`, no `request handler - …`) and **no `http.route`**,
and the root span name never upgrades from `GET` to `GET /your/:route`.

Fix: register the `import-in-the-middle` ESM loader hook and launch with `--import`
instead of `-r`. In `tracing.ts`, before `sdk.start()`:

```
import { register } from "node:module";
register("@opentelemetry/instrumentation/hook.mjs", import.meta.url);
```

Then launch with `node --import ./dist/tracing.js dist/server.js`. (`@opentelemetry/instrumentation`
re-exports the `import-in-the-middle` hook; it's already a transitive dependency.)
Verify by confirming `middleware - …` / `request handler - …` spans and `http.route` appear.

> **If the ESM hook crashes at startup, make sure you're on the latest OTel packages.**
> An old `import-in-the-middle` (pulled transitively by `@opentelemetry/instrumentation`)
> can crash the boot with `ERR_INVALID_RETURN_PROPERTY_VALUE` (undefined `source` from the
> `load` hook). It can be platform-specific — passing on macOS but crashing in a Linux
> container. Upgrading the OTel packages (which pull a matching, fixed IITM) resolves it.

### Option 2: load tracing in the main entry point

[] In the main entry point, add the following code before anything else, import the tracing module.

## Logs

Tracing alone leaves two gaps: things that happen with no active span (startup, shutdown,
callbacks and timers that outlive the request that scheduled them), and anything a server
process wants to say to Honeycomb that isn't shaped as a span attribute. Set logs up in the
same pass as tracing rather than leaving them for later — a service that ships with traces
only is exactly the gap this fleet is trying not to repeat (the Spine, at time of writing,
has no logs pipeline: `spine-logs-in-traces` in this repo's `TODO.md`).

**Never use `span.addEvent` for this.** A callback can outlive the span that scheduled it —
AsyncLocalStorage still hands the callback a *context*, so `trace.getActiveSpan()` returns
the span, but it's the one that already **ended**, and `addEvent` throws on it rather than
quietly doing nothing. A log written the same moment still carries that context's trace/span
id, so it lands on the trace looking exactly like a span event would
(`meta.annotation_type = span_event` in Honeycomb) — strictly better, and it also works when
there's no span at all. Full incident write-up: `owners/fleet-is-observable/README.md`,
Invariant 2.

### Server-side: wire logs through the same `NodeSDK`

[] Add a `logRecordProcessors` entry to the `NodeSDK` config already built for tracing —
don't stand up a separate `LoggerProvider` on the server. Sharing the SDK means the log
records get the same `service.name` resource attribute (so they land in the same dataset)
and the same shutdown path as the trace exporter:

```
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';

const sdk: NodeSDK = new NodeSDK({
  traceExporter: new OTLPTraceExporter(),
  logRecordProcessors: [new BatchLogRecordProcessor({ exporter: new OTLPLogExporter() })],
  // ...instrumentations, sampler, etc.
});
```

Check the installed `@opentelemetry/sdk-logs` version before writing this constructor call —
see the version-pinning note under Dependencies above. The exporter reads the same
`OTEL_EXPORTER_OTLP_ENDPOINT`/`OTEL_EXPORTER_OTLP_HEADERS` env vars the trace exporter does
and appends `/v1/logs` itself; no separate log-specific env var is needed. **Passing
`logRecordProcessors` makes `NodeSDK` skip its `OTEL_LOGS_EXPORTER` env-var branch
entirely** — don't set that variable expecting it to do anything once this is wired.

[] Write a small logging module the rest of the service calls instead of `console.log`
directly — `apps/shuffler/src/log.ts` and `apps/tabletop/src/server/log.ts` are the fleet's
two (deliberately duplicated, not shared — see `owners/fleet-is-observable/README.md` → "How
it works now" for why there's no shared telemetry package). Shape to copy:

- `log.info/warn/error(message, attributes = {}, error?)`.
- Every call does two things: `logs.getLogger(name).emit({ severityNumber, severityText,
  body: message, attributes })` (from `@opentelemetry/api-logs`) **and** a stdout `console.*`
  line, so local dev logs stay readable without a Honeycomb round trip.
- An `Error` passed as the third argument becomes `exception.type` / `exception.message` /
  `exception.stacktrace` attributes (mirrors `span.recordException`'s shape).
- When nothing registered a global logger provider (unit tests, one-off scripts run without
  `tracing.ts` loaded), `logs.getLogger(...)` no-ops cleanly — the stdout half still happens.

[] **Don't sample logs.** A `LogRecord` doesn't inherit its span's sampling decision, and
this fleet deliberately leaves that alone: if a health check starts failing, every log
explaining why should arrive, not the 1% the trace sampler kept. What keeps log volume
sane is not logging on the hot path — reach for a span attribute first, and treat a log as
the exception, not the default.

[] Give logs the same shutdown handling as traces. If this service installs a
SIGTERM/SIGINT flush hook for `sdk.shutdown()` (see the fleet's
`apps/*/src*/shutdownHooks.ts` for the pattern — bounded drain, exactly-once exit), one
`sdk.shutdown()` call flushes both the trace and log processors, since they share the SDK.

### Browser-side (only if this service serves pages to a browser)

A server-only service can stop above. If it renders pages a user's browser executes code in,
add a browser-side logger too — this is the gap the fleet's Tabletop closed and the Shuffler
had not yet (as of this writing the Shuffler has no browser logs pipeline; only its tracing
bootstrap is shipped).

[] Add a small browser module, modeled on `apps/tabletop/src/client/observability/index.ts`:
a `logError(message, attributes = {}, error?)` function that emits through the same
`@opentelemetry/sdk-logs` `LoggerProvider` the browser's tracing wrapper already owns (its own
provider, not the server's — the browser can't share a Node process's SDK), pointed at a
`/v1/logs` destination.

[] **Register `window.addEventListener("error", ...)` and `("unhandledrejection", ...)`
handlers that call `logError`.** Before this exists, an uncaught browser exception is
invisible: the page breaks for a real user and Honeycomb shows a clean session with no
error anywhere. This is the single highest-value thing the browser logger buys.

[] The browser exporter needs a destination. Reuse whatever mechanism the tracing wrapper
already uses to learn its collector URL (e.g. a same-origin `/otel-config.json` the server
serves, carrying both a traces URL and a logs URL) — don't hardcode a second, divergent
config path. If there's a collector in front of Honeycomb for traces (recommended over
shipping an ingest key to the browser — see Invariant 3 in
`owners/fleet-is-observable/README.md`), give it a `logs:` pipeline alongside its
`traces:` pipeline and route `/v1/logs` to it the same way `/v1/traces` is routed.

[] No destination configured (local dev with no collector, or tracing disabled) should mean
browser logging quietly turns itself off — same posture as the tracing wrapper — not an error
in the console.

## Verify

Here is a task, with this todo list as an input and either a trace link or a failure description as the output.
Do the following things:

- [] Run the application. 
- [] Make a request to the service.
- [] Wait a few seconds.
- [] Read the service's logs. Are there any warnings or errors from OpenTelemetry? If so, proceed to 'Troubleshooting' below.
- [] Recall the Honeycomb environment you found earlier in these instructions. Using the Honeycomb MCP, Check whether this service's dataset exists in that environment. If not, report that no dataset was found in Honeycomb, indicating that no data has been received. Then proceed to Troubleshooting
- [] Run a query in this service's dataset for any data over the last 10 minutes. If there is nothing, report that no data was found in Honeycomb. Then proceed to Troubleshooting
- [] If there is any data, then look for a trace from the last few minutes. If you don't find one, report that data was found but no trace, and provide a link to the query for all data in the dataset.
- [] If a trace was found, report success. Provide the user with a link to the recent trace. The link format is `https://ui.honeycomb.io/<team slug>/environments/<environment slug>/trace?trace_id=39ae994d9ea02cda9a4dfe279bfae59b`

If you set up logs in the section above, verify that separately — a trace can arrive fine
while the log pipeline is silently misconfigured (wrong `BatchLogRecordProcessor` constructor
shape is the classic way, per the version-pinning note under Dependencies):

- [] Trigger a code path that calls `log.error`/`log.warn`/`logError` (a real error path, or a
  temporary call you remove afterward).
- [] Query the same dataset for `severity_text` (or `name = "log"` depending on how Honeycomb
  renders it) over the last 10 minutes. If nothing shows up, the log processor isn't wired —
  re-check the `logRecordProcessors` constructor shape against the installed package version.
- [] If a log record is found and it fired from inside an active span, confirm it carries
  `trace.trace_id`/`trace.parent_id` and renders in Honeycomb as `meta.annotation_type =
  span_event` on that trace — that's the proof it's trace-correlated, not a bare log line.
- [] If you added the browser logger, throw an uncaught error on the page (e.g. a temporary
  `throw new Error("telemetry test")` in a click handler) and confirm it shows up in the
  browser's dataset via `logError`'s automatic `window.onerror` handler, without any
  application code calling `logError` directly.

After the task is complete, if there was an error, proceed to Troubleshooting.

## Report your experience

Send feedback to Honeycomb using the tool. Do not include any code or sensitive information. Say "I used [title of this document]". Then say either "I got it working" or "I couldn't get it working." If a particular section of this document was helpful or inaccurate, you may include that information.

## Document the change

[] Wherever this project keeps its documentation, update it to reflect the changes you made.

Include how OpenTelemetry is initialized, where the environment variables are set, and where to find the data in Honeycomb. If you added logs, say so explicitly and separately from tracing — "OTel is set up" reads as ambiguous once a service can have tracing without logs (the Spine, at time of writing) or logs riding on the same SDK as tracing (both Node ships). Note whether the browser side got a logger too, or only the server did.

Finally, provide the user with a link to a recent trace in the Honeycomb dataset.

## Troubleshooting

### If OpenTelemetry prints errors about sending data

If OpenTelemetry prints errors, then read the error.

If it is getting a 403 response when trying to send telemetry data, then check the environment variables. Add a console.log to print OTEL_EXPORTER_OTLP_HEADERS before starting the SDK.
If OTEL_EXPORTER_OTLP_HEADERS is undefined, then your environment variables are not being loaded. Stop everything else until that is fixed!!

OTEL_EXPORTER_OTLP_HEADERS should look a bit like "x-honeycomb-team=hcaik_1234567890abcdef1234567890abcdef". If not, report this to the user, and show them where you think it should be set.

If it is getting a 400, then the endpoint might be wrong. Print that environment variable and check its value. Report to the user.

### If HTTP spans appear but framework spans and `http.route` are missing

You see bare `GET`/`POST` server spans, but no `middleware - …`/`request handler - …`
spans and no `http.route`. This is almost always the ESM `-r` gotcha — see
"ESM gotcha" under "Load the initialization before startup" above. Switch to the
`import-in-the-middle` hook + `--import`.

### If no data is found in Honeycomb

This one is harder.

Do we have the right environment? Run `curl -s -H "X-Honeycomb-Team: $HONEYCOMB_API_KEY" "https://api.honeycomb.io/1/auth"` and verify the team name and environment slug.

Is OpenTelemetry printing anything at all? Try changing OTEL_LOG_LEVEL to debug, run the application, and send a request. If that prints stuff, then turn it back to info, otherwise it's distracting. If it prints nothing, check whether tracing.ts is being loaded before startup.

Is tracing.ts being loaded before startup? Add a console.log to the bottom of tracing.ts and see if it prints before the server starts.

Is the automatic instrumentation triggering? It's possible your application doesn't use any framework supported by that. Try creating a brand new trace on startup. After the app is fully initialized, add this code:

```
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('test-span');
const span = tracer.startSpan('test span');
console.log("Creating a test span. The trace ID is: " + span.spanContext().traceId);
span.end();
```

Run the app and look at the output of that. If the trace ID is a bunch of 0s, then the SDK is not properly initialized. If it has a real value, then look for it in Honeycomb. Query all datasets for trace.trace_id = [the trace ID from the log].

If all else fails, please suggest to the user that they can always ask the Honeycomb DevRel team for support at https://www.honeycomb.io/office-hours
