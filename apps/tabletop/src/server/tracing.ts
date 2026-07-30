import { register } from "node:module";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { TraceIdRatioBasedSampler, ParentBasedSampler } from "@opentelemetry/sdk-trace-node";
import { Sampler, SamplingResult } from "@opentelemetry/sdk-trace-base";
import { SpanKind, Attributes, Context, Link } from "@opentelemetry/api";

// Modeled on the Shuffler's tracing.ts. This app is ESM ("type": "module");
// OTel's instrumentations patch modules via require-in-the-middle, which only
// sees CommonJS require() calls — the ESM loader hook below makes `import`ed
// modules (express, ws, ...) get instrumented too. That's why the launch
// command is `node --import ./dist/server/tracing.js`: register() must run
// before the app's imports.
register("@opentelemetry/instrumentation/hook.mjs", import.meta.url);

// Heavily sample down health-check probes (kube-probe, ELB) so the interesting
// traffic isn't drowned.
class KubeProbeAwareSampler implements Sampler {
  private defaultSampler = new TraceIdRatioBasedSampler(1.0);
  private kubeProbeRootSampler = new TraceIdRatioBasedSampler(0.001);
  private elbHealthcheckerRootSampler = new TraceIdRatioBasedSampler(0.01);

  shouldSample(context: Context, traceId: string, spanName: string, spanKind: SpanKind, attributes: Attributes, links: Link[]): SamplingResult {
    const userAgent = String(attributes["http.user_agent"] || "");

    if (userAgent.toLowerCase().includes("kube-probe")) {
      return this.kubeProbeRootSampler.shouldSample(context, traceId);
    }
    if (userAgent.toLowerCase().includes("elb-healthchecker")) {
      return this.elbHealthcheckerRootSampler.shouldSample(context, traceId);
    }
    return this.defaultSampler.shouldSample(context, traceId);
  }

  toString(): string {
    return "KubeProbeAwareSampler";
  }
}

const sdk: NodeSDK = new NodeSDK({
  traceExporter: new OTLPTraceExporter(),
  // Logs go through the NodeSDK rather than a LoggerProvider of their own, so
  // they share the resource (service.name and friends) and the shutdown path
  // with traces. The destination comes from the same generic
  // OTEL_EXPORTER_OTLP_ENDPOINT the traces use; the exporter appends /v1/logs.
  //
  // Deliberately unfiltered by the sampler below: a LogRecord does not inherit
  // its span's sampling decision, and we don't want it to. If the health check
  // starts failing we want every log explaining why. What keeps log volume
  // affordable is not logging on the hot path — see log.ts.
  //
  // Passing logRecordProcessors makes the SDK skip its OTEL_LOGS_EXPORTER
  // branch entirely, so don't add that env var here expecting it to do
  // something — it would be dead config.
  //
  // NOTE the options-object argument. This ship is on the 0.221 OTel line and
  // the Shuffler is on 0.219, where the same constructor takes the exporter
  // positionally: `new BatchLogRecordProcessor(exporter)`. Passing 0.219's
  // shape here leaves options.exporter undefined and the pipeline silently
  // exports nothing. Don't copy this line between ships without looking.
  logRecordProcessors: [new BatchLogRecordProcessor({ exporter: new OTLPLogExporter() })],
  sampler: new ParentBasedSampler({
    root: new KubeProbeAwareSampler(),
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-fs": {
        enabled: false,
      },
    }),
  ],
});

sdk.start();
