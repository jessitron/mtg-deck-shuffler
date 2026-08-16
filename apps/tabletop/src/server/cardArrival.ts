import { Request, Response } from "express";
import { trace } from "@opentelemetry/api";
import { createShapeId } from "@tldraw/tlschema";
import { getOrCreateRoom } from "./rooms.js";
import { slugifyTableName } from "../shared/slugify.js";
import { CARD_W, CARD_H, MAX_SEATS, graveyardCardPosition, stackCardPosition } from "./cardLayout.js";
import { ensurePlayerArea, pageIdOf, nextIndex, mtgCardShape } from "./tableFurniture.js";
import { validateIncomingEvent } from "./contractValidation.js";


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

export async function handleCardArrival(req: Request, res: Response): Promise<void> {
  const tableName = slugifyTableName(req.params.tableName ?? "");
  if (!tableName) {
    res.status(400).json({ error: "table name required" });
    return;
  }

  const result = validateIncomingEvent<CardPlayedPayload>(req.body, "card.played");
  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }
  const { envelope } = result;
  if (slugifyTableName(envelope.tableId) !== tableName) {
    res.status(400).json({ error: "envelope tableId does not match the table being posted to" });
    return;
  }
  const seatId = envelope.initiator.seatId;
  if (!seatId) {
    res.status(400).json({ error: "initiator.seatId is required for card.played" });
    return;
  }
  const { playerName } = envelope.initiator;
  const { card, face, zoneHint, frontImageUrl, backImageUrl, cardName, owner, isCommander } = envelope.payload;

  trace.getActiveSpan()?.setAttributes({
    "card.instance_id": card.instanceId,
    "card.scryfall_id": card.scryfallId,
    "card.name": cardName,
    "event.id": envelope.id,
    "table.name": tableName,
    "zone.hint": zoneHint,
    "seat.id": seatId,
  });

  const entry = getOrCreateRoom(tableName);

  // Dedup 1: a retried request (same event id — worked but failed to ack).
  if (entry.seenEventIds.has(envelope.id)) {
    trace.getActiveSpan()?.setAttribute("arrival.deduped", "event-id");
    res.status(200).json({ ok: true, deduped: true });
    return;
  }
  if (entry.hasInstance(card.instanceId)) {
    entry.seenEventIds.add(envelope.id);
    trace.getActiveSpan()?.setAttribute("arrival.deduped", "instance");
    res.status(200).json({ ok: true, deduped: true });
    return;
  }

  if (!entry.seats.has(seatId) && entry.seats.size >= MAX_SEATS) {
    trace.getActiveSpan()?.setAttribute("arrival.rejected", "table-full");
    res.status(409).json({ error: `table is full: ${MAX_SEATS} seats` });
    return;
  }

  const pageId = pageIdOf(entry);
  const playerArea = await ensurePlayerArea(entry, pageId, seatId, playerName);

  let position: { x: number; y: number };
  switch (zoneHint) {
    case "graveyard":
      position = graveyardCardPosition(playerArea.seatIndex, playerArea.graveyardCount++);
      break;
    case "battlefield": // a land — arrives on the Stack with everything else; a human drags it to the playmat
    case "stack":
      position = stackCardPosition(playerArea.seatIndex, playerArea.stackCount++);
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

  entry.seenEventIds.add(envelope.id);
  res.status(201).json({ ok: true });
}
