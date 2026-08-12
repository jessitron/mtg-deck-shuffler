import { randomUUID } from "node:crypto";
import { getCardImageUrl } from "../types.js";
import { GameCard } from "../domain-types.js";
import { CARD_BACK } from "../view/common/shared-components.js";
import { DEFAULT_PLAYMAT_PATH } from "../table-look.js";
import { currentTraceparent } from "./traceparent.js";


export const CARD_PLAYED_EVENT_NAME = "card.played" as const;

export type ZoneHint = "stack" | "battlefield" | "graveyard";

export interface Initiator {
  seatId: string;
  playerName: string;
}

export type Significance = "physical" | "domain" | "administrative";

export interface EventEnvelope<Payload> {
  id: string;
  tableId: string;
  name: string;
  occurredAt: string;
  initiator: Initiator;
  occurredIn: "shuffler";
  origin: string;
  significance: Significance;
  visibility: "public";
  traceparent: string;
  schemaVersion: number;
  payload: Payload;
}

export interface CardPlayedPayload {
  card: {
    scryfallId: string;
    instanceId: string;
  };
  face: "front" | "back";
  zoneHint: ZoneHint;
  frontImageUrl: string;
  backImageUrl: string | null;
  cardName: string;
  owner: string;
  isCommander: boolean;
  gameCardIndex: number;
}

export type CardPlayedEvent = EventEnvelope<CardPlayedPayload>;

export function buildCardPlayedEvent(
  gameCard: GameCard,
  instanceId: string,
  initiator: Initiator,
  zoneHint: ZoneHint,
  tableName: string
): CardPlayedEvent {
  return {
    id: randomUUID(),
    tableId: tableName,
    name: CARD_PLAYED_EVENT_NAME,
    occurredAt: new Date().toISOString(),
    initiator: { seatId: initiator.seatId, playerName: initiator.playerName },
    occurredIn: "shuffler",
    origin: "shuffler.playCardSubmit",
    significance: "domain",
    visibility: "public",
    traceparent: currentTraceparent(),
    schemaVersion: 1,
    payload: {
      card: {
        scryfallId: gameCard.card.scryfallId,
        instanceId,
      },
      face: gameCard.currentFace,
      zoneHint,
      frontImageUrl: getCardImageUrl(gameCard.card, "normal", "front"),
      backImageUrl: gameCard.card.twoFaced ? getCardImageUrl(gameCard.card, "normal", "back") : null,
      cardName: gameCard.card.name,
      owner: initiator.seatId,
      isCommander: gameCard.isCommander,
      gameCardIndex: gameCard.gameCardIndex,
    },
  };
}


export function shufflerPublicUrl(): string {
  return process.env.SHUFFLER_PUBLIC_URL || "https://mtg.jessitron.honeydemo.io";
}

/** The standard Magic card back (an unsleeved seat's look), as an absolute URL. Omitted from seat.joined when the seat has a sleeve. */
export function cardBackImageUrl(): string {
  return `${shufflerPublicUrl()}${CARD_BACK}`;
}

export function defaultPlaymatImageUrl(): string {
  return playmatImageUrlFromPath(DEFAULT_PLAYMAT_PATH);
}

export function playmatImageUrlFromPath(path: string): string {
  return `${shufflerPublicUrl()}${path}`;
}

export const SEAT_JOINED_EVENT_NAME = "seat.joined" as const;

export interface SeatJoinedCommander {
  card: {
    scryfallId: string;
    instanceId: string;
  };
  cardName: string;
  frontImageUrl: string;
  backImageUrl: string | null;
}

export interface SeatJoinedPayload {
  deckName: string;
  playmatImageUrl?: string;
  cardBackImageUrl?: string;
  sleeveColor?: string;
  primaryColor?: string;
  secondaryColor?: string;
  commanders?: SeatJoinedCommander[];
}

function buildSeatJoinedCommander(gameCard: GameCard): SeatJoinedCommander {
  if (!gameCard.cardInstanceId) {
    throw new Error(`Commander ${gameCard.card.name} has no cardInstanceId; cannot send it with seat.joined`);
  }
  return {
    card: { scryfallId: gameCard.card.scryfallId, instanceId: gameCard.cardInstanceId },
    cardName: gameCard.card.name,
    frontImageUrl: getCardImageUrl(gameCard.card, "normal", "front"),
    backImageUrl: gameCard.card.twoFaced ? getCardImageUrl(gameCard.card, "normal", "back") : null,
  };
}

export type SeatJoinedEvent = EventEnvelope<SeatJoinedPayload>;

export function buildSeatJoinedEvent(
  initiator: Initiator,
  deckName: string,
  tableName: string,
  playmatImageUrl?: string,
  cardBackImageUrl?: string,
  sleeveColor?: string,
  commanders?: readonly GameCard[],
  primaryColor?: string,
  secondaryColor?: string
): SeatJoinedEvent {
  return {
    id: randomUUID(),
    tableId: tableName,
    name: SEAT_JOINED_EVENT_NAME,
    occurredAt: new Date().toISOString(),
    initiator: { seatId: initiator.seatId, playerName: initiator.playerName },
    occurredIn: "shuffler",
    origin: "shuffler.shuffleUp",
    significance: "administrative",
    visibility: "public",
    traceparent: currentTraceparent(),
    schemaVersion: 1,
    payload: {
      deckName,
      playmatImageUrl,
      cardBackImageUrl: sleeveColor ? undefined : cardBackImageUrl,
      sleeveColor,
      primaryColor,
      secondaryColor,
      commanders: commanders?.length ? commanders.map(buildSeatJoinedCommander) : undefined,
    },
  };
}

export interface TabletopPort {
  sendCardToTable(tableName: string, event: CardPlayedEvent): Promise<void>;
  sendSeatJoined(tableName: string, event: SeatJoinedEvent): Promise<void>;
}
