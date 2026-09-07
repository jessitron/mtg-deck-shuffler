import { EventEnvelope } from "../../port-tabletop/types.js";
import { SpineJoinRequest, SpineJoinResult } from "./spineWire.js";

/** Every failure reaching the Spine, in our own words — undici's errors stop at the gateway. */
export class SpineGatewayError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "SpineGatewayError";
  }
}

/**
 * The two Spine calls we make, narrowed to plain data. Nothing here knows what a
 * `GameCard` is; `SpineAdapter` is where the Shuffler's domain stops.
 */
export interface SpineGateway {
  join(request: SpineJoinRequest): Promise<SpineJoinResult>;
  sendEvent(tableId: string, event: EventEnvelope<unknown>): Promise<void>;
}

/**
 * Real Spine client (services/spine): joins a table by name (creating it if
 * none is active yet), assigns a seat, and fully decorates it via a single
 * `POST /join`, then appends events to its log. Uses global fetch (undici),
 * which OTel auto-instrumentation wraps, so trace context propagates to the
 * Spine for free on the way in as a `traceparent` header. `traceparent` also
 * rides on the envelope body itself (contracts/envelope.v1.json, optional field)
 * for `sendEvent` — redundant for this single-event HTTP POST, but load-bearing
 * once events travel over the Spine's outbound SSE stream (no header there) or
 * a future batched `sendEvent`. Don't set a `traceparent` header by hand here:
 * undici's instrumentation appends its own after any explicit headers,
 * unconditionally, so a hand-set value would just duplicate (or, worse, diverge
 * from) the one it injects from the live active span.
 */
export class HttpSpineGateway implements SpineGateway {
  constructor(private readonly baseUrl: string) {}

  async join(request: SpineJoinRequest): Promise<SpineJoinResult> {
    const response = await post(`${this.baseUrl}/join`, request);
    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      throw new SpineGatewayError(`Spine rejected the join: ${response.status} ${response.statusText} ${bodyText}`.trim());
    }
    const body = (await response.json()) as SpineJoinResult;
    return { tableId: body.tableId, seatId: body.seatId, seatNumber: body.seatNumber, tableUrl: body.tableUrl };
  }

  async sendEvent(tableId: string, event: EventEnvelope<unknown>): Promise<void> {
    const response = await post(`${this.baseUrl}/tables/${encodeURIComponent(tableId)}/events`, event);
    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      throw new SpineGatewayError(`Spine rejected the event: ${response.status} ${response.statusText} ${bodyText}`.trim());
    }
  }
}

/** Wraps a failure to reach the Spine at all — DNS, refused connection, socket reset. */
async function post(url: string, body: unknown): Promise<Response> {
  try {
    return await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new SpineGatewayError(error instanceof Error ? error.message : String(error), { cause: error });
  }
}
