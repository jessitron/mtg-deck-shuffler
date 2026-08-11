import { Request, Response } from "express";
import { trace } from "@opentelemetry/api";
import { createShapeId } from "@tldraw/tlschema";
import { getOrCreateRoom, RoomEntry } from "./rooms.js";
import { slugifyTableName } from "../shared/slugify.js";
import { CARD_W, CARD_H, MAX_SEATS, landPosition, graveyardCardPosition, stackCardPosition } from "./cardLayout.js";
import { ensurePlayerArea, pageIdOf, nextIndex, mtgCardShape } from "./tableFurniture.js";
import { validateIncomingEvent } from "./contractValidation.js";

// ============================================================================
// SCAFFOLDING — the seam the Spine absorbs.
//
// Future: the Shuffler emits `card.played` to the Spine's event log; the
// Tabletop subscribes to the table's public feed instead of receiving this
// direct POST. Delete this endpoint when the feed exists.
// ============================================================================
//
// tabletop-cards-come-and-go ticket 05 (JES-128): the body posted here is the
// real envelope (contracts/envelope.v2.json) carrying a card.played payload
// (contracts/payloads/card.played.v1.json), validated for real via ajv —
// see contractValidation.ts. gameCardIndex may now arrive (let-gamecardindex-out,
// 2026-08-10 — the guard that used to reject it on both schemas is gone): it's
// harmless, since it only decodes to which card in the public decklist this
// is. Nothing here needs to consume it.

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

function instanceAlreadyOnTable(entry: RoomEntry, instanceId: string): boolean {
  return entry.room
    .getCurrentSnapshot()
    .documents.some((d) => (d.state as any).typeName === "shape" && (d.state as any).props?.instanceId === instanceId);
}

/**
 * POST /api/tables/:tableName/cards — a card arrives from the Shuffler.
 * 201: placed. 200 {deduped:true}: already there (retried request or replayed
 * instance — a second arrival of the same instance is a physical no-op).
 */
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
  // Dedup 2: the instance is already on the table (a retried play with a fresh
  // event id). One instance exists once; a second arrival is a physical no-op.
  if (instanceAlreadyOnTable(entry, card.instanceId)) {
    entry.seenEventIds.add(envelope.id);
    trace.getActiveSpan()?.setAttribute("arrival.deduped", "instance");
    res.status(200).json({ ok: true, deduped: true });
    return;
  }

  // A card from an unseated player when every compass slot is taken: refuse.
  // The defensive ensurePlayerArea below would otherwise need a fifth slot,
  // which doesn't exist (cardLayout.ts MAX_SEATS).
  if (!entry.seats.has(seatId) && entry.seats.size >= MAX_SEATS) {
    trace.getActiveSpan()?.setAttribute("arrival.rejected", "table-full");
    res.status(409).json({ error: `table is full: ${MAX_SEATS} seats` });
    return;
  }

  const pageId = pageIdOf(entry);
  // Defensive fallback: normally seat.joined already drew this seat's player
  // area before any card arrives. If a card somehow arrives first, draw a
  // plain area now rather than fail — ensurePlayerArea is idempotent on seatId.
  const playerArea = await ensurePlayerArea(entry, pageId, seatId, playerName);

  let position: { x: number; y: number };
  switch (zoneHint) {
    case "battlefield": // a land, going straight to the playmat
      position = landPosition(playerArea.seatIndex, playerArea.landCount++);
      break;
    case "graveyard":
      position = graveyardCardPosition(playerArea.seatIndex, playerArea.graveyardCount++);
      break;
    case "stack":
      position = stackCardPosition(playerArea.seatIndex, playerArea.stackCount++);
      break;
  }

  const shapeId = createShapeId(`card-${card.instanceId}`);

  await entry.room.updateStore((store) => {
    // No per-instance tldraw asset: the card renders its own <img> straight
    // from frontImageUrl/backImageUrl (mtg-card, tabletop-physics ticket 12),
    // so flip is a pure props.face write later, not an asset swap.
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
        // Ticket 17: the seat's sleeve, baked in at mint time. Legal because
        // sleeve color is a game constant — never changed mid-game. Sleeve is
        // seat data, not payload data: it comes from seat memory, never from
        // the card.played payload.
        sleeveColor: playerArea.sleeveColor ?? null,
        // Ticket 17 (flip-and-face-down): same argument, same seat-data-not-
        // payload-data status. Null for sleeved seats (seat.joined omits it
        // when sleeved — the sleeve always wins) and for seats with none.
        cardBackImageUrl: playerArea.cardBackImageUrl ?? null,
        owner,
        isCommander,
      })
    );
  });

  entry.seenEventIds.add(envelope.id);
  res.status(201).json({ ok: true });
}
