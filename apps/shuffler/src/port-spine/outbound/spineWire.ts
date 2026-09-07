/**
 * The Spine's own vocabulary — the plain-old-data bodies that cross the wire on
 * `POST /join`. Nothing here is Shuffler domain language; `SpineAdapter` is the only
 * thing that speaks both.
 */

export interface SeatJoinedCommander {
  card: {
    scryfallId: string;
    instanceId: string;
  };
  cardName: string;
  frontImageUrl: string;
  backImageUrl: string | null;
}

/** The seat-decoration facts the Spine's `/join` mints into `seat.joined` — everything about how this seat should look. */
export interface SeatJoinedPayload {
  deckName: string;
  playmatImageUrl?: string;
  cardBackImageUrl?: string;
  sleeveColor?: string;
  primaryColor?: string;
  secondaryColor?: string;
  commanders?: SeatJoinedCommander[];
  gameUrl?: string;
}

/** Request body for the Spine's `POST /join` — identity plus everything needed to fully decorate the seat, in one call. */
export interface SpineJoinRequest extends SeatJoinedPayload {
  gameId: string;
  name: string;
  playerName: string;
}

/** Response body of the Spine's `POST /join`. */
export interface SpineJoinResult {
  tableId: string;
  seatId: string;
  seatNumber: number;
  tableUrl: string;
}
