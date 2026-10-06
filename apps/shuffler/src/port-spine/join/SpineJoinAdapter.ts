import { GameCard, getCardImageUrl } from "../../domain-types.js";
import { SeatJoinedCommander, SeatJoinedPayload, SpineJoinRequest, SpineJoinResult } from "./spineWire.js";
import { JoinTablePort, JoinTableRequest, SeatAtTable } from "./types.js";

/**
 * The translation between the Shuffler's domain and the Spine's `/join` vocabulary, in one
 * place: a `JoinTableRequest` becomes a `/join` body (commander `GameCard`s and all), and
 * the answer becomes a `SeatAtTable`.
 *
 * Subclasses supply only *submission* — the real one over HTTP through a gateway, the fake
 * one into memory — so both go through the identical translation and a test watching the
 * fake sees exactly the bytes the Spine would have seen.
 */
export abstract class SpineJoinAdapter implements JoinTablePort {
  /** Hand the Spine a fully-built `/join` body; answer what it assigned. */
  protected abstract submitJoin(request: SpineJoinRequest): Promise<SpineJoinResult>;

  async join(request: JoinTableRequest): Promise<SeatAtTable> {
    const result = await this.submitJoin(buildSpineJoinRequest(request));
    return { tableId: result.tableId, seatId: result.seatId, seatNumber: result.seatNumber, tableUrl: result.tableUrl };
  }
}

function buildSpineJoinRequest(request: JoinTableRequest): SpineJoinRequest {
  return {
    joinRequestId: request.gameId,
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
    card: { cardDefinitionId: gameCard.card.cardDefinitionId, instanceId: gameCard.cardInstanceId },
    cardName: gameCard.card.name,
    frontImageUrl: getCardImageUrl(gameCard.card, "normal", "front"),
    backImageUrl: gameCard.card.twoFaced ? getCardImageUrl(gameCard.card, "normal", "back") : null,
  };
}
