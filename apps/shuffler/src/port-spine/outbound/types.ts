import { GameCard } from "../../domain-types.js";
import { ZoneHint } from "../../port-tabletop/types.js";

/**
 * Everything the Shuffler knows when it asks for a seat: who is sitting down, at which
 * table, with which deck, and how that seat should look. All Shuffler facts — the
 * resolved image URLs and colours come from `shufflerUrls`/`table-look`, not from here.
 */
export interface JoinTableRequest {
  gameId: string;
  tableName: string;
  playerName: string;
  deckName: string;
  /** Where this game lives in the Shuffler, so the table can link back to it. */
  gameUrl: string;
  playmatImageUrl?: string;
  cardBackImageUrl?: string;
  sleeveColor?: string;
  primaryColor?: string;
  secondaryColor?: string;
  commanders?: readonly GameCard[];
}

/** The seat we ended up in, once the table administered our join. */
export interface SeatAtTable {
  tableId: string;
  seatId: string;
  seatNumber: number;
  /** Where a player goes to see this table. */
  tableUrl: string;
}

/** The seat an announcement comes from — enough to say "this happened, and I did it". */
export interface TableSeat {
  tableId: string;
  seatId: string;
  playerName: string;
  /** Minted fresh per page load; lets the table tell one of this player's tabs from another. */
  sessionId?: string;
}

/**
 * The Shuffler's table, in the Shuffler's own words: take a seat, then say what happened
 * to a card. Implementations translate these into whatever the Spine wants to hear.
 */
export interface SpinePort {
  join(request: JoinTableRequest): Promise<SeatAtTable>;
  announceCardPlayed(seat: TableSeat, gameCard: GameCard, zoneHint: ZoneHint, faceDown: boolean): Promise<void>;
  announceCardReturned(seat: TableSeat, gameCard: GameCard): Promise<void>;
  announceCardDiscarded(seat: TableSeat, gameCard: GameCard): Promise<void>;
}
