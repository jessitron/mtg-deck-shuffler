import { Request, Response } from "express";
import { trace } from "@opentelemetry/api";
import { getOrCreateRoom } from "./rooms.js";
import { slugifyTableName, tableNameFromSlug } from "../shared/slugify.js";
import { sendCardReturnedToSpineBestEffort } from "./sendCardReturned.js";

interface CardReturnedRequestBody {
  seatId?: string;
  scryfallId?: string;
  gameCardIndex?: number;
  fromZone?: string;
}

/**
 * The library-portal swallow's send leg (ticket 12): the client has already decided to
 * swallow a card and needs a 2xx before it commits the shape's deletion (send-then-commit).
 * The client only knows the card's own props (`owner`, `scryfallId`, `gameCardIndex`) — it
 * has no notion of its own player identity, matching the rest of this ship's shared-canvas
 * design — so `seatId` here is the card's owner, and `playerName`/the Spine's real
 * `tableId` are resolved server-side from the room registry, the same lookup
 * `handleSeatJoined` already does.
 */
export async function handleCardReturned(req: Request, res: Response): Promise<void> {
  const tableName = slugifyTableName(req.params.tableName ?? "");
  if (!tableName) {
    res.status(400).json({ error: "table name required" });
    return;
  }

  const body = req.body as CardReturnedRequestBody;
  const { seatId, scryfallId, gameCardIndex, fromZone } = body;
  if (!seatId || !scryfallId || typeof gameCardIndex !== "number") {
    res.status(400).json({ error: "seatId, scryfallId, and gameCardIndex are required" });
    return;
  }

  const entry = getOrCreateRoom(tableName);
  if (!entry.spineTableId) {
    res.status(409).json({ error: "table has no live Spine subscription yet" });
    return;
  }
  const playerArea = entry.seats.get(seatId);
  if (!playerArea) {
    res.status(404).json({ error: "seat not found on this table" });
    return;
  }

  trace.getActiveSpan()?.setAttributes({
    "table.name": tableNameFromSlug(tableName),
    "table.slug": tableName,
    "seat.id": seatId,
    "card.scryfall_id": scryfallId,
    "card.game_card_index": gameCardIndex,
  });

  const ok = await sendCardReturnedToSpineBestEffort({
    tableId: entry.spineTableId,
    seatId,
    playerName: playerArea.playerName,
    scryfallId,
    gameCardIndex,
    ...(fromZone !== undefined ? { fromZone } : {}),
  });

  if (ok) {
    res.status(200).json({ ok: true });
  } else {
    res.status(502).json({ ok: false, error: "the Spine did not confirm the card.returned event" });
  }
}
