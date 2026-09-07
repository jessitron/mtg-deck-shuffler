import { GameCard } from "../../domain-types.js";
import { getCardImageUrl } from "../../types.js";

export interface SeatJoinedCommander {
  card: {
    scryfallId: string;
    instanceId: string;
  };
  cardName: string;
  frontImageUrl: string;
  backImageUrl: string | null;
}

export function buildSeatJoinedCommander(gameCard: GameCard): SeatJoinedCommander {
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

export function buildSeatJoinedPayload(
  deckName: string,
  gameUrl: string,
  playmatImageUrl?: string,
  cardBackImageUrl?: string,
  sleeveColor?: string,
  commanders?: readonly GameCard[],
  primaryColor?: string,
  secondaryColor?: string
): SeatJoinedPayload {
  return {
    deckName,
    playmatImageUrl,
    cardBackImageUrl: sleeveColor ? undefined : cardBackImageUrl,
    sleeveColor,
    primaryColor,
    secondaryColor,
    gameUrl,
    commanders: commanders?.length ? commanders.map(buildSeatJoinedCommander) : undefined,
  };
}
