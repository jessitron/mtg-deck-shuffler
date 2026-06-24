import { register } from "node:module";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { TraceIdRatioBasedSampler, ParentBasedSampler } from "@opentelemetry/sdk-trace-node";
import { Sampler, SamplingResult } from "@opentelemetry/sdk-trace-base";
import { SpanKind, Attributes, Context, Link } from "@opentelemetry/api";

// This app is ESM ("type": "module"). OTel's instrumentations patch modules via
// require-in-the-middle, which only sees CommonJS require() calls — so without
// this hook, anything loaded by `import` (express, pg, etc.) is never patched.
// import-in-the-middle (re-exported here by @opentelemetry/instrumentation)
// installs an ESM loader hook so imported modules get instrumented too. This is
// why the launch command uses `node --import ./dist/tracing.js` rather than the
// old `-r` (CommonJS) preload: register() must run before the app's imports.
register("@opentelemetry/instrumentation/hook.mjs", import.meta.url);

// Custom sampler that heavily samples down kube-probe requests to /
class KubeProbeAwareSampler implements Sampler {
  private defaultSampler = new TraceIdRatioBasedSampler(1.0); // 100% sampling by default
  private kubeProbeRootSampler = new TraceIdRatioBasedSampler(0.001); // 0.1% sampling for kube-probe
  private elbHealthcheckerRootSampler = new TraceIdRatioBasedSampler(0.01); // 1% sampling for ELB healthchecker

  shouldSample(context: Context, traceId: string, spanName: string, spanKind: SpanKind, attributes: Attributes, links: Link[]): SamplingResult {
    // Check if this is an HTTP span for the root path with kube-probe user agent
    const userAgent = String(attributes["http.user_agent"] || "");

    if (userAgent.toLowerCase().includes("kube-probe")) {
      return this.kubeProbeRootSampler.shouldSample(context, traceId);
    }

    if (userAgent.toLowerCase().includes("ELB-HealthChecker")) {
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
      // We recommend disabling fs automatic instrumentation because it is noisy during startup
      "@opentelemetry/instrumentation-fs": {
        enabled: false,
      },
      // Our `stampRouteParams` middleware (in app.ts) reads the active span to
      // attach http.route.param.* to the root server span. If Express
      // instrumentation wraps it in its own middleware span, that span ends
      // when the middleware calls next(), and our deferred res.end writes would
      // hit an ended span. Ignoring this one layer means the middleware runs in
      // the parent (root server span) context, so the active span is the same
      // span that carries http.route. Matched by layer name: "middleware - <fn name>".
      "@opentelemetry/instrumentation-express": {
        ignoreLayers: ["middleware - stampRouteParams"],
      },
    }),
  ],
});

sdk.start();
