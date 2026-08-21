import { trace, SpanKind } from "@opentelemetry/api";
import { createShapeId } from "@tldraw/tlschema";
import { getOrCreateRoom } from "./rooms.js";
import { slugifyTableName, tableNameFromSlug } from "../shared/slugify.js";
import { CARD_W, CARD_H, MAX_SEATS, graveyardCardPosition, stackCardPosition } from "./cardLayout.js";
import { pageIdOf, nextIndex, mtgCardShape } from "./tableFurniture.js";
import { validateIncomingEvent } from "./contractValidation.js";

const tracer = trace.getTracer("mtg-tabletop");


type ZoneHint = "stack" | "battlefield" | "graveyard";

/** Sibling of card.played — identical payload shape, but means "mint this concealed." */
const FACE_DOWN_EVENT_NAME = "card.played-face-down";

function isFaceDownEnvelope(body: unknown): boolean {
  return typeof body === "object" && body !== null && "name" in body && (body as { name: unknown }).name === FACE_DOWN_EVENT_NAME;
}

interface CardPlayedPayload {
  card: { scryfallId: string; instanceId: string };
  face: "front" | "back";
  zoneHint: ZoneHint;
  frontImageUrl: string;
  backImageUrl: string | null;
  cardName: string;
  owner: string;
  isCommander: boolean;
  gameCardIndex?: number;
}

export type CardArrivalOutcome =
  | { status: "invalid"; error: string }
  | { status: "placed" }
  | { status: "deduped"; reason: "event-id" | "instance" }
  | { status: "rejected"; reason: "table-full" | "seat-not-joined" };

/**
 * The core of card arrival — validation, dedup, and placement. The only production
 * entry point is the Spine SSE dispatcher (`spineEventDispatch.ts`); `testSeedRoute.ts`
 * calls this directly too, as a test-only HTTP seam for specs that need to seed a card
 * without a live Spine.
 */
export async function applyCardArrival(tableName: string, body: unknown): Promise<CardArrivalOutcome> {
  const faceDown = isFaceDownEnvelope(body);
  const result = validateIncomingEvent<CardPlayedPayload>(body, faceDown ? FACE_DOWN_EVENT_NAME : "card.played");
  if (!result.ok) {
    return { status: "invalid", error: result.error };
  }
  const { envelope } = result;
  if (slugifyTableName(envelope.tableId) !== tableName) {
    return { status: "invalid", error: "envelope tableId does not match the table being posted to" };
  }
  const seatId = envelope.initiator.seatId;
  if (!seatId) {
    return { status: "invalid", error: `initiator.seatId is required for ${envelope.name}` };
  }
  const { card, face, zoneHint, frontImageUrl, backImageUrl, cardName, owner, isCommander, gameCardIndex } = envelope.payload;

  trace.getActiveSpan()?.setAttributes({
    "card.instance_id": card.instanceId,
    "card.scryfall_id": card.scryfallId,
    "card.name": cardName,
    "event.id": envelope.id,
    "event.name": envelope.name,
    "table.name": tableNameFromSlug(tableName),
    "table.slug": tableName,
    "zone.hint": zoneHint,
    "seat.id": seatId,
  });

  const entry = getOrCreateRoom(tableName);

  // Dedup 1: a retried request (same event id — worked but failed to ack).
  if (entry.seenEventIds.has(envelope.id)) {
    trace.getActiveSpan()?.setAttribute("arrival.deduped", "event-id");
    return { status: "deduped", reason: "event-id" };
  }
  if (entry.hasInstance(card.instanceId)) {
    entry.seenEventIds.add(envelope.id);
    trace.getActiveSpan()?.setAttribute("arrival.deduped", "instance");
    return { status: "deduped", reason: "instance" };
  }

  if (!entry.seats.has(owner) && entry.seats.size >= MAX_SEATS) {
    trace.getActiveSpan()?.setAttribute("arrival.rejected", "table-full");
    return { status: "rejected", reason: "table-full" };
  }

  const playerArea = entry.seats.get(owner);
  if (!playerArea) {
    // A card.played for a seat with no player area means seat.joined hasn't landed yet —
    // an ordering bug upstream, not something to paper over by minting furniture from
    // whatever scraps this payload happens to carry (no deck name, no sleeve, no playmat).
    trace.getActiveSpan()?.setAttribute("arrival.rejected", "seat-not-joined");
    return { status: "rejected", reason: "seat-not-joined" };
  }

  const pageId = pageIdOf(entry);

  await tracer.startActiveSpan(
    "place arrived card",
    {
      kind: SpanKind.INTERNAL,
      attributes: {
        "event.id": envelope.id,
        "event.name": envelope.name,
        "table.name": tableNameFromSlug(tableName),
        "table.slug": tableName,
        "seat.id": seatId,
        "card.instance_id": card.instanceId,
        "card.scryfall_id": card.scryfallId,
        "card.name": cardName,
        "zone.hint": zoneHint,
      },
    },
    async (span) => {
      try {
        let position: { x: number; y: number };
        switch (zoneHint) {
          case "graveyard":
            position = graveyardCardPosition(playerArea.seatIndex, playerArea.graveyardCount++);
            span.setAttribute("zone.graveyard_count", playerArea.graveyardCount);
            break;
          case "battlefield": // a land — arrives on the Stack with everything else; a human drags it to the playmat
          case "stack": {
            const stackCount = entry.stackCardCount(owner);
            position = stackCardPosition(playerArea.seatIndex, stackCount);
            span.setAttribute("zone.stack_count", stackCount);
            break;
          }
        }

        const shapeId = createShapeId(`card-${card.instanceId}`);

        await entry.room.updateStore((store) => {
          store.put(
            mtgCardShape({
              id: shapeId,
              pageId,
              x: position.x,
              y: position.y,
              w: CARD_W,
              h: CARD_H,
              index: nextIndex(tableName),
              instanceId: card.instanceId,
              scryfallId: card.scryfallId,
              cardName: cardName,
              frontImageUrl: frontImageUrl,
              backImageUrl: backImageUrl,
              face: face,
              faceDown,
              sleeveColor: playerArea.sleeveColor ?? null,
              cardBackImageUrl: playerArea.cardBackImageUrl ?? null,
              owner,
              isCommander,
              gameCardIndex: gameCardIndex ?? null,
            })
          );
        });

        span.setAttribute("zone.position.x", position.x);
        span.setAttribute("zone.position.y", position.y);
      } finally {
        span.end();
      }
    }
  );

  entry.seenEventIds.add(envelope.id);
  return { status: "placed" };
}
