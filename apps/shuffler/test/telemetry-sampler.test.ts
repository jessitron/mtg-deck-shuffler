import { describe, test, expect } from "@jest/globals";
import { SpanKind, ROOT_CONTEXT } from "@opentelemetry/api";
import { SamplingDecision } from "@opentelemetry/sdk-trace-base";
import { isBackgroundChatter, BackgroundChatterSampler } from "../src/telemetry-sampler.js";

describe("isBackgroundChatter", () => {
  describe("health checks", () => {
    test("ELB health checker, whose user agent is mixed case", () => {
      // Regression: the old sampler lowercased the user agent and then looked
      // for "ELB-HealthChecker" in it, so this never matched and every ALB
      // probe was traced at 100%.
      expect(isBackgroundChatter({ "http.user_agent": "ELB-HealthChecker/2.0", "http.target": "/health" })).toBe(true);
    });

    test("kube-probe", () => {
      expect(isBackgroundChatter({ "http.user_agent": "kube-probe/1.31", "http.target": "/health" })).toBe(true);
    });

    test("the /health route, whatever is asking", () => {
      expect(isBackgroundChatter({ "http.target": "/health" })).toBe(true);
    });

    test("a probe user agent asking for anything at all", () => {
      expect(isBackgroundChatter({ "http.user_agent": "kube-probe/1.31", "http.target": "/" })).toBe(true);
    });
  });

  describe("static assets", () => {
    test.each(["/styles.css", "/hny.js", "/images/mtg-card-back.jpg", "/images/W.svg", "/images/playmats/aeoe-3-exalted-sunborn.png", "/favicon.ico"])(
      "%s",
      target => {
        expect(isBackgroundChatter({ "http.target": target })).toBe(true);
      }
    );

    test("a cache-busting query string does not hide the extension", () => {
      expect(isBackgroundChatter({ "http.target": "/site.css?v=3" })).toBe(true);
    });
  });

  describe("traffic we always want to see", () => {
    test.each(["/", "/docs", "/about", "/history", "/choose-any-deck", "/prepare/abc-123", "/game/abc-123", "/deck", "/draw/abc-123"])("%s", target => {
      expect(isBackgroundChatter({ "http.target": target })).toBe(false);
    });

    test("a real browser hitting the home page", () => {
      expect(
        isBackgroundChatter({
          "http.user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:153.0) Gecko/20100101 Firefox/153.0",
          "http.target": "/",
        })
      ).toBe(false);
    });

    test("a span with no HTTP attributes at all (an internal span)", () => {
      expect(isBackgroundChatter({})).toBe(false);
    });
  });

  describe("newer OTel semantic conventions", () => {
    // The HTTP instrumentation emits http.user_agent/http.target today, but
    // stable semconv renamed them. Read both so a dependency bump doesn't
    // silently turn the sampling back off — which is exactly how the
    // ELB-HealthChecker case bug stayed invisible.
    test("user_agent.original", () => {
      expect(isBackgroundChatter({ "user_agent.original": "ELB-HealthChecker/2.0" })).toBe(true);
    });

    test("url.path", () => {
      expect(isBackgroundChatter({ "url.path": "/styles.css" })).toBe(true);
    });
  });
});

describe("BackgroundChatterSampler", () => {
  const sampler = new BackgroundChatterSampler();

  function decide(attributes: Record<string, string>, traceId: string) {
    return sampler.shouldSample(ROOT_CONTEXT, traceId, "GET", SpanKind.SERVER, attributes, []).decision;
  }

  // A spread of valid trace ids. TraceIdRatioBasedSampler compares the trace
  // id's own bits against the ratio, so the ids have to be spread across the
  // whole 32-bit range — a run of small sequential numbers all land under the
  // threshold and would look like nothing is ever dropped. Multiplying by
  // Knuth's constant scatters them deterministically (no Math.random, which
  // would make this test flaky).
  const traceIds = Array.from({ length: 2000 }, (_, i) => (((i + 1) * 2654435761) % 2 ** 32).toString(16).padStart(32, "0"));

  function keptCount(attributes: Record<string, string>) {
    return traceIds.filter(id => decide(attributes, id) === SamplingDecision.RECORD_AND_SAMPLED).length;
  }

  test("records everything that is not chatter", () => {
    expect(keptCount({ "http.target": "/game/abc-123" })).toBe(traceIds.length);
  });

  test("drops the great majority of chatter", () => {
    expect(keptCount({ "http.target": "/health" })).toBeLessThan(traceIds.length * 0.05);
  });

  test("but keeps some chatter, so we can still see the health check succeeding", () => {
    expect(keptCount({ "http.target": "/health" })).toBeGreaterThan(0);
    expect(keptCount({ "http.target": "/styles.css" })).toBeGreaterThan(0);
  });
});
