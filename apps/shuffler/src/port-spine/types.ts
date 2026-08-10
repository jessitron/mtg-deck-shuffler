import { EventEnvelope } from "../port-tabletop/types.js";

/**
 * The Spine port: look up or create a table by name, and append events to
 * its log. Real client: HttpSpineGateway. Fake: FakeSpineGateway (tests).
 */
export interface SpinePort {
  /** Look up a table by name; create it (as this creator) if none is active yet. Returns the Spine-minted tableId. */
  ensureTable(name: string, creator: string): Promise<string>;
  /** Append an event to this table's log (contracts/envelope.v1.json). */
  sendEvent<Payload>(tableId: string, event: EventEnvelope<Payload>): Promise<void>;
}
