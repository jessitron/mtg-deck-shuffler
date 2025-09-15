import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { TraceIdRatioBasedSampler, ParentBasedSampler } from '@opentelemetry/sdk-trace-node';
import { Sampler, SamplingResult } from '@opentelemetry/sdk-trace-base';
import { SpanKind, Attributes, Context, Link } from '@opentelemetry/api';

// Custom sampler that heavily samples down kube-probe requests to /
class KubeProbeAwareSampler implements Sampler {
  private defaultSampler = new TraceIdRatioBasedSampler(1.0); // 100% sampling by default
  private kubeProbeRootSampler = new TraceIdRatioBasedSampler(0.01); // 1% sampling for kube-probe to /

  shouldSample(context: Context, traceId: string, spanName: string, spanKind: SpanKind, attributes: Attributes, links: Link[]): SamplingResult {
    // Check if this is an HTTP span for the root path with kube-probe user agent
    const httpRoute = String(attributes['http.route'] || attributes['http.target'] || '');
    const userAgent = String(attributes['http.user_agent'] || '');

    if (httpRoute === '/' && userAgent.toLowerCase().includes('kube-probe')) {
      return this.kubeProbeRootSampler.shouldSample(context, traceId);
    }

    return this.defaultSampler.shouldSample(context, traceId);
  }

  toString(): string {
    return 'KubeProbeAwareSampler';
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
      '@opentelemetry/instrumentation-fs': {
        enabled: false,
      },
    }),
  ],
});

sdk.start();