import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";

const traceExporter = new OTLPTraceExporter();

const sdk = new NodeSDK({
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      // Disable fs instrumentation as it's noisy during startup
      "@opentelemetry/instrumentation-fs": {
        enabled: false,
      },
    }),
  ],
});

sdk.start();

console.log("OpenTelemetry tracing initialized");
