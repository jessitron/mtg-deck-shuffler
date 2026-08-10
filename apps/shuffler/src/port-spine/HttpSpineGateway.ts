import { EventEnvelope } from "../port-tabletop/types.js";
import { SpinePort } from "./types.js";

/**
 * Real Spine client (services/spine): looks up a table by name, creating it
 * if none is active yet, then appends events to its log. Uses global fetch
 * (undici), which OTel auto-instrumentation wraps, so trace context
 * propagates to the Spine for free.
 */
export class HttpSpineGateway implements SpinePort {
  constructor(private readonly baseUrl: string) {}

  async ensureTable(name: string, creator: string): Promise<string> {
    const lookup = await fetch(`${this.baseUrl}/tables/lookup?name=${encodeURIComponent(name)}`);
    if (lookup.ok) {
      const body = (await lookup.json()) as { tableId: string };
      return body.tableId;
    }
    if (lookup.status !== 404) {
      throw new Error(`Spine table lookup failed: ${lookup.status} ${lookup.statusText}`);
    }

    const created = await fetch(`${this.baseUrl}/tables`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, creator }),
    });
    if (created.status === 409) {
      // Lost a race to create this name — someone else's table is active now.
      return this.ensureTable(name, creator);
    }
    if (!created.ok) {
      const bodyText = await created.text().catch(() => "");
      throw new Error(`Spine rejected the table: ${created.status} ${created.statusText} ${bodyText}`.trim());
    }
    const body = (await created.json()) as { tableId: string };
    return body.tableId;
  }

  async takeSeat(tableId: string, playerName: string): Promise<{ seatId: string; seat: number }> {
    const response = await fetch(`${this.baseUrl}/tables/${encodeURIComponent(tableId)}/seats`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ playerName }),
    });
    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      throw new Error(`Spine rejected the seat: ${response.status} ${response.statusText} ${bodyText}`.trim());
    }
    const body = (await response.json()) as { seatId: string; seat: number };
    return { seatId: body.seatId, seat: body.seat };
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
