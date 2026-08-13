import { describe, test, expect } from "vitest";
import { SpanKind, ROOT_CONTEXT } from "@opentelemetry/api";
import { SamplingDecision } from "@opentelemetry/sdk-trace-base";
import {
  sampleRatioFor,
  BackgroundChatterSampler,
  KUBE_PROBE_SAMPLE_RATIO,
  ELB_HEALTHCHECKER_SAMPLE_RATIO,
  HEALTH_SAMPLE_RATIO,
  DEFAULT_SAMPLE_RATIO,
} from "../src/server/telemetry-sampler";

describe("sampleRatioFor", () => {
  test("kube-probe, whatever the path", () => {
    expect(sampleRatioFor({ "http.user_agent": "kube-probe/1.31", "http.target": "/" })).toBe(KUBE_PROBE_SAMPLE_RATIO);
    expect(sampleRatioFor({ "http.user_agent": "kube-probe/1.31", "http.target": "/health" })).toBe(KUBE_PROBE_SAMPLE_RATIO);
  });

  test("elb-healthchecker, whose user agent is mixed case", () => {
    expect(sampleRatioFor({ "http.user_agent": "ELB-HealthChecker/2.0", "http.target": "/health" })).toBe(ELB_HEALTHCHECKER_SAMPLE_RATIO);
  });

  test("the /health route, whatever is asking", () => {
    expect(sampleRatioFor({ "http.target": "/health" })).toBe(HEALTH_SAMPLE_RATIO);
  });

  test("a cache-busting query string does not hide the /health path", () => {
    expect(sampleRatioFor({ "http.target": "/health?v=3" })).toBe(HEALTH_SAMPLE_RATIO);
  });

  test("a normal route falls through to the default", () => {
    expect(sampleRatioFor({ "http.target": "/t/kitchen-table" })).toBe(DEFAULT_SAMPLE_RATIO);
  });

  test("a real browser hitting a table", () => {
    expect(
      sampleRatioFor({
        "http.user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:153.0) Gecko/20100101 Firefox/153.0",
        "http.target": "/t/kitchen-table",
      })
    ).toBe(DEFAULT_SAMPLE_RATIO);
  });

  test("a span with no HTTP attributes at all (an internal span)", () => {
    expect(sampleRatioFor({})).toBe(DEFAULT_SAMPLE_RATIO);
  });

  describe("newer OTel semantic conventions", () => {
    test("user_agent.original", () => {
      expect(sampleRatioFor({ "user_agent.original": "ELB-HealthChecker/2.0" })).toBe(ELB_HEALTHCHECKER_SAMPLE_RATIO);
    });

    test("url.path", () => {
      expect(sampleRatioFor({ "url.path": "/health" })).toBe(HEALTH_SAMPLE_RATIO);
    });
  });
});

describe("BackgroundChatterSampler", () => {
  const sampler = new BackgroundChatterSampler();

  function decide(attributes: Record<string, string>, traceId: string) {
    return sampler.shouldSample(ROOT_CONTEXT, traceId, "GET", SpanKind.SERVER, attributes, []).decision;
  }

  const traceIds = Array.from({ length: 2000 }, (_, i) => (((i + 1) * 2654435761) % 2 ** 32).toString(16).padStart(32, "0"));

  function keptCount(attributes: Record<string, string>) {
    return traceIds.filter(id => decide(attributes, id) === SamplingDecision.RECORD_AND_SAMPLED).length;
  }

  test("records everything on a normal route", () => {
    expect(keptCount({ "http.target": "/t/kitchen-table" })).toBe(traceIds.length);
  });

  test("drops the great majority of /health", () => {
    expect(keptCount({ "http.target": "/health" })).toBeLessThan(traceIds.length * 0.05);
  });

  test("but keeps some /health, so we can still see the health check succeeding", () => {
    expect(keptCount({ "http.target": "/health" })).toBeGreaterThan(0);
  });
});
