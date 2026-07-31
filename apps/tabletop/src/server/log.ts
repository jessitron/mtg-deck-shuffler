/**
 * Logging that participates in traces.
 *
 * **Reach for a span attribute first.** Attributes are free in Honeycomb and
 * they correlate with everything else on the span, so anything you know during
 * a request belongs on the request's span. A log is for the case where there is
 * no span to hang it on: startup, shutdown, and callbacks or timers that fire
 * long after the request that created them has ended.
 *
 * (Never `span.addEvent`. This ship is where that lesson came from: rooms.ts
 * used to call addEvent from tldraw's throttled pruneSessions callback, which
 * fires long after the span that opened the room has ended. Production logs
 * filled with "Operation attempted on ended Span" and the room-lifecycle
 * records were dropped. Fixed in JES-136 by using this file instead.)
 *
 * Each record goes two places: stdout, so `./run`'s prefixed local logs stay
 * readable, and OTLP, so it lands in Honeycomb carrying the trace_id/span_id of
 * whatever span was active. Logs are deliberately NOT filtered by the trace
 * sampler: if the health check starts failing, we want every log explaining
 * why, not the fraction the sampler kept.
 *
 * The exporter is wired up in tracing.ts. When nothing registered a provider —
 * tests, scripts — the OTel global no-ops and only the stdout half happens.
 *
 * This file is duplicated from the Shuffler on purpose; see CLAUDE.md.
 */
import { logs, SeverityNumber, LogAttributes } from "@opentelemetry/api-logs";

const LOGGER_NAME = "mtg-tabletop";

function emit(severityNumber: SeverityNumber, severityText: string, message: string, attributes: LogAttributes, error?: unknown): void {
  const withException = error instanceof Error ? { ...attributes, ...exceptionAttributes(error) } : attributes;

  logs.getLogger(LOGGER_NAME).emit({
    severityNumber,
    severityText,
    body: message,
    attributes: withException,
  });

  writeToStdout(severityText, message, withException, error);
}

/** OTel's conventional shape for a recorded exception, matching span.recordException. */
function exceptionAttributes(error: Error): LogAttributes {
  return {
    "exception.type": error.name,
    "exception.message": error.message,
    "exception.stacktrace": error.stack ?? "",
  };
}

function writeToStdout(severityText: string, message: string, attributes: LogAttributes, error?: unknown): void {
  // Attributes are the point, so show them; the stack goes last because it's tall.
  const shown = Object.entries(attributes).filter(([key]) => !key.startsWith("exception."));
  const suffix = shown.length ? " " + shown.map(([key, value]) => `${key}=${String(value)}`).join(" ") : "";
  const line = `${severityText} ${message}${suffix}`;

  if (severityText === "ERROR") {
    console.error(line, error instanceof Error ? error : "");
  } else if (severityText === "WARN") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const log = {
  info(message: string, attributes: LogAttributes = {}): void {
    emit(SeverityNumber.INFO, "INFO", message, attributes);
  },

  warn(message: string, attributes: LogAttributes = {}, error?: unknown): void {
    emit(SeverityNumber.WARN, "WARN", message, attributes, error);
  },

  error(message: string, attributes: LogAttributes = {}, error?: unknown): void {
    emit(SeverityNumber.ERROR, "ERROR", message, attributes, error);
  },
};
