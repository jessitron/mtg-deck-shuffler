import { TraceIdRatioBasedSampler } from "@opentelemetry/sdk-trace-node";
import { Sampler, SamplingResult } from "@opentelemetry/sdk-trace-base";
import { SpanKind, Attributes, Context, Link } from "@opentelemetry/api";

export const KUBE_PROBE_SAMPLE_RATIO = 0.001;
export const ELB_HEALTHCHECKER_SAMPLE_RATIO = 0.01;
export const HEALTH_SAMPLE_RATIO = 0.01;
export const DEFAULT_SAMPLE_RATIO = 1.0;

function attributeText(attributes: Attributes, ...keys: string[]): string {
  for (const key of keys) {
    const value = attributes[key];
    if (value !== undefined && value !== null) return String(value);
  }
  return "";
}

/**
 * Which fraction of traces to keep for this root span. Probe user agents win over the
 * route: a real kube-probe on /health stays at its own (lowest) rate, while /health
 * reached by anything else drops to the health rate. Reads both semconv spellings so an
 * OTel migration can't silently disable the match and start tracing every probe at 100%.
 */
export function sampleRatioFor(attributes: Attributes): number {
  const userAgent = attributeText(attributes, "http.user_agent", "user_agent.original").toLowerCase();
  if (userAgent.includes("kube-probe")) return KUBE_PROBE_SAMPLE_RATIO;
  if (userAgent.includes("elb-healthchecker")) return ELB_HEALTHCHECKER_SAMPLE_RATIO;

  // http.target carries the query string; the path alone decides.
  const path = attributeText(attributes, "http.target", "url.path").split("?")[0].toLowerCase();
  if (path === "/health") return HEALTH_SAMPLE_RATIO;

  return DEFAULT_SAMPLE_RATIO;
}

/** Head-samples probe and /health chatter down; keeps everything else at 100%. */
export class BackgroundChatterSampler implements Sampler {
  private samplers = new Map<number, TraceIdRatioBasedSampler>();

  private samplerFor(ratio: number): TraceIdRatioBasedSampler {
    let sampler = this.samplers.get(ratio);
    if (!sampler) {
      sampler = new TraceIdRatioBasedSampler(ratio);
      this.samplers.set(ratio, sampler);
    }
    return sampler;
  }

  shouldSample(context: Context, traceId: string, spanName: string, spanKind: SpanKind, attributes: Attributes, links: Link[]): SamplingResult {
    return this.samplerFor(sampleRatioFor(attributes)).shouldSample(context, traceId);
  }

  toString(): string {
    return "BackgroundChatterSampler";
  }
}
