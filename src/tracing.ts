import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";

console.log("Initializing OpenTelemetry SDK...");
console.log("OTEL_EXPORTER_OTLP_HEADERS:", process.env.OTEL_EXPORTER_OTLP_HEADERS);
console.log("OTEL_EXPORTER_OTLP_ENDPOINT:", process.env.OTEL_EXPORTER_OTLP_ENDPOINT);

const sdk: NodeSDK = new NodeSDK({
  traceExporter: new OTLPTraceExporter(),
  instrumentations: [
    getNodeAutoInstrumentations({
      // We recommend disabling fs automatic instrumentation because it is noisy during startup
      "@opentelemetry/instrumentation-fs": {
        enabled: false,
      },
    }),
  ],
});

sdk.start();
console.log("OpenTelemetry SDK started successfully");
