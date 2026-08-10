import { Request, Response } from "express";
import { trace } from "@opentelemetry/api";
import { getOrCreateRoom } from "./rooms.js";
import { slugifyTableName } from "../shared/slugify.js";
import { ensurePlayerArea, pageIdOf } from "./tableFurniture.js";
import { MAX_SEATS } from "./cardLayout.js";
import { validateIncomingEvent } from "./contractValidation.js";

// ============================================================================
// SCAFFOLDING — the seam the Spine absorbs (same posture as cardArrival.ts).
//
// Future: the Shuffler emits `seat.joined` to the Spine's event log; the
// Tabletop subscribes to the table's public feed instead of receiving this
// direct POST. Delete this endpoint when the feed exists. See
// apps/tabletop/DESIGN.md for the full trigger/geometry spec.
// ============================================================================
//
// tabletop-cards-come-and-go ticket 05: the body posted here is the real
// envelope (contracts/envelope.v1.json) carrying a seat.joined payload
// (contracts/payloads/seat.joined.v1.json), validated for real via ajv — see
// contractValidation.ts. Who joined (seatId, playerName) lives on the
// envelope's initiator; deckName is required, playmatImageUrl/
// cardBackImageUrl/sleeveColor are optional (sleeveColor wins when both it
// and cardBackImageUrl arrive).

interface SeatJoinedPayload {
  deckName: string;
  playmatImageUrl?: string;
  cardBackImageUrl?: string;
  sleeveColor?: string;
}

/**
 * POST /api/tables/:tableName/events — a seat joins the table (Shuffle Up).
 * 201: player area drawn. 200 {deduped:true}: already seated — a second
 * seat.joined for a seat is a physical no-op (DESIGN.md).
 */
export async function handleSeatJoined(req: Request, res: Response): Promise<void> {
  const tableName = slugifyTableName(req.params.tableName ?? "");
  if (!tableName) {
    res.status(400).json({ error: "table name required" });
    return;
  }

  const result = validateIncomingEvent<SeatJoinedPayload>(req.body, "seat.joined");
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
    res.status(400).json({ error: "initiator.seatId is required for seat.joined" });
    return;
  }
  const { playerName } = envelope.initiator;
  const { deckName, playmatImageUrl, cardBackImageUrl, sleeveColor } = envelope.payload;

  trace.getActiveSpan()?.setAttributes({
    "event.id": envelope.id,
    "table.name": tableName,
    "seat.id": seatId,
    "player.name": playerName,
  });

  const entry = getOrCreateRoom(tableName);

  if (entry.seenEventIds.has(envelope.id)) {
    trace.getActiveSpan()?.setAttribute("seat_joined.deduped", "event-id");
    res.status(200).json({ ok: true, deduped: true });
    return;
  }
  if (entry.seats.has(seatId)) {
    entry.seenEventIds.add(envelope.id);
    trace.getActiveSpan()?.setAttribute("seat_joined.deduped", "seat-already-seated");
    res.status(200).json({ ok: true, deduped: true });
    return;
  }

  // Every compass slot is taken: refuse loudly. A fifth area would land on
  // an existing one, silently breaking zone-AABB disjointness (cardLayout.ts).
  if (entry.seats.size >= MAX_SEATS) {
    trace.getActiveSpan()?.setAttribute("seat_joined.rejected", "table-full");
    res.status(409).json({ error: `table is full: ${MAX_SEATS} seats` });
    return;
  }

  const pageId = pageIdOf(entry);
  await ensurePlayerArea(entry, pageId, seatId, playerName, {
    deckName,
    playmatImageUrl,
    cardBackImageUrl,
    sleeveColor,
  });

  entry.seenEventIds.add(envelope.id);
  res.status(201).json({ ok: true });
}
