import { EventEnvelope } from "../../port-tabletop/types.js";
import { SpineGatewayError } from "../SpineGatewayError.js";

/**
 * Appending to a table's event log, narrowed to plain data. Nothing here knows what a
 * `GameCard` is; `SpineEventsAdapter` is where the Shuffler's domain stops.
 *
 * The SSE connection is the receive half of the same conversation and has its own gateway
 * (`HttpSpineStreamGateway`) — a stream has nothing in common with a POST.
 */
export interface SpineEventsGateway {
  sendEvent(tableId: string, event: EventEnvelope<unknown>): Promise<void>;
}

/**
 * Real Spine client (services/spine) for the outgoing leg of the event bus: appends one
 * event to a table's log. Uses global fetch (undici), which OTel auto-instrumentation
 * wraps, so trace context propagates to the Spine for free on the way in as a
 * `traceparent` header. `traceparent` also rides on the envelope body itself
 * (contracts/envelope.v1.json, optional field) — redundant for this single-event HTTP
 * POST, but load-bearing once events travel over the Spine's outbound SSE stream (no
 * header there) or a future batched send. Don't set a `traceparent` header by hand here:
 * undici's instrumentation appends its own after any explicit headers, unconditionally,
 * so a hand-set value would just duplicate (or, worse, diverge from) the one it injects
 * from the live active span.
 */
export class HttpSpineEventsGateway implements SpineEventsGateway {
  constructor(private readonly baseUrl: string) {}

  async sendEvent(tableId: string, event: EventEnvelope<unknown>): Promise<void> {
    const url = `${this.baseUrl}/tables/${encodeURIComponent(tableId)}/events`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(event),
      });
    } catch (error) {
      // Couldn't reach the Spine at all — DNS, refused connection, socket reset.
      throw new SpineGatewayError(error instanceof Error ? error.message : String(error), { cause: error });
    }
    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      throw new SpineGatewayError(`Spine rejected the event: ${response.status} ${response.statusText} ${bodyText}`.trim());
    }
  }
}
