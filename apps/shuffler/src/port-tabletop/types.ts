import { randomUUID } from "node:crypto";
import { getCardImageUrl } from "../types.js";
import { GameCard } from "../domain-types.js";
import { currentTraceparent } from "./traceparent.js";

export function zoneHintForPlay(gameCard: GameCard): ZoneHint {
  return gameCard.card.cardTypes.includes("Land") ? "battlefield" : "stack";
}


export const CARD_PLAYED_EVENT_NAME = "card.played" as const;

export type ZoneHint = "stack" | "battlefield" | "graveyard";

export interface Initiator {
  seatId: string;
  playerName: string;
  sessionId?: string;
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
  owner: string,
  zoneHint: ZoneHint,
  tableName: string
): CardPlayedEvent {
  return {
    id: randomUUID(),
    tableId: tableName,
    name: CARD_PLAYED_EVENT_NAME,
    occurredAt: new Date().toISOString(),
    initiator: { seatId: initiator.seatId, playerName: initiator.playerName, sessionId: initiator.sessionId },
    occurredIn: "shuffler",
    origin: "shuffler.playCardSubmit",
    significance: "domain",
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
      owner,
      isCommander: gameCard.isCommander,
      gameCardIndex: gameCard.gameCardIndex,
    },
  };
}
