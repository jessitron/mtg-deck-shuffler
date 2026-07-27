import { TraceIdRatioBasedSampler } from "@opentelemetry/sdk-trace-node";
import { Sampler, SamplingResult } from "@opentelemetry/sdk-trace-base";
import { SpanKind, Attributes, Context, Link } from "@opentelemetry/api";

// How much of the background chatter we keep. Not zero: we want to be able to
// look in Honeycomb and see that the health check is passing and the static
// page is being served. 1% of a probe every few seconds is still plenty of
// evidence, and it's ~100x less data than tracing all of it.
export const CHATTER_SAMPLE_RATIO = 0.01;

// Attributes read under both the old and the stable OTel HTTP conventions.
// The instrumentation emits the http.* names today; reading url.path and
// user_agent.original too means a dependency bump can't quietly stop the
// sampling from matching.
function attributeText(attributes: Attributes, ...keys: string[]): string {
  for (const key of keys) {
    const value = attributes[key];
    if (value !== undefined && value !== null) return String(value);
  }
  return "";
}

const PROBE_USER_AGENTS = ["kube-probe", "elb-healthchecker"];

const STATIC_ASSET_EXTENSIONS = [".css", ".js", ".mjs", ".map", ".svg", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".woff", ".woff2", ".ttf"];

/**
 * Background chatter: requests that happen constantly and tell us nothing new
 * when they succeed — health checks and static assets. These made up nearly all
 * of our trace volume (every one costing an 8-span Express trace), so we head
 * sample them hard rather than dropping them entirely.
 */
export function isBackgroundChatter(attributes: Attributes): boolean {
  const userAgent = attributeText(attributes, "http.user_agent", "user_agent.original").toLowerCase();
  if (PROBE_USER_AGENTS.some(probe => userAgent.includes(probe))) return true;

  // http.target carries the query string; the path alone decides.
  const path = attributeText(attributes, "http.target", "url.path").split("?")[0].toLowerCase();
  if (path === "") return false;
  if (path === "/health") return true;

  return STATIC_ASSET_EXTENSIONS.some(extension => path.endsWith(extension));
}

/** Samples background chatter down to CHATTER_SAMPLE_RATIO; keeps everything else. */
export class BackgroundChatterSampler implements Sampler {
  private everything = new TraceIdRatioBasedSampler(1.0);
  private chatter = new TraceIdRatioBasedSampler(CHATTER_SAMPLE_RATIO);

  shouldSample(context: Context, traceId: string, spanName: string, spanKind: SpanKind, attributes: Attributes, links: Link[]): SamplingResult {
    const sampler = isBackgroundChatter(attributes) ? this.chatter : this.everything;
    return sampler.shouldSample(context, traceId);
  }

  toString(): string {
    return "BackgroundChatterSampler";
  }
}
