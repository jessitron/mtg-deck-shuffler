import { CardPlayedEvent, TabletopPort } from "./types.js";

/**
 * SCAFFOLDING — the seam the Spine absorbs (see types.ts). POSTs card.played
 * directly to the Tabletop's card-arrival API. In the Spine-shaped future this
 * gateway is replaced by one that emits to the Spine's event log; the
 * TabletopPort interface (and its callers) stay put.
 *
 * Uses global fetch (undici), which the OTel auto-instrumentation wraps, so
 * trace context propagates to the Tabletop for free.
 */
export class HttpTabletopGateway implements TabletopPort {
  constructor(private readonly baseUrl: string) {}

  async sendCardToTable(tableName: string, event: CardPlayedEvent): Promise<void> {
    const url = `${this.baseUrl}/api/tables/${encodeURIComponent(tableName)}/cards`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(event),
    });
    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      throw new Error(`Tabletop rejected the card: ${response.status} ${response.statusText} ${bodyText}`.trim());
    }
  }
}
