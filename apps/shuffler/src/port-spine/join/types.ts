import { GameCard } from "../../domain-types.js";

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

/**
 * Table administration, in the Shuffler's own words: seat this game at a table (creating
 * the table if it doesn't exist yet), and say where it ended up. One capability, one call.
 */
export interface JoinTablePort {
  join(request: JoinTableRequest): Promise<SeatAtTable>;
}
