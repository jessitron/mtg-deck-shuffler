import { randomUUID } from "node:crypto";
import { GameCard, getCardImageUrl } from "../domain-types.js";
import { currentTraceparent } from "./traceparent.js";

export const CARD_PLAYED_EVENT_NAME = "card.played" as const;

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
  frontImageUrl: string;
  backImageUrl: string | null;
  cardName: string;
  owner: string;
  isCommander: boolean;
  gameCardIndex: number;
}

export type CardPlayedFaceDownEvent = EventEnvelope<CardPlayedFaceDownPayload>;

export const CARD_RETURNED_EVENT_NAME = "card.returned" as const;

export interface CardReturnedPayload {
  card: {
    scryfallId: string;
    instanceId: string;
  };
  gameCardIndex: number;
  seat: string;
}

export type CardReturnedEvent = EventEnvelope<CardReturnedPayload>;

/** Any transition out of the Shuffler's own Table location — Return button, put-in-hand/top/bottom. */
export function buildCardReturnedEvent(gameCard: GameCard, instanceId: string, initiator: Initiator, seat: string, tableName: string): CardReturnedEvent {
  return {
    id: randomUUID(),
    tableId: tableName,
    name: CARD_RETURNED_EVENT_NAME,
    occurredAt: new Date().toISOString(),
    initiator: { seatId: initiator.seatId, playerName: initiator.playerName, sessionId: initiator.sessionId },
    occurredIn: "shuffler",
    origin: "shuffler.returnCardSubmit",
    significance: "domain",
    traceparent: currentTraceparent(),
    schemaVersion: 1,
    payload: {
      card: {
        scryfallId: gameCard.card.scryfallId,
        instanceId,
      },
      gameCardIndex: gameCard.gameCardIndex,
      seat,
    },
  };
}

export const CARD_DISCARDED_EVENT_NAME = "card.discarded" as const;

// card.played shape (graveyard *is* this event's meaning — two-faced-cards watch
// point 19), keeping face/frontImageUrl/backImageUrl/cardName/owner/isCommander/gameCardIndex
// since the Tabletop needs the same facts to mint a graveyard card shape as a played one.
export interface CardDiscardedPayload {
  card: {
    scryfallId: string;
    instanceId: string;
  };
  face: "front" | "back";
  frontImageUrl: string;
  backImageUrl: string | null;
  cardName: string;
  owner: string;
  isCommander: boolean;
  gameCardIndex: number;
}

export type CardDiscardedEvent = EventEnvelope<CardDiscardedPayload>;

export function buildCardDiscardedEvent(gameCard: GameCard, instanceId: string, initiator: Initiator, owner: string, tableName: string): CardDiscardedEvent {
  return {
    id: randomUUID(),
    tableId: tableName,
    name: CARD_DISCARDED_EVENT_NAME,
    occurredAt: new Date().toISOString(),
    initiator: { seatId: initiator.seatId, playerName: initiator.playerName, sessionId: initiator.sessionId },
    occurredIn: "shuffler",
    origin: "shuffler.discardCardSubmit",
    significance: "domain",
    traceparent: currentTraceparent(),
    schemaVersion: 1,
    payload: {
      card: {
        scryfallId: gameCard.card.scryfallId,
        instanceId,
      },
      ...cardFaceFields(gameCard),
      cardName: gameCard.card.name,
      owner,
      isCommander: gameCard.isCommander,
      gameCardIndex: gameCard.gameCardIndex,
    },
  };
}

export function buildCardPlayedFaceDownEvent(
  gameCard: GameCard,
  instanceId: string,
  initiator: Initiator,
  owner: string,
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
      cardName: gameCard.card.name,
      owner,
      isCommander: gameCard.isCommander,
      gameCardIndex: gameCard.gameCardIndex,
    },
  };
}
