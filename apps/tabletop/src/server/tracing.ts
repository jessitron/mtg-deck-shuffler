import { register } from "node:module";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { TraceIdRatioBasedSampler, ParentBasedSampler } from "@opentelemetry/sdk-trace-node";
import { Sampler, SamplingResult } from "@opentelemetry/sdk-trace-base";
import { SpanKind, Attributes, Context, Link } from "@opentelemetry/api";
import { installShutdownHandlers } from "./shutdownHooks.js";
import { log } from "./log.js";

register("@opentelemetry/instrumentation/hook.mjs", import.meta.url);

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

installShutdownHandlers(() => sdk.shutdown(), {
  onTimeout: () => log.warn("OTel shutdown timed out on the way out; some telemetry may have been dropped"),
  onDrainError: (error) => log.warn("OTel shutdown failed on the way out; some telemetry may have been dropped", {}, error),
});
