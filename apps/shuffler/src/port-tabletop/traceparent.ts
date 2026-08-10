import { trace } from "@opentelemetry/api";
import { randomBytes } from "node:crypto";

/**
 * W3C traceparent for the envelope's `traceparent` field (contracts/
 * envelope.v1.json) — observability only, never durable causality (that's
 * the envelope's `id`). Same `00-{traceId}-{spanId}-{flags}` format as the
 * Spine's `current_traceparent` (application_controller.rb) and the
 * Tabletop's `currentTraceparent` (src/client/observability/index.ts).
 *
 * The envelope requires this field, so unlike those two precedents this
 * helper always returns a well-formed string, synthesizing one when there's
 * no active span. In production every card.played/seat.joined send happens
 * inside an Express request span, so the fallback is a test-only safety
 * net — its use is flagged on the active span (if any) so a real occurrence
 * (e.g. broken auto-instrumentation) is visible rather than masquerading as
 * a normal trace link.
 */
export function currentTraceparent(): string {
  const span = trace.getActiveSpan();
  const spanContext = span?.spanContext();
  if (spanContext) {
    const flags = spanContext.traceFlags.toString(16).padStart(2, "0");
    return `00-${spanContext.traceId}-${spanContext.spanId}-${flags}`;
  }
  span?.setAttribute("traceparent.synthesized", true);
  return `00-${randomBytes(16).toString("hex")}-${randomBytes(8).toString("hex")}-01`;
}
