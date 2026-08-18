import { EventEnvelope } from "../port-tabletop/types.js";
import { GameCard } from "../domain-types.js";
import { getCardImageUrl } from "../types.js";
import { CARD_BACK } from "../view/common/shared-components.js";
import { DEFAULT_PLAYMAT_PATH } from "../table-look.js";

export function shufflerPublicUrl(): string {
  return process.env.SHUFFLER_PUBLIC_URL || "https://mtg.jessitron.honeydemo.io";
}

/** The standard Magic card back (an unsleeved seat's look), as an absolute URL. Omitted from the join request when the seat has a sleeve. */
export function cardBackImageUrl(): string {
  return `${shufflerPublicUrl()}${CARD_BACK}`;
}

export function defaultPlaymatImageUrl(): string {
  return playmatImageUrlFromPath(DEFAULT_PLAYMAT_PATH);
}

export function playmatImageUrlFromPath(path: string): string {
  return `${shufflerPublicUrl()}${path}`;
}

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
