import { register } from "node:module";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { ParentBasedSampler } from "@opentelemetry/sdk-trace-node";
import { ExpressLayerType } from "@opentelemetry/instrumentation-express";
import { BackgroundChatterSampler } from "./telemetry-sampler.js";

// This app is ESM ("type": "module"). OTel's instrumentations patch modules via
// require-in-the-middle, which only sees CommonJS require() calls — so without
// this hook, anything loaded by `import` (express, pg, etc.) is never patched.
// import-in-the-middle (re-exported here by @opentelemetry/instrumentation)
// installs an ESM loader hook so imported modules get instrumented too. This is
// why the launch command uses `node --import ./dist/tracing.js` rather than the
// old `-r` (CommonJS) preload: register() must run before the app's imports.
register("@opentelemetry/instrumentation/hook.mjs", import.meta.url);

const sdk: NodeSDK = new NodeSDK({
  traceExporter: new OTLPTraceExporter(),
  // Logs go through the NodeSDK rather than a LoggerProvider of their own, so
  // they share the resource (service.name and friends) and the shutdown path
  // with traces. The destination comes from the same generic
  // OTEL_EXPORTER_OTLP_ENDPOINT the traces use; the exporter appends /v1/logs.
  //
  // Deliberately unfiltered by the sampler below. A LogRecord does not inherit
  // its span's sampling decision, and we don't want it to: the sampler keeps 1%
  // of health-check traces so we can see the probe passing, but if the probe
  // starts FAILING we want every log that explains why. The thing that keeps
  // log volume affordable is not logging on the hot path — see log.ts.
  //
  // Passing logRecordProcessors makes the SDK skip its OTEL_LOGS_EXPORTER
  // branch entirely, so don't add that env var here expecting it to do
  // something — it would be dead config. (The Spine sets it to "none"; that one
  // is real, because the Spine has no logs pipeline yet.)
  logRecordProcessors: [new BatchLogRecordProcessor(new OTLPLogExporter())],
  // Health checks and static assets are sampled down hard; everything else is
  // traced in full. See telemetry-sampler.ts for what counts and why.
  sampler: new ParentBasedSampler({
    root: new BackgroundChatterSampler(),
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // We recommend disabling fs automatic instrumentation because it is noisy during startup
      "@opentelemetry/instrumentation-fs": {
        enabled: false,
      },
      // No spans for middleware layers. Every request was carrying six of them
      // (`middleware - query`, `expressInit`, `jsonParser`, `urlencodedParser`,
      // and two anonymous), which is 6 of the 8 spans in a typical trace and
      // told us nothing: the route span and the request-handler span are where
      // the information is.
      //
      // This also gives us, for free, the thing `ignoreLayers:
      // ["middleware - stampRouteParams"]` used to buy: our `stampRouteParams`
      // middleware (in app.ts) captures the active span and writes to it at
      // res.end. With no middleware span wrapping it, the active span there is
      // the root server span — the one carrying http.route, and still open at
      // res.end — rather than a middleware span that ended at next().
      "@opentelemetry/instrumentation-express": {
        ignoreLayersType: [ExpressLayerType.MIDDLEWARE],
      },
    }),
  ],
});

sdk.start();
