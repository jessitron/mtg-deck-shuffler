import { register } from "node:module";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { ParentBasedSampler } from "@opentelemetry/sdk-trace-node";
import { ExpressLayerType } from "@opentelemetry/instrumentation-express";
import { BackgroundChatterSampler } from "./telemetry-sampler.js";
import { installShutdownHandlers } from "./shutdownHooks.js";
import { isGameEventsStreamPath } from "./game-events-route-filter.js";
import { log } from "./log.js";

register("@opentelemetry/instrumentation/hook.mjs", import.meta.url);

const sdk: NodeSDK = new NodeSDK({
  traceExporter: new OTLPTraceExporter(),
  logRecordProcessors: [new BatchLogRecordProcessor({ exporter: new OTLPLogExporter() })],
  sampler: new ParentBasedSampler({
    root: new BackgroundChatterSampler(),
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // We recommend disabling fs automatic instrumentation because it is noisy during startup
      "@opentelemetry/instrumentation-fs": {
        enabled: false,
      },
      "@opentelemetry/instrumentation-express": {
        ignoreLayersType: [ExpressLayerType.MIDDLEWARE],
      },
      // /game-events/:gameId holds its connection open for a browser tab's whole
      // lifetime — the incoming-request span would otherwise span that too. Open/close
      // are logged instead (app.ts).
      "@opentelemetry/instrumentation-http": {
        ignoreIncomingRequestHook: (req) => isGameEventsStreamPath(req.url),
      },
    }),
  ],
});

sdk.start();

installShutdownHandlers(() => sdk.shutdown(), {
  onTimeout: () => log.warn("OTel shutdown timed out on the way out; some telemetry may have been dropped"),
  onDrainError: (error) => log.warn("OTel shutdown failed on the way out; some telemetry may have been dropped", {}, error),
});
