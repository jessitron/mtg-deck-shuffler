import { EventEnvelope } from "../../port-tabletop/types.js";
import { SeatJoinedPayload } from "./seatJoinedPayload.js";

/** Request body for the Spine's `POST /join` — identity plus everything needed to fully decorate the seat, in one call. */
export interface SpineJoinRequest extends SeatJoinedPayload {
  gameId: string;
  name: string;
  playerName: string;
}

export interface SpineJoinResult {
  tableId: string;
  seatId: string;
  seatNumber: number;
  tableUrl: string;
}

export interface SpinePort {
  join(request: SpineJoinRequest): Promise<SpineJoinResult>;
  sendEvent<Payload>(tableId: string, event: EventEnvelope<Payload>): Promise<void>;
}
