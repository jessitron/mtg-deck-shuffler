import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';

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

console.log("Initializing OpenTelemetry SDK...");
console.log("OTEL_EXPORTER_OTLP_HEADERS:", process.env.OTEL_EXPORTER_OTLP_HEADERS);
sdk.start();
console.log("OpenTelemetry SDK started successfully");