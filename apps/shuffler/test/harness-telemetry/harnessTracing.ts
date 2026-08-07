/**
 * A tracer provider for the verify harness itself — the fleet's first
 * instrumentation of dev tooling rather than of a ship.
 *
 * Deliberately NOT `src/tracing.ts`, and deliberately not `NodeSDK`:
 *
 * - `src/tracing.ts` is import-for-side-effect with no flush handle, and it
 *   loads full auto-instrumentation. In the Playwright runner that would trace
 *   the test runner's own fs/http/child_process — noise on top of the very
 *   signal we're trying to measure.
 * - **Do not swap this for `NodeSDK`.** NodeSDK does
 *   `this._resource = this._resource.merge(detectResources(...))` — *detected
 *   wins* — so `.env`'s `OTEL_SERVICE_NAME=mtg-deck-shuffler` would silently
 *   reclaim these spans into the app's dataset and quietly corrupt the
 *   app-vs-harness measurement this instrumentation exists to make.
 *   `BasicTracerProvider` does `resource ?? defaultResource()` — a plain `??`,
 *   no merge — and `defaultResource()` never runs `envDetector`, so an explicit
 *   resource here is structurally safe from the environment.
 *   (If you ever want `telemetry.sdk.*` back, the order matters:
 *   `defaultResource().merge(yours)`, never the reverse.)
 *
 * No sampler (default AlwaysOn), no context manager, no propagators — nothing
 * here propagates. See the note on parenting in `emit()`.
 */
import { trace, ROOT_CONTEXT, Context, SpanStatusCode, Attributes } from "@opentelemetry/api";
import {
  BasicTracerProvider,
  BatchSpanProcessor,
  ReadableSpan,
  Span as SdkSpan,
  SpanExporter,
  SpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { ExportResult, ExportResultCode } from "@opentelemetry/core";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import { SpanNode } from "./spanPlan.js";

/**
 * Fleet-neutral on purpose (Jess, 2026-08-07): the Tabletop's and Spine's
 * suites can export here too, so which suite ran is a span attribute
 * (`verify.ship`) rather than part of the service name.
 */
export const HARNESS_SERVICE_NAME = "mtg-fleet-verify";

const TRACER_NAME = HARNESS_SERVICE_NAME;

/**
 * Is there anywhere to send spans, and a real key to send them with?
 *
 * Presence alone is not enough. When `.be` is missing, `.env` still runs and
 * sets `OTEL_EXPORTER_OTLP_HEADERS="x-honeycomb-team="` — present, non-empty,
 * and useless: exporting with it earns a 401 per batch for the length of the
 * run. An empty team key counts as unconfigured, so a bare
 * `npx playwright test` with no `.be` stays quiet instead of retrying.
 */
export function isTelemetryConfigured(env: Record<string, string | undefined>): boolean {
  if (!env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim()) return false;

  const headers = env.OTEL_EXPORTER_OTLP_HEADERS ?? "";
  const teamKey = /x-honeycomb-team=([^,]*)/.exec(headers);
  // No headers at all is fine (a local collector needs none); an explicitly
  // empty team key is the .be-wasn't-sourced failure.
  if (teamKey && teamKey[1].trim() === "") return false;

  return true;
}

/**
 * Wait for a telemetry promise, but never longer than `timeoutMs`. A hung
 * exporter must not wedge the suite, and a telemetry problem must never read as
 * a test failure — same posture as `deploy-marker.sh`'s `|| true`.
 */
async function bounded(work: Promise<unknown>, timeoutMs: number): Promise<void> {
  await Promise.race([
    // Swallowed, not propagated: an exporter that throws mid-flush would
    // otherwise reject out of here, and the whole point is that no telemetry
    // problem reaches the caller.
    work.catch(() => {}),
    new Promise<void>((resolve) => {
      // unref so a pending timer can never hold the process open.
      setTimeout(resolve, timeoutMs).unref();
    }),
  ]);
}

/**
 * An exporter that cannot throw at its caller.
 *
 * `BatchSpanProcessor` calls `export()` and waits for the callback. If the
 * exporter throws synchronously instead, the callback never arrives and the
 * processor leaves its flush timer armed forever — which showed up as jest
 * force-exiting a worker, and in a longer-lived process would be a leak. A
 * failed export must look like a failed export, not like an exception.
 */
class NeverThrowingExporter implements SpanExporter {
  constructor(private readonly inner: SpanExporter) {}

  export(spans: Parameters<SpanExporter["export"]>[0], resultCallback: (result: ExportResult) => void): void {
    try {
      this.inner.export(spans, resultCallback);
    } catch (error) {
      resultCallback({ code: ExportResultCode.FAILED, error: error as Error });
    }
  }

  async shutdown(): Promise<void> {
    try {
      await this.inner.shutdown();
    } catch {
      // Telemetry teardown is not the suite's problem.
    }
  }

  async forceFlush(): Promise<void> {
    try {
      await this.inner.forceFlush?.();
    } catch {
      // Same.
    }
  }
}

/** Stamps the run's identity onto every span, so no call site has to remember. */
class RunAttributesSpanProcessor implements SpanProcessor {
  constructor(private readonly attributes: Attributes) {}
  onStart(span: SdkSpan): void {
    span.setAttributes(this.attributes);
  }
  onEnd(_span: ReadableSpan): void {}
  forceFlush(): Promise<void> {
    return Promise.resolve();
  }
  shutdown(): Promise<void> {
    return Promise.resolve();
  }
}

export interface HarnessTracing {
  /** Emit a planned span tree. Returns the number of spans emitted. */
  emit(root: SpanNode): number;
  /** Export what's buffered, giving up after `timeoutMs`. */
  flush(timeoutMs: number): Promise<void>;
  /** Flush and stop, giving up after `timeoutMs` rather than wedging the suite. */
  shutdown(timeoutMs: number): Promise<void>;
}

export interface HarnessTracingOptions {
  /** Stamped on every span. */
  runAttributes: Attributes;
  /** `service.version`, so this init path satisfies build-sha-on-every-span from day one. */
  serviceVersion?: string;
  /** Injectable so tests can use an in-memory exporter instead of the network. */
  exporter?: SpanExporter;
}

export function createHarnessTracing(options: HarnessTracingOptions): HarnessTracing {
  const provider = new BasicTracerProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: HARNESS_SERVICE_NAME,
      ...(options.serviceVersion ? { [ATTR_SERVICE_VERSION]: options.serviceVersion } : {}),
    }),
    spanProcessors: [
      new RunAttributesSpanProcessor(options.runAttributes),
      new BatchSpanProcessor(new NeverThrowingExporter(options.exporter ?? new OTLPTraceExporter()), {
        // Defaults (2048 / 5000ms) drop spans silently on overflow at this
        // volume, and the run's own span-count attribute counts spans EMITTED,
        // not exported — so the drop would be invisible twice over.
        maxQueueSize: 8192,
        maxExportBatchSize: 512,
        scheduledDelayMillis: 1000,
      }),
    ],
  });

  const tracer = provider.getTracer(TRACER_NAME);

  /**
   * Parenting is passed by hand on purpose. With no context manager,
   * `context.active()` is always ROOT_CONTEXT — so forgetting this argument
   * doesn't error, it just yields a few thousand sibling root spans that still
   * carry the right run id and still answer most queries. That is exactly how
   * it would land unnoticed; `spanPlan.test.ts` asserts the structure.
   */
  function emitNode(node: SpanNode, parentContext: Context): number {
    const span = tracer.startSpan(node.name, { startTime: node.startTimeMs, attributes: node.attributes }, parentContext);
    if (node.error) span.setStatus({ code: SpanStatusCode.ERROR });

    const childContext = trace.setSpan(parentContext, span);
    let emitted = 1;
    for (const child of node.children) {
      emitted += emitNode(child, childContext);
    }

    span.end(node.endTimeMs);
    return emitted;
  }

  return {
    emit(root: SpanNode): number {
      return emitNode(root, ROOT_CONTEXT);
    },
    async flush(timeoutMs: number): Promise<void> {
      await bounded(provider.forceFlush(), timeoutMs);
    },
    async shutdown(timeoutMs: number): Promise<void> {
      await bounded(provider.shutdown(), timeoutMs);
    },
  };
}

/** Tracing for a real run, or `null` when there's nowhere to send it. */
export function startHarnessTracing(env: Record<string, string | undefined>, options: HarnessTracingOptions): HarnessTracing | null {
  if (!isTelemetryConfigured(env)) return null;
  return createHarnessTracing(options);
}
