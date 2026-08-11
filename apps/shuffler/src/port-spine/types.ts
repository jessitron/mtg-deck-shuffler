import { EventEnvelope } from "../port-tabletop/types.js";

/**
 * The Spine port: look up or create a table by name, and append events to
 * its log. Real client: HttpSpineGateway. Fake: FakeSpineGateway (tests).
 */
export interface SpinePort {
  /** Look up a table by name; create it (as this creator) if none is active yet. Returns the Spine-minted tableId. */
  ensureTable(name: string, creator: string): Promise<string>;
  /** Take a seat at this table. Not idempotent — the Spine assigns the next open seat number each call. */
  takeSeat(tableId: string, playerName: string): Promise<{ seatId: string; seat: number }>;
  /** Append an event to this table's log (contracts/envelope.v2.json). */
  sendEvent<Payload>(tableId: string, event: EventEnvelope<Payload>): Promise<void>;
}
