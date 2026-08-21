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

// Shared by buildCardPlayedEvent and buildCardPlayedFaceDownEvent: the face/image facts
// are identical between a revealed play and a concealed one (concealment never touches
// which face was chosen underneath) — keep that computation in one place even though the
// two event kinds themselves stay deliberately separate.
function cardFaceFields(gameCard: GameCard): Pick<CardPlayedPayload, "face" | "frontImageUrl" | "backImageUrl"> {
  return {
    face: gameCard.currentFace,
    frontImageUrl: getCardImageUrl(gameCard.card, "normal", "front"),
    backImageUrl: gameCard.card.twoFaced ? getCardImageUrl(gameCard.card, "normal", "back") : null,
  };
}

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
      ...cardFaceFields(gameCard),
      zoneHint,
      cardName: gameCard.card.name,
      owner,
      isCommander: gameCard.isCommander,
      gameCardIndex: gameCard.gameCardIndex,
    },
  };
}

export const CARD_PLAYED_FACE_DOWN_EVENT_NAME = "card.played-face-down" as const;

// Deliberate duplicate of CardPlayedPayload (per spec.md's Implementation Decisions):
// the shape is identical today, but the two kinds are meant to be free to diverge later
// without a retroactive schema version bump.
export interface CardPlayedFaceDownPayload {
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

export type CardPlayedFaceDownEvent = EventEnvelope<CardPlayedFaceDownPayload>;

export function buildCardPlayedFaceDownEvent(
  gameCard: GameCard,
  instanceId: string,
  initiator: Initiator,
  owner: string,
  zoneHint: ZoneHint,
  tableName: string
): CardPlayedFaceDownEvent {
  return {
    id: randomUUID(),
    tableId: tableName,
    name: CARD_PLAYED_FACE_DOWN_EVENT_NAME,
    occurredAt: new Date().toISOString(),
    initiator: { seatId: initiator.seatId, playerName: initiator.playerName, sessionId: initiator.sessionId },
    occurredIn: "shuffler",
    origin: "shuffler.playCardFaceDownSubmit",
    significance: "domain",
    traceparent: currentTraceparent(),
    schemaVersion: 1,
    payload: {
      card: {
        scryfallId: gameCard.card.scryfallId,
        instanceId,
      },
      ...cardFaceFields(gameCard),
      zoneHint,
      cardName: gameCard.card.name,
      owner,
      isCommander: gameCard.isCommander,
      gameCardIndex: gameCard.gameCardIndex,
    },
  };
}
