import { Request, Response } from "express";
import { trace } from "@opentelemetry/api";
import { getOrCreateRoom } from "./rooms.js";
import { slugifyTableName } from "../shared/slugify.js";
import { ensurePlayerArea, pageIdOf } from "./tableFurniture.js";

// ============================================================================
// SCAFFOLDING — the seam the Spine absorbs (same posture as cardArrival.ts).
//
// Future: the Shuffler emits `seat.joined` to the Spine's event log; the
// Tabletop subscribes to the table's public feed. Until then the Shuffler
// POSTs here directly, on Shuffle Up. Delete this endpoint when the feed
// exists. See apps/tabletop/DESIGN.md for the full trigger/geometry spec.
// ============================================================================

interface SeatJoined {
  id: string;
  name: "seat.joined";
  occurredAt: string;
  initiator: { seatId: string; playerName: string };
  playmatImageUrl?: string;
  cardBackImageUrl?: string;
}

function validationError(body: unknown): string | null {
  const b = body as Record<string, any>;
  if (!b || typeof b !== "object") return "body must be a JSON object";
  if (typeof b.id !== "string" || !b.id) return "id (string) is required";
  if (b.name !== "seat.joined") return 'name must be "seat.joined"';
  if (typeof b.initiator?.seatId !== "string" || !b.initiator.seatId) return "initiator.seatId (string) is required";
  if (typeof b.initiator?.playerName !== "string" || !b.initiator.playerName) return "initiator.playerName (string) is required";
  if (b.playmatImageUrl !== undefined && typeof b.playmatImageUrl !== "string") return "playmatImageUrl, if present, must be a string";
  if (b.cardBackImageUrl !== undefined && typeof b.cardBackImageUrl !== "string") return "cardBackImageUrl, if present, must be a string";
  // Same defense in depth as card.played: no decodable secret crosses this boundary.
  if ("gameCardIndex" in b) return "gameCardIndex is forbidden beyond the Shuffler's boundary";
  return null;
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

  const problem = validationError(req.body);
  if (problem) {
    res.status(400).json({ error: problem });
    return;
  }
  const joined = req.body as SeatJoined;

  trace.getActiveSpan()?.setAttributes({
    "event.id": joined.id,
    "table.name": tableName,
    "seat.id": joined.initiator.seatId,
    "player.name": joined.initiator.playerName,
  });

  const entry = getOrCreateRoom(tableName);

  if (entry.seenEventIds.has(joined.id)) {
    trace.getActiveSpan()?.setAttribute("seat_joined.deduped", "event-id");
    res.status(200).json({ ok: true, deduped: true });
    return;
  }
  if (entry.seats.has(joined.initiator.seatId)) {
    entry.seenEventIds.add(joined.id);
    trace.getActiveSpan()?.setAttribute("seat_joined.deduped", "seat-already-seated");
    res.status(200).json({ ok: true, deduped: true });
    return;
  }

  const pageId = pageIdOf(entry);
  await ensurePlayerArea(entry, pageId, joined.initiator.seatId, joined.initiator.playerName, {
    playmatImageUrl: joined.playmatImageUrl,
    cardBackImageUrl: joined.cardBackImageUrl,
  });

  entry.seenEventIds.add(joined.id);
  res.status(201).json({ ok: true });
}
