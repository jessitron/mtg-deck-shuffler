import { trace, SpanKind, Span } from "@opentelemetry/api";
import { createShapeId } from "@tldraw/tlschema";
import { getOrCreateRoom, RoomEntry, PlayerArea } from "./rooms.js";
import { slugifyTableName, tableNameFromSlug } from "../shared/slugify.js";
import { CARD_W, CARD_H, MAX_SEATS, graveyardCardPosition, stackCardPosition } from "./cardLayout.js";
import { pageIdOf, nextIndex, mtgCardShape } from "./tableFurniture.js";
import { validateIncomingEvent } from "./contractValidation.js";

const tracer = trace.getTracer("mtg-tabletop");


/** Sibling of card.played — identical payload shape, but means "mint this concealed." */
const FACE_DOWN_EVENT_NAME = "card.played-face-down";
const DISCARD_EVENT_NAME = "card.discarded";

function isFaceDownEnvelope(body: unknown): boolean {
  return typeof body === "object" && body !== null && "name" in body && (body as { name: unknown }).name === FACE_DOWN_EVENT_NAME;
}

interface CardArrivalPayloadCommon {
  card: { cardDefinitionId: string; instanceId: string };
  face: "front" | "back";
  frontImageUrl: string;
  backImageUrl: string | null;
  cardName: string;
  owner: string;
  isCommander: boolean;
  gameCardIndex?: number;
}

type CardPlayedPayload = CardArrivalPayloadCommon;

type CardDiscardedPayload = CardArrivalPayloadCommon;

export type CardArrivalOutcome =
  | { status: "invalid"; error: string }
  | { status: "placed" }
  | { status: "deduped"; reason: "event-id" | "instance" }
  | { status: "rejected"; reason: "table-full" | "seat-not-joined" };

/**
 * The shared core of "a card arrives on the table" — validation-independent: dedup, seat
 * checks, and shape placement. Both card.played/-face-down (always the Stack) and
 * card.discarded (always the graveyard) funnel through here once they've resolved a
 * position, so dedup/placement never drifts between the two event kinds.
 */
async function placeArrivedCard(
  tableName: string,
  envelope: { id: string; name: string; initiator: { seatId?: string } },
  payload: CardArrivalPayloadCommon,
  faceDown: boolean,
  resolvePosition: (entry: RoomEntry, playerArea: PlayerArea, span: Span) => { x: number; y: number }
): Promise<CardArrivalOutcome> {
  const seatId = envelope.initiator.seatId;
  if (!seatId) {
    return { status: "invalid", error: `initiator.seatId is required for ${envelope.name}` };
  }
  const { card, face, frontImageUrl, backImageUrl, cardName, owner, isCommander, gameCardIndex } = payload;

  trace.getActiveSpan()?.setAttributes({
    "card.instance_id": card.instanceId,
    "card.definition_id": card.cardDefinitionId,
    "card.name": cardName,
    "event.id": envelope.id,
    "event.name": envelope.name,
    "table.name": tableNameFromSlug(tableName),
    "table.slug": tableName,
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
    // A card arrival for a seat with no player area means seat.joined hasn't landed yet —
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
        "card.definition_id": card.cardDefinitionId,
        "card.name": cardName,
      },
    },
    async (span) => {
      try {
        const position = resolvePosition(entry, playerArea, span);

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
              cardDefinitionId: card.cardDefinitionId,
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

/**
 * card.played / card.played-face-down: validation, dedup, and placement onto the Stack. The
 * only production entry point is the Spine SSE dispatcher (`spineEventDispatch.ts`);
 * `testSeedRoute.ts` calls this directly too, as a test-only HTTP seam for specs that need
 * to seed a card without a live Spine.
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

  return placeArrivedCard(tableName, envelope, envelope.payload, faceDown, (entry, playerArea, span) => {
    // Every played card, lands included, arrives on the Stack; a human drags it to the
    // playmat from there (2026-08-16).
    const stackCount = entry.stackCardCount(envelope.payload.owner);
    span.setAttribute("zone.stack_count", stackCount);
    return stackCardPosition(playerArea.seatIndex, stackCount);
  });
}

/**
 * card.discarded: validation, dedup, and placement onto the graveyard cascade. Discard
 * traffic (discard-from-hand, mill) has its own event kind rather than a card.played with
 * a graveyard hint — routed here by event kind.
 */
export async function applyCardDiscard(tableName: string, body: unknown): Promise<CardArrivalOutcome> {
  const result = validateIncomingEvent<CardDiscardedPayload>(body, DISCARD_EVENT_NAME);
  if (!result.ok) {
    return { status: "invalid", error: result.error };
  }
  const { envelope } = result;
  if (slugifyTableName(envelope.tableId) !== tableName) {
    return { status: "invalid", error: "envelope tableId does not match the table being posted to" };
  }

  return placeArrivedCard(tableName, envelope, envelope.payload, false, (_entry, playerArea, span) => {
    const position = graveyardCardPosition(playerArea.seatIndex, playerArea.graveyardCount++);
    span.setAttribute("zone.graveyard_count", playerArea.graveyardCount);
    return position;
  });
}
