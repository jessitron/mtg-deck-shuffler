import { InMemorySpanExporter } from "@opentelemetry/sdk-trace-base";
import { SpanStatusCode } from "@opentelemetry/api";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { createHarnessTracing, isTelemetryConfigured, HARNESS_SERVICE_NAME } from "./harnessTracing.js";
import { SpanNode } from "./spanPlan.js";

const NOW = 1770000000000;

function node(name: string, children: SpanNode[] = [], error = false): SpanNode {
  return { name, startTimeMs: NOW, endTimeMs: NOW + 100, attributes: {}, children, error: error || undefined };
}

async function emitAndCollect(root: SpanNode, runAttributes = { "verify.run.id": "run-1" }) {
  const exporter = new InMemorySpanExporter();
  const tracing = createHarnessTracing({ runAttributes, exporter, serviceVersion: "abc1234" });
  const count = tracing.emit(root);
  await tracing.flush(2000);
  return { spans: exporter.getFinishedSpans(), count };
}

describe("isTelemetryConfigured", () => {
  it("is off with no endpoint", () => {
    expect(isTelemetryConfigured({})).toBe(false);
    expect(isTelemetryConfigured({ OTEL_EXPORTER_OTLP_ENDPOINT: "  " })).toBe(false);
  });

  it("is off when .be was never sourced, so the team key is empty", () => {
    expect(
      isTelemetryConfigured({
        OTEL_EXPORTER_OTLP_ENDPOINT: "https://api.honeycomb.io:443",
        OTEL_EXPORTER_OTLP_HEADERS: "x-honeycomb-team=",
      })
    ).toBe(false);
  });

  it("is on with an endpoint and a real key", () => {
    expect(
      isTelemetryConfigured({
        OTEL_EXPORTER_OTLP_ENDPOINT: "https://api.honeycomb.io:443",
        OTEL_EXPORTER_OTLP_HEADERS: "x-honeycomb-team=abc123",
      })
    ).toBe(true);
  });

  it("is on with an endpoint and no headers at all — a local collector needs none", () => {
    expect(isTelemetryConfigured({ OTEL_EXPORTER_OTLP_ENDPOINT: "http://localhost:4318" })).toBe(true);
  });
});

describe("createHarnessTracing", () => {
  it("sends spans to the harness service, NOT the app's, even when the app's name is in the environment", async () => {
    const previous = process.env.OTEL_SERVICE_NAME;
    process.env.OTEL_SERVICE_NAME = "mtg-deck-shuffler";
    try {
      const { spans } = await emitAndCollect(node("verify run"));
      expect(spans[0].resource.attributes[ATTR_SERVICE_NAME]).toBe(HARNESS_SERVICE_NAME);
      expect(spans[0].resource.attributes[ATTR_SERVICE_NAME]).not.toBe("mtg-deck-shuffler");
    } finally {
      if (previous === undefined) delete process.env.OTEL_SERVICE_NAME;
      else process.env.OTEL_SERVICE_NAME = previous;
    }
  });

  it("puts the run attributes on every span, not just the root", async () => {
    const { spans } = await emitAndCollect(node("verify run", [node("spec: a", [node("test: t")])]));

    expect(spans.length).toBe(3);
    for (const span of spans) {
      expect(span.attributes["verify.run.id"]).toBe("run-1");
    }
  });

  it("records service.version so the run says which commit it measured", async () => {
    const { spans } = await emitAndCollect(node("verify run"));
    expect(spans[0].resource.attributes["service.version"]).toBe("abc1234");
  });

  it("parents children explicitly — one trace per run, not a flat pile of roots", async () => {
    const { spans } = await emitAndCollect(node("verify run", [node("spec: a", [node("test: t")])]));

    const byName = new Map(spans.map((span) => [span.name, span]));
    const root = byName.get("verify run")!;
    const spec = byName.get("spec: a")!;
    const test = byName.get("test: t")!;

    // One trace...
    expect(spec.spanContext().traceId).toBe(root.spanContext().traceId);
    expect(test.spanContext().traceId).toBe(root.spanContext().traceId);
    // ...with a real hierarchy, not three roots.
    expect(root.parentSpanContext).toBeUndefined();
    expect(spec.parentSpanContext?.spanId).toBe(root.spanContext().spanId);
    expect(test.parentSpanContext?.spanId).toBe(spec.spanContext().spanId);
  });

  it("honors the explicit start and end times, so a shell phase can be a span", async () => {
    const { spans } = await emitAndCollect({
      name: "verify build",
      startTimeMs: NOW - 40_000,
      endTimeMs: NOW - 1_000,
      attributes: {},
      children: [],
    });

    const durationMs = spans[0].duration[0] * 1000 + spans[0].duration[1] / 1e6;
    expect(Math.round(durationMs)).toBe(39_000);
  });

  it("marks failed nodes as errors", async () => {
    const { spans } = await emitAndCollect(node("verify run", [node("test: broken", [], true)]));
    const broken = spans.find((span) => span.name === "test: broken")!;
    expect(broken.status.code).toBe(SpanStatusCode.ERROR);
  });

  it("gives up on a hung exporter instead of wedging the suite", async () => {
    const hung = {
      export: () => {},
      shutdown: () => new Promise<void>(() => {}),
      forceFlush: () => new Promise<void>(() => {}),
    };
    const tracing = createHarnessTracing({ runAttributes: {}, exporter: hung as never });

    const startedAt = Date.now();
    await tracing.shutdown(150);
    expect(Date.now() - startedAt).toBeLessThan(1000);
  });

  it("swallows an exporter that throws", async () => {
    const throwing = {
      export: () => {
        throw new Error("exporter is having a day");
      },
      shutdown: async () => {},
      forceFlush: async () => {},
    };
    const tracing = createHarnessTracing({ runAttributes: {}, exporter: throwing as never });

    expect(() => tracing.emit(node("verify run"))).not.toThrow();
    await expect(tracing.shutdown(1000)).resolves.toBeUndefined();
  });

  it("reports how many spans it emitted", async () => {
    const { count } = await emitAndCollect(node("verify run", [node("spec: a", [node("test: t"), node("test: u")])]));
    expect(count).toBe(4);
  });
});
