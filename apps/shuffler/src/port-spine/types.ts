import { EventEnvelope } from "../port-tabletop/types.js";

export interface SpinePort {
  join(name: string, playerName: string): Promise<{ tableId: string; seatNumber: number }>;
  sendEvent<Payload>(tableId: string, event: EventEnvelope<Payload>): Promise<void>;
}
