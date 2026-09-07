import { GameCard } from "../../domain-types.js";
import { ZoneHint } from "../../port-tabletop/types.js";

/** The seat an announcement comes from — enough to say "this happened, and I did it". */
export interface TableSeat {
  tableId: string;
  seatId: string;
  playerName: string;
  /** Minted fresh per page load; lets the table tell one of this player's tabs from another. */
  sessionId?: string;
}

/**
 * The table's event bus, in the Shuffler's own words — one capability, both directions.
 *
 * The send half is here: the Shuffler says what happened to a card at its seat, and
 * implementations translate that into whatever the Spine wants to hear.
 *
 * The receive half — "give me the events at this table, from where I left off" — still
 * lives in `SpineConnectionPort` + `spineSubscriber` in this directory, and folds in here
 * (step 4 of `.scratch/port-spine-layering/plan.md`). It joins as one more method on this
 * interface; nothing about the send half has to move to make room for it.
 */
export interface SpineEventsPort {
  announceCardPlayed(seat: TableSeat, gameCard: GameCard, zoneHint: ZoneHint, faceDown: boolean): Promise<void>;
  announceCardReturned(seat: TableSeat, gameCard: GameCard): Promise<void>;
  announceCardDiscarded(seat: TableSeat, gameCard: GameCard): Promise<void>;
}
