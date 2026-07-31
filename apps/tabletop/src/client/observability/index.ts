/**
 * Our own wrapper around the standard OpenTelemetry web SDK — nothing
 * Honeycomb-specific in here. The page asks the server where to send spans
 * (GET /otel-config.json): in production that's an OpenTelemetry Collector
 * (with CORS for this origin); locally it may fall back to a direct endpoint.
 * No API key ever ships in the page except the documented local-only fallback.
 *
 * Surface: initTracing(), inSpan(), setGlobalAttrs(), currentTraceparent(),
 * logError().
 */
import { trace, SpanStatusCode, Span, Attributes, context } from "@opentelemetry/api";
import { WebTracerProvider, BatchSpanProcessor, SpanProcessor, ReadableSpan } from "@opentelemetry/sdk-trace-web";
import { Span as SdkSpan } from "@opentelemetry/sdk-trace-base";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { LoggerProvider, BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { logs, SeverityNumber, LogAttributes } from "@opentelemetry/api-logs";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

export const WEB_SERVICE_NAME = "mtg-tabletop-web";
const TRACER_NAME = WEB_SERVICE_NAME;

const globalAttrs: Attributes = {};

/** Stamp attributes (e.g. table.name) onto every span from now on. */
export function setGlobalAttrs(attrs: Attributes): void {
  Object.assign(globalAttrs, attrs);
}

class GlobalAttributesSpanProcessor implements SpanProcessor {
  onStart(span: SdkSpan): void {
    span.setAttributes(globalAttrs);
  }
  onEnd(_span: ReadableSpan): void {}
  forceFlush(): Promise<void> {
    return Promise.resolve();
  }
  shutdown(): Promise<void> {
    return Promise.resolve();
  }
}

interface OtelBrowserConfig {
  tracesUrl: string | null;
  logsUrl?: string | null;
  headers?: Record<string, string>;
}

let initialized = false;

/**
 * Initialize browser tracing before mounting the app. Quietly does nothing if
 * the server offers no destination (tracing off is a valid local mode).
 */
export async function initTracing(): Promise<void> {
  if (initialized) return;
  initialized = true;

  let config: OtelBrowserConfig;
  try {
    const response = await fetch("/otel-config.json");
    if (!response.ok) throw new Error(`otel-config ${response.status}`);
    config = await response.json();
  } catch {
    console.log("Tabletop tracing: no /otel-config.json — browser telemetry off");
    return;
  }
  if (!config.tracesUrl) {
    console.log("Tabletop tracing: no traces destination configured — browser telemetry off");
    return;
  }

  const provider = new WebTracerProvider({
    resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: WEB_SERVICE_NAME }),
    spanProcessors: [
      new GlobalAttributesSpanProcessor(),
      new BatchSpanProcessor(
        new OTLPTraceExporter({
          url: config.tracesUrl,
          headers: config.headers ?? {},
        })
      ),
    ],
  });
  provider.register();
  console.log(`Tabletop tracing: exporting to ${config.tracesUrl}`);

  if (config.logsUrl) {
    logs.setGlobalLoggerProvider(
      new LoggerProvider({
        resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: WEB_SERVICE_NAME }),
        processors: [new BatchLogRecordProcessor({ exporter: new OTLPLogExporter({ url: config.logsUrl, headers: config.headers ?? {} }) })],
      })
    );
    reportUncaughtErrors();
    console.log(`Tabletop logging: exporting to ${config.logsUrl}`);
  }
}

/**
 * Record an error that happened outside any span.
 *
 * As everywhere in this fleet: if you're inside `inSpan`, put the information
 * on the span instead — `inSpan` already records exceptions for you. This is
 * for the browser's genuinely span-less moments.
 */
export function logError(message: string, attributes: LogAttributes = {}, error?: unknown): void {
  const withException =
    error instanceof Error
      ? { ...attributes, "exception.type": error.name, "exception.message": error.message, "exception.stacktrace": error.stack ?? "" }
      : attributes;

  logs.getLogger(WEB_SERVICE_NAME).emit({
    severityNumber: SeverityNumber.ERROR,
    severityText: "ERROR",
    body: message,
    attributes: { ...globalAttrs, ...withException } as LogAttributes,
  });
}

/**
 * Uncaught errors and unhandled rejections are the browser's version of the
 * server's timer callback: something went wrong with no span in scope, so
 * before this they went nowhere at all — the user saw a broken table and
 * Honeycomb showed a clean session.
 */
function reportUncaughtErrors(): void {
  window.addEventListener("error", (event) => {
    logError("uncaught error", { "browser.url": window.location.pathname }, event.error ?? new Error(event.message));
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    logError("unhandled promise rejection", { "browser.url": window.location.pathname }, reason instanceof Error ? reason : new Error(String(reason)));
  });
}

/** Run a function inside a span; errors are recorded and rethrown. */
export async function inSpan<T>(name: string, fn: (span: Span) => Promise<T> | T, attrs?: Attributes): Promise<T> {
  const tracer = trace.getTracer(TRACER_NAME);
  return tracer.startActiveSpan(name, { attributes: attrs }, async (span) => {
    try {
      return await fn(span);
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * W3C traceparent for the CURRENT active span, for propagation on a websocket
 * connection URL. Propagation belongs to the connection request only — nothing
 * durable carries trace context.
 */
export function currentTraceparent(): string | undefined {
  const spanContext = trace.getActiveSpan()?.spanContext();
  if (!spanContext) return undefined;
  const flags = spanContext.traceFlags.toString(16).padStart(2, "0");
  return `00-${spanContext.traceId}-${spanContext.spanId}-${flags}`;
}
