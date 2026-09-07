import { SpineGatewayError } from "../SpineGatewayError.js";
import { SpineJoinRequest, SpineJoinResult } from "./spineWire.js";

/**
 * The one Spine call table administration makes, narrowed to plain data. Nothing here
 * knows what a `GameCard` is; `SpineJoinAdapter` is where the Shuffler's domain stops.
 */
export interface SpineJoinGateway {
  join(request: SpineJoinRequest): Promise<SpineJoinResult>;
}

/**
 * Real Spine client (services/spine) for table administration: joins a table by name
 * (creating it if none is active yet), assigns a seat, and fully decorates it via a
 * single `POST /join`. Uses global fetch (undici), which OTel auto-instrumentation
 * wraps, so trace context propagates to the Spine for free as a `traceparent` header.
 */
export class HttpSpineJoinGateway implements SpineJoinGateway {
  constructor(private readonly baseUrl: string) {}

  async join(request: SpineJoinRequest): Promise<SpineJoinResult> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/join`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      });
    } catch (error) {
      // Couldn't reach the Spine at all — DNS, refused connection, socket reset.
      throw new SpineGatewayError(error instanceof Error ? error.message : String(error), { cause: error });
    }
    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      throw new SpineGatewayError(`Spine rejected the join: ${response.status} ${response.statusText} ${bodyText}`.trim());
    }
    const body = (await response.json()) as SpineJoinResult;
    return { tableId: body.tableId, seatId: body.seatId, seatNumber: body.seatNumber, tableUrl: body.tableUrl };
  }
}
