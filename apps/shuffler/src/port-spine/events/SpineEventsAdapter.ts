import { GameCard } from "../../domain-types.js";
import {
  EventEnvelope,
  ZoneHint,
  buildCardPlayedEvent,
  buildCardPlayedFaceDownEvent,
  buildCardReturnedEvent,
  buildCardDiscardedEvent,
} from "../../port-tabletop/types.js";
import { SpineEventsPort, TableSeat } from "./types.js";

/**
 * The translation between the Shuffler's domain and the event envelopes the fleet publishes
 * (`contracts/`): a `GameCard` at a `TableSeat` becomes a `card.played` / `card.returned` /
 * `card.discarded` envelope.
 *
 * Subclasses supply only *delivery* — the real one over HTTP through a gateway, the fake one
 * into memory — so both go through the identical translation and a test watching the fake
 * sees exactly the bytes the Spine would have seen.
 *
 * Step 4 folds the receive half in here too: the subscriber's reconnect/cursor bookkeeping
 * becomes more of this class, over a connection gateway, with no change to what's below.
 */
export abstract class SpineEventsAdapter implements SpineEventsPort {
  /** Append one fully-built event to the table's log. */
  protected abstract deliverEvent(tableId: string, event: EventEnvelope<unknown>): Promise<void>;

  async announceCardPlayed(seat: TableSeat, gameCard: GameCard, zoneHint: ZoneHint, faceDown: boolean): Promise<void> {
    const instanceId = requireCardInstanceId(gameCard);
    const event = faceDown
      ? buildCardPlayedFaceDownEvent(gameCard, instanceId, initiatorFor(seat), seat.seatId, zoneHint, seat.tableId)
      : buildCardPlayedEvent(gameCard, instanceId, initiatorFor(seat), seat.seatId, zoneHint, seat.tableId);
    await this.deliverEvent(seat.tableId, event);
  }

  async announceCardReturned(seat: TableSeat, gameCard: GameCard): Promise<void> {
    const instanceId = requireCardInstanceId(gameCard);
    await this.deliverEvent(seat.tableId, buildCardReturnedEvent(gameCard, instanceId, initiatorFor(seat), seat.seatId, seat.tableId));
  }

  async announceCardDiscarded(seat: TableSeat, gameCard: GameCard): Promise<void> {
    const instanceId = requireCardInstanceId(gameCard);
    await this.deliverEvent(seat.tableId, buildCardDiscardedEvent(gameCard, instanceId, initiatorFor(seat), seat.seatId, seat.tableId));
  }
}

function initiatorFor(seat: TableSeat) {
  return { seatId: seat.seatId, playerName: seat.playerName, sessionId: seat.sessionId };
}

function requireCardInstanceId(gameCard: GameCard): string {
  if (!gameCard.cardInstanceId) {
    throw new Error(`${gameCard.card.name} has no cardInstanceId; cannot announce it to the Spine`);
  }
  return gameCard.cardInstanceId;
}
