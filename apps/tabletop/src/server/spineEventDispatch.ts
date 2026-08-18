import { context, propagation, ROOT_CONTEXT, trace, SpanKind } from "@opentelemetry/api";
import { applyCardArrival } from "./cardArrival.js";
import { tableNameFromSlug } from "../shared/slugify.js";
import { log } from "./log.js";

const tracer = trace.getTracer("mtg-tabletop");

function isEnvelopeLike(value: unknown): value is { name: unknown; traceparent?: unknown } {
  return typeof value === "object" && value !== null && "name" in value;
}

/**
 * Dispatches one event received over a Spine SSE subscription by `name` (only
 * `card.played` has a consumer today; every other kind on the stream — e.g.
 * `seat.taken`, `table.created` — is ignored). Continues the trace from the
 * broadcast envelope's `traceparent` (injected fresh at publish time by the
 * Spine's `Table#broadcast`) as a CHILD span, the same shape as the admin
 * page's client-side trace-link precedent — the point is one Honeycomb trace
 * covering publish through Tabletop placement, not an unlinked new one.
 */
export function dispatchSpineEvent(tableName: string, event: unknown): void {
  if (!isEnvelopeLike(event) || event.name !== "card.played") return;

  const traceparent = typeof event.traceparent === "string" ? event.traceparent : undefined;
  const parentContext = traceparent ? propagation.extract(ROOT_CONTEXT, { traceparent }) : ROOT_CONTEXT;

  context.with(parentContext, () => {
    void tracer.startActiveSpan(
      "sse subscription: card.played",
      {
        kind: SpanKind.CONSUMER,
        attributes: { "table.name": tableNameFromSlug(tableName), "table.slug": tableName },
      },
      async (span) => {
        try {
          const outcome = await applyCardArrival(tableName, event);
          span.setAttribute("arrival.outcome", outcome.status);
          if (outcome.status === "invalid") {
            log.warn("spine sse: card.played event failed validation", {
              "table.slug": tableName,
              "arrival.error": outcome.error,
            });
          }
        } catch (error) {
          span.recordException(error as Error);
          log.error("spine sse: card.played dispatch failed", { "table.slug": tableName }, error);
        } finally {
          span.end();
        }
      }
    );
  });
}
