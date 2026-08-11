import { trace } from "@opentelemetry/api";
import { randomBytes } from "node:crypto";

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
