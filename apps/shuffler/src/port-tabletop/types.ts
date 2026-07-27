import { randomUUID } from "node:crypto";
import { getCardImageUrl } from "../types.js";
import { GameCard } from "../port-persist-state/types.js";

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
// JES-128: The frozen card-arrival payload (F0) — an envelope-lite subset of
// the event contract (notes/DESIGN-event-contract-v0.md). Field-for-field:
//
//   {
//     id: string,           // sender-minted GUID, fresh PER ATTEMPT — idempotency key
//     name: "card.played",
//     occurredAt: string,   // ISO 8601, the Shuffler's clock
//     initiator: {          // WHO played it. Player names are not unique;
//       seatId: string,     //   the seat's short GUID is the identity,
//       playerName: string, //   the name is display-only.
//     },
//     card: {
//       scryfallId: string, // definition identity — the exact printing
//       instanceId: string, // instance identity — THIS particular Forest (GUID, minted per game)
//     },
//     face: "front" | "back",           // face is card state, not identity — but it matters at play time
//     zoneHint: "stack" | "battlefield" | "graveyard",  // the Shuffler knows land vs nonland; the tabletop stays meaning-free
//     imageUrl: string,     // blessed scaffolding convenience (render without a Scryfall lookup) — NOT contract
//     cardName: string,     // blessed scaffolding convenience — NOT contract
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

export interface CardPlayedEvent {
  id: string;
  name: typeof CARD_PLAYED_EVENT_NAME;
  occurredAt: string;
  initiator: Initiator;
  card: {
    scryfallId: string;
    instanceId: string;
  };
  face: "front" | "back";
  zoneHint: ZoneHint;
  imageUrl: string;
  cardName: string;
}

/**
 * Build the card.played payload from a GameCard, extracting ONLY the fields the
 * contract allows. This is the single place a GameCard is serialized for the
 * table — keep it that way, so the no-index guarantee has one door to guard.
 *
 * `instanceId` is passed explicitly (it lives on the GameCard as the optional
 * `cardInstanceId`; callers must have minted it before sending).
 */
export function buildCardPlayedEvent(gameCard: GameCard, instanceId: string, initiator: Initiator, zoneHint: ZoneHint): CardPlayedEvent {
  return {
    id: randomUUID(),
    name: CARD_PLAYED_EVENT_NAME,
    occurredAt: new Date().toISOString(),
    initiator: { seatId: initiator.seatId, playerName: initiator.playerName },
    card: {
      scryfallId: gameCard.card.scryfallId,
      instanceId,
    },
    face: gameCard.currentFace,
    zoneHint,
    imageUrl: getCardImageUrl(gameCard.card, "normal", gameCard.currentFace),
    cardName: gameCard.card.name,
  };
}

/**
 * The Tabletop port: send a played card to a table. Throws on failure —
 * /play-card is send-then-commit, so a throw means the play is blocked and the
 * card stays in hand.
 */
export interface TabletopPort {
  sendCardToTable(tableName: string, event: CardPlayedEvent): Promise<void>;
}
