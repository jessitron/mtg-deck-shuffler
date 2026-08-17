import { CardPlayedEvent, TabletopPort } from "./types.js";

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
