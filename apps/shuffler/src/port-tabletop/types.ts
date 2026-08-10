import { randomUUID } from "node:crypto";
import { getCardImageUrl } from "../types.js";
import { GameCard } from "../domain-types.js";
import { CARD_BACK } from "../view/common/shared-components.js";
import { DEFAULT_PLAYMAT_PATH } from "../table-look.js";
import { currentTraceparent } from "./traceparent.js";

// ============================================================================
// SCAFFOLDING — the seam the Spine absorbs.
//
// Today the Shuffler POSTs card.played directly to the Tabletop
// (POST {TABLETOP_URL}/api/tables/:tableName/cards). In the Spine-shaped
// future, the Shuffler emits `card.played` to the Spine's event log, and the
// Tabletop subscribes to the table's public feed. This port is written so
// that swap changes the gateway, not the callers.
// ============================================================================
//
// JES-128 / tabletop-cards-come-and-go ticket 05: the body sent is the real
// envelope (contracts/envelope.v1.json) carrying a card.played payload
// (contracts/payloads/card.played.v1.json), validated for real by the
// Tabletop on receipt. Field-for-field, an EventEnvelope<CardPlayedPayload>:
//
//   {
//     id: string,            // sender-minted GUID, fresh PER ATTEMPT — idempotency key
//     tableId: string,       // pre-Spine: the table name IS the id
//     name: "card.played",
//     occurredAt: string,    // ISO 8601, the Shuffler's clock
//     initiator: {           // WHO played it. Player names are not unique;
//       seatId: string,      //   the seat's short GUID is the identity,
//       playerName: string,  //   the name is display-only.
//     },
//     occurredIn: "shuffler",
//     visibility: "public",
//     traceparent: string,   // W3C trace context — observability only
//     schemaVersion: 1,
//     payload: {
//       card: {
//         scryfallId: string, // definition identity — the exact printing
//         instanceId: string, // instance identity — THIS particular Forest (GUID, minted per game)
//       },
//       face: "front" | "back",           // which face is up on arrival — card state, not identity
//       zoneHint: "stack" | "battlefield" | "graveyard",  // the Shuffler knows land vs nonland; the tabletop stays meaning-free
//       frontImageUrl: string,  // blessed scaffolding convenience (render without a Scryfall lookup)
//       backImageUrl: string | null,  // present whenever card.twoFaced — NOT derived from backImageUris presence
//       cardName: string,     // blessed scaffolding convenience
//     },
//   }
//
// FORBIDDEN: `gameCardIndex` must NEVER cross the Shuffler's boundary. It is
// the card's alphabetical rank in a known decklist — a decodable secret.
// The contract gets the opaque `card.instanceId` instead.
// A unit test (test/port-tabletop/) asserts no payload ever carries an index.
// ============================================================================

export const CARD_PLAYED_EVENT_NAME = "card.played" as const;

export type ZoneHint = "stack" | "battlefield" | "graveyard";

export interface Initiator {
  seatId: string;
  playerName: string;
}

export interface EventEnvelope<Payload> {
  id: string;
  tableId: string;
  name: string;
  occurredAt: string;
  initiator: Initiator;
  occurredIn: "shuffler";
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
}

export type CardPlayedEvent = EventEnvelope<CardPlayedPayload>;

/**
 * Build the card.played envelope from a GameCard, extracting ONLY the fields
 * the contract allows into its payload. This is the single place a GameCard
 * is serialized for the table — keep it that way, so the no-index guarantee
 * has one door to guard.
 *
 * `instanceId` is passed explicitly (it lives on the GameCard as the optional
 * `cardInstanceId`; callers must have minted it before sending). `tableName`
 * becomes the envelope's `tableId` (pre-Spine, the table name IS the id).
 */
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
    },
  };
}

// ============================================================================
// JES-140: `seat.joined` — sent once, at Shuffle Up (POST /start-game), so the
// Tabletop can draw the seat's whole player area (playmat, library,
// graveyard, exile, name label) before any card is played. Same real-envelope
// posture as card.played (ticket 05); see apps/tabletop/DESIGN.md.
//
//   {
//     id: string,            // sender-minted GUID, fresh PER ATTEMPT
//     tableId: string,       // pre-Spine: the table name IS the id
//     name: "seat.joined",
//     occurredAt: string,    // ISO 8601, the Shuffler's clock
//     initiator: { seatId, playerName },
//     occurredIn: "shuffler",
//     visibility: "public",
//     traceparent: string,   // W3C trace context — observability only
//     schemaVersion: 1,
//     payload: {
//       deckName: string,           // the deck's display name, for the seat's name label
//       playmatImageUrl?: string,   // absolute URL; opaque to the Tabletop
//       cardBackImageUrl?: string,  // absolute URL to the standard card back; omitted when a sleeve is defined
//       sleeveColor?: string,       // #rrggbb — the seat's sleeve (ticket 17); wins over cardBackImageUrl
//     },
//   }
//
// Contract proper: contracts/payloads/seat.joined.v1.json.
//
// FORBIDDEN: `gameCardIndex` must NEVER cross the Shuffler's boundary (same
// rule as card.played).
// ============================================================================

/**
 * The Shuffler's own public URL — so the Tabletop can hotlink the standard
 * card-back image as an absolute URL, the same posture as Scryfall card art.
 * Mirrors active-game-page.ts's tabletopPublicUrl() for the reverse direction.
 */
export function shufflerPublicUrl(): string {
  return process.env.SHUFFLER_PUBLIC_URL || "https://mtg.jessitron.honeydemo.io";
}

/** The standard Magic card back (an unsleeved seat's look), as an absolute URL. Omitted from seat.joined when the seat has a sleeve. */
export function cardBackImageUrl(): string {
  return `${shufflerPublicUrl()}${CARD_BACK}`;
}

/**
 * The playmat an unpicked seat gets (ticket 16 added the prep-screen picker),
 * as an absolute URL. Same image the bare `.playmat` rule paints by default
 * (public/playmat.css).
 */
export function defaultPlaymatImageUrl(): string {
  return playmatImageUrlFromPath(DEFAULT_PLAYMAT_PATH);
}

/**
 * A picked playmat travels as an absolute URL (opaque to the Tabletop); the
 * prep stores only the relative path — see PersistedGamePrep.playmatImagePath.
 */
export function playmatImageUrlFromPath(path: string): string {
  return `${shufflerPublicUrl()}${path}`;
}

export const SEAT_JOINED_EVENT_NAME = "seat.joined" as const;

/**
 * A commander riding seat.joined: an ordinary GameCard in the CommandZone
 * location, always face up (no `face` field — flipping it there afterward is
 * table-local, per cards-come-and-go ticket 02).
 */
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
  commanders?: SeatJoinedCommander[];
}

/**
 * Build one commander's seat.joined entry from its GameCard. `instanceId`
 * must already be minted (GameState.newGame mints cardInstanceId for every
 * commander) — same non-negotiable as buildCardPlayedEvent.
 */
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

/**
 * Build the seat.joined envelope. The playmat is the prep-screen pick (ticket
 * 16) or the default; the card back is the standard Magic card back for an
 * unsleeved seat, and omitted for a sleeved one — sleeveColor wins if both
 * ever arrive (contract: seat.joined.v1). `tableName` becomes the envelope's
 * `tableId` (pre-Spine, the table name IS the id). `commanders` (0-2) rides
 * along in the payload so the Tabletop can place them in the Command Zone
 * before any card is played (ticket 18).
 */
export function buildSeatJoinedEvent(
  initiator: Initiator,
  deckName: string,
  tableName: string,
  playmatImageUrl?: string,
  cardBackImageUrl?: string,
  sleeveColor?: string,
  commanders?: readonly GameCard[]
): SeatJoinedEvent {
  return {
    id: randomUUID(),
    tableId: tableName,
    name: SEAT_JOINED_EVENT_NAME,
    occurredAt: new Date().toISOString(),
    initiator: { seatId: initiator.seatId, playerName: initiator.playerName },
    occurredIn: "shuffler",
    visibility: "public",
    traceparent: currentTraceparent(),
    schemaVersion: 1,
    payload: {
      deckName,
      playmatImageUrl,
      cardBackImageUrl: sleeveColor ? undefined : cardBackImageUrl,
      sleeveColor,
      commanders: commanders?.length ? commanders.map(buildSeatJoinedCommander) : undefined,
    },
  };
}

/**
 * The Tabletop port: send a played card to a table, or announce a seat
 * joining it. `sendCardToTable` throws on failure — /play-card is
 * send-then-commit, so a throw means the play is blocked and the card stays
 * in hand. `sendSeatJoined` is best-effort at the call site (Shuffle Up must
 * not fail because the Tabletop is unreachable) — see sendToTable.ts.
 */
export interface TabletopPort {
  sendCardToTable(tableName: string, event: CardPlayedEvent): Promise<void>;
  sendSeatJoined(tableName: string, event: SeatJoinedEvent): Promise<void>;
}
