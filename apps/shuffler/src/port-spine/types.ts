import { EventEnvelope } from "../port-tabletop/types.js";

/**
 * The Spine port: join a table by name (creating it if none is active yet),
 * and append events to its log. Real client: HttpSpineGateway. Fake:
 * FakeSpineGateway (tests).
 */
export interface SpinePort {
  /**
   * Join a table by name — creates it (as this player) if none is active
   * yet, then takes the next open seat. Not idempotent: a repeat call mints
   * another seat, same as before this rewrote onto POST /join.
   */
  join(name: string, playerName: string): Promise<{ tableId: string; seatNumber: number }>;
  /**
   * Append an event to this table's log (contracts/envelope.v3.json). Trace
   * context travels in the HTTP `traceparent` header, never the envelope
   * body — the gateway strips `event.traceparent` before serializing.
   */
  sendEvent<Payload>(tableId: string, event: EventEnvelope<Payload>): Promise<void>;
}
