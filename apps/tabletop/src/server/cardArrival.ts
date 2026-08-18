import { Request, Response } from "express";
import { trace, SpanKind } from "@opentelemetry/api";
import { createShapeId } from "@tldraw/tlschema";
import { getOrCreateRoom } from "./rooms.js";
import { slugifyTableName, tableNameFromSlug } from "../shared/slugify.js";
import { CARD_W, CARD_H, MAX_SEATS, graveyardCardPosition, stackCardPosition } from "./cardLayout.js";
import { ensurePlayerArea, pageIdOf, nextIndex, mtgCardShape } from "./tableFurniture.js";
import { validateIncomingEvent } from "./contractValidation.js";

const tracer = trace.getTracer("mtg-tabletop");


type ZoneHint = "stack" | "battlefield" | "graveyard";

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
  | { status: "rejected"; reason: "table-full" };

/**
 * The core of card arrival — validation, dedup, ensurePlayerArea self-heal, and
 * placement — shared by the HTTP route (`handleCardArrival`) and the Spine SSE
 * dispatcher (`spineEventDispatch.ts`), which each map the outcome to their own
 * transport (HTTP response vs. a log).
 */
export async function applyCardArrival(tableName: string, body: unknown): Promise<CardArrivalOutcome> {
  const result = validateIncomingEvent<CardPlayedPayload>(body, "card.played");
  if (!result.ok) {
    return { status: "invalid", error: result.error };
  }
  const { envelope } = result;
  if (slugifyTableName(envelope.tableId) !== tableName) {
    return { status: "invalid", error: "envelope tableId does not match the table being posted to" };
  }
  const seatId = envelope.initiator.seatId;
  if (!seatId) {
    return { status: "invalid", error: "initiator.seatId is required for card.played" };
  }
  const { playerName } = envelope.initiator;
  const { card, face, zoneHint, frontImageUrl, backImageUrl, cardName, owner, isCommander } = envelope.payload;

  trace.getActiveSpan()?.setAttributes({
    "card.instance_id": card.instanceId,
    "card.scryfall_id": card.scryfallId,
    "card.name": cardName,
    "event.id": envelope.id,
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

  if (!entry.seats.has(seatId) && entry.seats.size >= MAX_SEATS) {
    trace.getActiveSpan()?.setAttribute("arrival.rejected", "table-full");
    return { status: "rejected", reason: "table-full" };
  }

  const pageId = pageIdOf(entry);

  await tracer.startActiveSpan(
    "place arrived card",
    {
      kind: SpanKind.INTERNAL,
      attributes: {
        "event.id": envelope.id,
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
        const playerArea = await ensurePlayerArea(entry, pageId, seatId, playerName);

        let position: { x: number; y: number };
        switch (zoneHint) {
          case "graveyard":
            position = graveyardCardPosition(playerArea.seatIndex, playerArea.graveyardCount++);
            span.setAttribute("zone.graveyard_count", playerArea.graveyardCount);
            break;
          case "battlefield": // a land — arrives on the Stack with everything else; a human drags it to the playmat
          case "stack":
            position = stackCardPosition(playerArea.seatIndex, playerArea.stackCount++);
            span.setAttribute("zone.stack_count", playerArea.stackCount);
            break;
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
              faceDown: false,
              sleeveColor: playerArea.sleeveColor ?? null,
              cardBackImageUrl: playerArea.cardBackImageUrl ?? null,
              owner,
              isCommander,
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

export async function handleCardArrival(req: Request, res: Response): Promise<void> {
  const tableName = slugifyTableName(req.params.tableName ?? "");
  if (!tableName) {
    res.status(400).json({ error: "table name required" });
    return;
  }

  const outcome = await applyCardArrival(tableName, req.body);
  switch (outcome.status) {
    case "invalid":
      res.status(400).json({ error: outcome.error });
      return;
    case "placed":
      res.status(201).json({ ok: true });
      return;
    case "deduped":
      res.status(200).json({ ok: true, deduped: true });
      return;
    case "rejected":
      res.status(409).json({ error: `table is full: ${MAX_SEATS} seats` });
      return;
  }
}
