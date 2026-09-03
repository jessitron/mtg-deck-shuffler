import { context, propagation, ROOT_CONTEXT, trace, SpanKind } from "@opentelemetry/api";
import { applyCardArrival, applyCardDiscard } from "./cardArrival.js";
import { applyCardRemoval } from "./cardRemoval.js";
import { tableNameFromSlug } from "../shared/slugify.js";
import { log } from "./log.js";

const tracer = trace.getTracer("mtg-tabletop");

function isEnvelopeLike(value: unknown): value is { name: string; traceparent?: unknown } {
  return typeof value === "object" && value !== null && "name" in value && typeof (value as { name: unknown }).name === "string";
}

/**
 * Dispatches one event received over a Spine SSE subscription by `name`. Every kind gets
 * a span carrying `event.name` — matching the Spine admin page's precedent for the same
 * attribute — so all events are graphable by name in Honeycomb, even kinds with no
 * consumer yet (only `card.played` is routed to `applyCardArrival` today). Continues the
 * trace from the broadcast envelope's `traceparent` (injected fresh at publish time by the
 * Spine's `Table#broadcast`) as a CHILD span, the same shape as the admin page's
 * client-side trace-link precedent — the point is one Honeycomb trace covering publish
 * through Tabletop placement, not an unlinked new one.
 */
const CARD_ARRIVAL_EVENT_NAMES = new Set(["card.played", "card.played-face-down"]);
const CARD_DISCARD_EVENT_NAMES = new Set(["card.discarded"]);
const CARD_REMOVAL_EVENT_NAMES = new Set(["card.returned"]);

/**
 * Returns once the event has actually been applied (or rejected/deduped/failed) — not
 * merely received — so `spineSubscriber.ts`'s connect loop can track the highest seq it
 * has confirmed processed and send it back as `Last-Event-ID` on reconnect.
 */
export function dispatchSpineEvent(tableName: string, event: unknown): Promise<void> {
  if (!isEnvelopeLike(event)) return Promise.resolve();

  const traceparent = typeof event.traceparent === "string" ? event.traceparent : undefined;
  const parentContext = traceparent ? propagation.extract(ROOT_CONTEXT, { traceparent }) : ROOT_CONTEXT;

  return context.with(parentContext, () => {
    return tracer.startActiveSpan(
      `sse subscription: ${event.name}`,
      {
        kind: SpanKind.CONSUMER,
        attributes: {
          "event.name": event.name,
          "table.name": tableNameFromSlug(tableName),
          "table.slug": tableName,
        },
      },
      async (span) => {
        try {
          if (CARD_ARRIVAL_EVENT_NAMES.has(event.name)) {
            const outcome = await applyCardArrival(tableName, event);
            span.setAttribute("arrival.outcome", outcome.status);
            if (outcome.status === "invalid") {
              log.warn(`spine sse: ${event.name} event failed validation`, {
                "table.slug": tableName,
                "arrival.error": outcome.error,
              });
            }
            if (outcome.status === "rejected" && outcome.reason === "seat-not-joined") {
              span.setAttribute("error", true);
              log.error(`spine sse: ${event.name} arrived before seat.joined — dropping, not fabricating furniture`, {
                "table.slug": tableName,
                error: true,
              });
            }
            return;
          }

          if (CARD_DISCARD_EVENT_NAMES.has(event.name)) {
            const outcome = await applyCardDiscard(tableName, event);
            span.setAttribute("arrival.outcome", outcome.status);
            if (outcome.status === "invalid") {
              log.warn(`spine sse: ${event.name} event failed validation`, {
                "table.slug": tableName,
                "arrival.error": outcome.error,
              });
            }
            if (outcome.status === "rejected" && outcome.reason === "seat-not-joined") {
              span.setAttribute("error", true);
              log.error(`spine sse: ${event.name} arrived before seat.joined — dropping, not fabricating furniture`, {
                "table.slug": tableName,
                error: true,
              });
            }
            return;
          }

          if (CARD_REMOVAL_EVENT_NAMES.has(event.name)) {
            const outcome = await applyCardRemoval(tableName, event);
            span.setAttribute("removal.outcome", outcome.status);
            if (outcome.status === "invalid") {
              log.warn(`spine sse: ${event.name} event failed validation`, {
                "table.slug": tableName,
                "removal.error": outcome.error,
              });
            }
            return;
          }
        } catch (error) {
          span.recordException(error as Error);
          log.error(`spine sse: ${event.name} dispatch failed`, { "table.slug": tableName }, error);
        } finally {
          span.end();
        }
      }
    );
  });
}
