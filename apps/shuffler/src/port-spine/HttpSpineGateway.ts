import { EventEnvelope } from "../port-tabletop/types.js";
import { SpineJoinRequest, SpineJoinResult, SpinePort } from "./types.js";

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
export class HttpSpineGateway implements SpinePort {
  constructor(private readonly baseUrl: string) {}

  async join(request: SpineJoinRequest): Promise<SpineJoinResult> {
    const response = await fetch(`${this.baseUrl}/join`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      throw new Error(`Spine rejected the join: ${response.status} ${response.statusText} ${bodyText}`.trim());
    }
    const body = (await response.json()) as SpineJoinResult;
    return { tableId: body.tableId, seatNumber: body.seatNumber, tableUrl: body.tableUrl };
  }

  async sendEvent<Payload>(tableId: string, event: EventEnvelope<Payload>): Promise<void> {
    const url = `${this.baseUrl}/tables/${encodeURIComponent(tableId)}/events`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(event),
    });
    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      throw new Error(`Spine rejected the event: ${response.status} ${response.statusText} ${bodyText}`.trim());
    }
  }
}
