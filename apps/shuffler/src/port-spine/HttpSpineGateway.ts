import { EventEnvelope } from "../port-tabletop/types.js";
import { SpinePort } from "./types.js";

export class HttpSpineGateway implements SpinePort {
  constructor(private readonly baseUrl: string) {}

  async join(name: string, playerName: string): Promise<{ tableId: string; seatNumber: number }> {
    const response = await fetch(`${this.baseUrl}/join`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, playerName }),
    });
    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      throw new Error(`Spine rejected the join: ${response.status} ${response.statusText} ${bodyText}`.trim());
    }
    const body = (await response.json()) as { tableId: string; seatNumber: number };
    return { tableId: body.tableId, seatNumber: body.seatNumber };
  }

  async sendEvent<Payload>(tableId: string, event: EventEnvelope<Payload>): Promise<void> {
    const url = `${this.baseUrl}/tables/${encodeURIComponent(tableId)}/events`;
    const { traceparent: _traceparent, ...envelopeWithoutTraceparent } = event;
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(envelopeWithoutTraceparent),
    });
    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      throw new Error(`Spine rejected the event: ${response.status} ${response.statusText} ${bodyText}`.trim());
    }
  }
}
