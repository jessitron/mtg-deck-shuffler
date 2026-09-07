import { GameCard, getCardImageUrl } from "../../domain-types.js";
import {
  EventEnvelope,
  ZoneHint,
  buildCardPlayedEvent,
  buildCardPlayedFaceDownEvent,
  buildCardReturnedEvent,
  buildCardDiscardedEvent,
} from "../../port-tabletop/types.js";
import { SeatJoinedCommander, SeatJoinedPayload, SpineJoinRequest, SpineJoinResult } from "./spineWire.js";
import { JoinTableRequest, SeatAtTable, SpinePort, TableSeat } from "./types.js";

/**
 * All the translation between the Shuffler's domain and the Spine's wire vocabulary,
 * in one place: `GameCard`s become event payloads and seat decoration, a `JoinTableRequest`
 * becomes a `/join` body, and a `/join` body's answer becomes a `SeatAtTable`.
 *
 * Subclasses supply only *delivery* — the real one over HTTP through a gateway, the fake
 * one into memory — so both go through the identical translation and a test watching the
 * fake sees exactly the bytes the Spine would have seen.
 */
export abstract class SpineAdapter implements SpinePort {
  /** Hand the Spine a fully-built `/join` body; answer what it assigned. */
  protected abstract submitJoin(request: SpineJoinRequest): Promise<SpineJoinResult>;

  /** Append one fully-built event to the table's log. */
  protected abstract deliverEvent(tableId: string, event: EventEnvelope<unknown>): Promise<void>;

  async join(request: JoinTableRequest): Promise<SeatAtTable> {
    const result = await this.submitJoin(buildSpineJoinRequest(request));
    return { tableId: result.tableId, seatId: result.seatId, seatNumber: result.seatNumber, tableUrl: result.tableUrl };
  }

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

function buildSpineJoinRequest(request: JoinTableRequest): SpineJoinRequest {
  return {
    gameId: request.gameId,
    name: request.tableName,
    playerName: request.playerName,
    ...buildSeatJoinedPayload(request),
  };
}

function buildSeatJoinedPayload(request: JoinTableRequest): SeatJoinedPayload {
  return {
    deckName: request.deckName,
    playmatImageUrl: request.playmatImageUrl,
    // A sleeve wins over the standard card back: send one or the other, never both.
    cardBackImageUrl: request.sleeveColor ? undefined : request.cardBackImageUrl,
    sleeveColor: request.sleeveColor,
    primaryColor: request.primaryColor,
    secondaryColor: request.secondaryColor,
    gameUrl: request.gameUrl,
    commanders: request.commanders?.length ? request.commanders.map(buildSeatJoinedCommander) : undefined,
  };
}

function buildSeatJoinedCommander(gameCard: GameCard): SeatJoinedCommander {
  if (!gameCard.cardInstanceId) {
    throw new Error(`Commander ${gameCard.card.name} has no cardInstanceId; cannot send it with the join`);
  }
  return {
    card: { scryfallId: gameCard.card.scryfallId, instanceId: gameCard.cardInstanceId },
    cardName: gameCard.card.name,
    frontImageUrl: getCardImageUrl(gameCard.card, "normal", "front"),
    backImageUrl: gameCard.card.twoFaced ? getCardImageUrl(gameCard.card, "normal", "back") : null,
  };
}
