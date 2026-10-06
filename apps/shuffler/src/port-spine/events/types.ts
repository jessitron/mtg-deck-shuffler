import { GameCard } from "../../domain-types.js";

/** The seat an announcement comes from — enough to say "this happened, and I did it". */
export interface TableSeat {
  tableId: string;
  seatId: string;
  playerName: string;
  /** Minted fresh per page load; lets the table tell one of this player's tabs from another. */
  sessionId?: string;
}

/**
 * What the Shuffler did with one event that arrived from its table.
 *
 * `applied: true` means the event has durably landed and never needs to be sent again —
 * whether that meant changing the game or deliberately passing it over (someone else's
 * seat, our own echo, a duplicate, a kind we don't act on). `applied: false` means it did
 * *not* land, so it should arrive again rather than be silently skipped.
 */
export interface EventApplication {
  applied: boolean;
}

/** Called with each event from the table, one at a time, in arrival order. */
export type ApplyTableEvent = (event: unknown) => EventApplication | Promise<EventApplication>;

/** A live delivery of a table's events, until the Shuffler stops caring about that table. */
export interface TableEventStream {
  stop(): void;
}

/**
 * The table's event bus, in the Shuffler's own words — one capability, both directions.
 *
 * Send: the Shuffler says what happened to a card at its seat, and implementations
 * translate that into whatever the Spine wants to hear.
 *
 * Receive: the Shuffler asks for the events at a table and says which ones it applied.
 * Staying connected, catching up on what was missed, and not re-delivering what was
 * already applied are the implementation's problem, not the caller's.
 */
export interface SpineEventsPort {
  announceCardPlayed(seat: TableSeat, gameCard: GameCard, faceDown: boolean): Promise<void>;
  announceCardReturned(seat: TableSeat, gameCard: GameCard): Promise<void>;
  announceCardDiscarded(seat: TableSeat, gameCard: GameCard): Promise<void>;

  /**
   * Deliver me the events at this table, resuming after the last one I applied, and keep
   * delivering until I `stop()`.
   *
   * `appliedThrough` is the table event ordinal this caller has *durably* applied through
   * — read back from the Shuffler's own game log, so a subscription re-created after a
   * full teardown (server restart, all tabs closed and reopened) doesn't start over.
   * Absent for a game that has never applied an event from its table.
   *
   * `applyEvent` is awaited before the next event is delivered, so events are applied in
   * arrival order, and whatever `applyEvent` does happens inside the caller's own control
   * flow — including any span it opens around the work.
   */
  followTable(tableId: string, applyEvent: ApplyTableEvent, appliedThrough?: number): TableEventStream;
}
