import { Request, Response } from "express";
import { trace } from "@opentelemetry/api";
import { createShapeId } from "@tldraw/tlschema";
import { getOrCreateRoom } from "./rooms.js";
import { slugifyTableName } from "../shared/slugify.js";
import { ensurePlayerArea, pageIdOf, nextIndex, mtgCardShape } from "./tableFurniture.js";
import { MAX_SEATS, CARD_W, CARD_H, commandZoneCardPosition } from "./cardLayout.js";

/** A commander riding seat.joined (ticket 18) — always face up, no `face` field on the wire. */
interface SeatJoinedCommander {
  card: { scryfallId: string; instanceId: string };
  cardName: string;
  frontImageUrl: string;
  backImageUrl: string | null;
}

/** A ghost's identity never collides with a real instanceId — instanceAlreadyOnTable (cardArrival.ts) matches exact strings. */
const ghostInstanceId = (instanceId: string): string => `ghost:${instanceId}`;

// ============================================================================
// SCAFFOLDING — the seam the Spine absorbs (same posture as cardArrival.ts).
//
// Future: the Shuffler emits `seat.joined` to the Spine's event log; the
// Tabletop subscribes to the table's public feed. Until then the Shuffler
// POSTs here directly, on Shuffle Up. Delete this endpoint when the feed
// exists. See apps/tabletop/DESIGN.md for the full trigger/geometry spec.
// ============================================================================

// Contract proper: contracts/payloads/seat.joined.v1.json (deckName required;
// playmatImageUrl, cardBackImageUrl, sleeveColor optional; sleeveColor wins
// when both it and cardBackImageUrl arrive).
interface SeatJoined {
  id: string;
  name: "seat.joined";
  occurredAt: string;
  initiator: { seatId: string; playerName: string };
  deckName: string;
  playmatImageUrl?: string;
  cardBackImageUrl?: string;
  sleeveColor?: string;
  commanders?: SeatJoinedCommander[];
}

// Same pattern as the contract schema — a sleeve is exactly six hex digits.
const SLEEVE_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

function validationError(body: unknown): string | null {
  const b = body as Record<string, any>;
  if (!b || typeof b !== "object") return "body must be a JSON object";
  if (typeof b.id !== "string" || !b.id) return "id (string) is required";
  if (b.name !== "seat.joined") return 'name must be "seat.joined"';
  if (typeof b.initiator?.seatId !== "string" || !b.initiator.seatId) return "initiator.seatId (string) is required";
  if (typeof b.initiator?.playerName !== "string" || !b.initiator.playerName) return "initiator.playerName (string) is required";
  if (typeof b.deckName !== "string" || !b.deckName) return "deckName (string) is required";
  if (b.playmatImageUrl !== undefined && typeof b.playmatImageUrl !== "string") return "playmatImageUrl, if present, must be a string";
  if (b.cardBackImageUrl !== undefined && typeof b.cardBackImageUrl !== "string") return "cardBackImageUrl, if present, must be a string";
  if (b.sleeveColor !== undefined && !(typeof b.sleeveColor === "string" && SLEEVE_COLOR_PATTERN.test(b.sleeveColor)))
    return "sleeveColor, if present, must be a #rrggbb hex color";
  if (b.commanders !== undefined) {
    if (!Array.isArray(b.commanders) || b.commanders.length > 2) return "commanders, if present, must be an array of 0-2 entries";
    for (const commander of b.commanders) {
      if (typeof commander?.card?.scryfallId !== "string" || !commander.card.scryfallId) return "commanders[].card.scryfallId (string) is required";
      if (typeof commander?.card?.instanceId !== "string" || !commander.card.instanceId) return "commanders[].card.instanceId (string) is required";
      if (typeof commander?.cardName !== "string" || !commander.cardName) return "commanders[].cardName (string) is required";
      if (typeof commander?.frontImageUrl !== "string" || !commander.frontImageUrl) return "commanders[].frontImageUrl (string) is required";
      if (commander?.backImageUrl !== null && typeof commander?.backImageUrl !== "string") return "commanders[].backImageUrl (string or null) is required";
    }
  }
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

  // Every compass slot is taken: refuse loudly. A fifth area would land on
  // an existing one, silently breaking zone-AABB disjointness (cardLayout.ts).
  if (entry.seats.size >= MAX_SEATS) {
    trace.getActiveSpan()?.setAttribute("seat_joined.rejected", "table-full");
    res.status(409).json({ error: `table is full: ${MAX_SEATS} seats` });
    return;
  }

  const pageId = pageIdOf(entry);
  const playerArea = await ensurePlayerArea(entry, pageId, joined.initiator.seatId, joined.initiator.playerName, {
    deckName: joined.deckName,
    playmatImageUrl: joined.playmatImageUrl,
    cardBackImageUrl: joined.cardBackImageUrl,
    sleeveColor: joined.sleeveColor,
  });

  const commanders = joined.commanders ?? [];
  if (commanders.length > 0) {
    await entry.room.updateStore((store) => {
      commanders.forEach((commander, slot) => {
        const { instanceId } = commander.card;
        const position = commandZoneCardPosition(playerArea.seatIndex, slot, commanders.length as 1 | 2);
        const sharedFields = {
          pageId,
          x: position.x,
          y: position.y,
          w: CARD_W,
          h: CARD_H,
          scryfallId: commander.card.scryfallId,
          cardName: commander.cardName,
          frontImageUrl: commander.frontImageUrl,
          backImageUrl: commander.backImageUrl,
          face: "front" as const,
          faceDown: false,
          sleeveColor: playerArea.sleeveColor ?? null,
          owner: joined.initiator.seatId,
          isCommander: true,
        };

        // Ghost minted first, so its z-index is strictly lower and the real
        // card paints on top (both share the same table spot).
        store.put(
          mtgCardShape({
            id: createShapeId(`ghost-${instanceId}`),
            index: nextIndex(tableName),
            instanceId: ghostInstanceId(instanceId),
            isLocked: true,
            opacity: 0.3,
            ...sharedFields,
          })
        );
        store.put(
          mtgCardShape({
            id: createShapeId(`card-${instanceId}`),
            index: nextIndex(tableName),
            instanceId,
            ...sharedFields,
          })
        );
      });
    });
  }

  entry.seenEventIds.add(joined.id);
  res.status(201).json({ ok: true });
}
