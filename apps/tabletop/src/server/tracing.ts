import { register } from "node:module";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
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
