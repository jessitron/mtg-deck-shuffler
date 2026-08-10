import { Request, Response } from "express";
import { trace } from "@opentelemetry/api";
import { createShapeId } from "@tldraw/tlschema";
import { getOrCreateRoom, RoomEntry } from "./rooms.js";
import { slugifyTableName } from "../shared/slugify.js";
import { CARD_W, CARD_H, MAX_SEATS, landPosition, graveyardCardPosition, stackCardPosition } from "./cardLayout.js";
import { ensurePlayerArea, pageIdOf, nextIndex } from "./tableFurniture.js";

// ============================================================================
// SCAFFOLDING — the seam the Spine absorbs.
//
// Future: the Shuffler emits `card.played` to the Spine's event log; the
// Tabletop subscribes to the table's public feed, and TS-side contract
// validation lives on that subscription. Until then the Shuffler POSTs here
// directly. Delete this endpoint when the feed exists.
// ============================================================================
//
// JES-128: the payload accepted here is F0's frozen card-arrival payload — an
// envelope-lite subset of the event contract (see
// apps/shuffler/src/port-tabletop/types.ts for the field-by-field comment
// block, and contracts/payloads/card.played.v1.json for the contract proper).
// The hand-rolled checks below are where JSON-Schema contract validation
// lands when the Tabletop subscribes to the Spine.

const ZONE_HINTS = ["stack", "battlefield", "graveyard"] as const;
type ZoneHint = (typeof ZONE_HINTS)[number];

interface CardArrival {
  id: string;
  name: "card.played";
  occurredAt: string;
  initiator: { seatId: string; playerName: string };
  card: { scryfallId: string; instanceId: string };
  face: "front" | "back";
  zoneHint: ZoneHint;
  frontImageUrl: string;
  backImageUrl: string | null;
  cardName: string;
}

function validationError(body: unknown): string | null {
  const b = body as Record<string, any>;
  if (!b || typeof b !== "object") return "body must be a JSON object";
  // JES-128: contract validation goes here.
  if (typeof b.id !== "string" || !b.id) return "id (string) is required";
  if (b.name !== "card.played") return 'name must be "card.played"';
  if (typeof b.initiator?.seatId !== "string" || !b.initiator.seatId) return "initiator.seatId (string) is required";
  if (typeof b.initiator?.playerName !== "string" || !b.initiator.playerName) return "initiator.playerName (string) is required";
  if (typeof b.card?.scryfallId !== "string" || !b.card.scryfallId) return "card.scryfallId (string) is required";
  if (typeof b.card?.instanceId !== "string" || !b.card.instanceId) return "card.instanceId (string) is required";
  if (b.face !== "front" && b.face !== "back") return 'face must be "front" or "back"';
  if (!ZONE_HINTS.includes(b.zoneHint)) return `zoneHint must be one of ${ZONE_HINTS.join("|")}`;
  if (typeof b.frontImageUrl !== "string" || !b.frontImageUrl) return "frontImageUrl (string) is required";
  if (b.backImageUrl !== null && typeof b.backImageUrl !== "string") return "backImageUrl (string or null) is required";
  if (typeof b.cardName !== "string" || !b.cardName) return "cardName (string) is required";
  // The decodable secret must not cross the boundary — reject loudly if a
  // sender ever tries (defense in depth; the Shuffler also never sends it).
  if ("gameCardIndex" in b) return "gameCardIndex is forbidden beyond the Shuffler's boundary";
  return null;
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

  const problem = validationError(req.body);
  if (problem) {
    res.status(400).json({ error: problem });
    return;
  }
  const arrival = req.body as CardArrival;

  trace.getActiveSpan()?.setAttributes({
    "card.instance_id": arrival.card.instanceId,
    "card.scryfall_id": arrival.card.scryfallId,
    "card.name": arrival.cardName,
    "event.id": arrival.id,
    "table.name": tableName,
    "zone.hint": arrival.zoneHint,
    "seat.id": arrival.initiator.seatId,
  });

  const entry = getOrCreateRoom(tableName);

  // Dedup 1: a retried request (same event id — worked but failed to ack).
  if (entry.seenEventIds.has(arrival.id)) {
    trace.getActiveSpan()?.setAttribute("arrival.deduped", "event-id");
    res.status(200).json({ ok: true, deduped: true });
    return;
  }
  // Dedup 2: the instance is already on the table (a retried play with a fresh
  // event id). One instance exists once; a second arrival is a physical no-op.
  if (instanceAlreadyOnTable(entry, arrival.card.instanceId)) {
    entry.seenEventIds.add(arrival.id);
    trace.getActiveSpan()?.setAttribute("arrival.deduped", "instance");
    res.status(200).json({ ok: true, deduped: true });
    return;
  }

  // A card from an unseated player when every compass slot is taken: refuse.
  // The defensive ensurePlayerArea below would otherwise need a fifth slot,
  // which doesn't exist (cardLayout.ts MAX_SEATS).
  if (!entry.seats.has(arrival.initiator.seatId) && entry.seats.size >= MAX_SEATS) {
    trace.getActiveSpan()?.setAttribute("arrival.rejected", "table-full");
    res.status(409).json({ error: `table is full: ${MAX_SEATS} seats` });
    return;
  }

  const pageId = pageIdOf(entry);
  // Defensive fallback: normally seat.joined already drew this seat's player
  // area before any card arrives. If a card somehow arrives first, draw a
  // plain area now rather than fail — ensurePlayerArea is idempotent on seatId.
  const playerArea = await ensurePlayerArea(entry, pageId, arrival.initiator.seatId, arrival.initiator.playerName);

  let position: { x: number; y: number };
  switch (arrival.zoneHint) {
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

  const shapeId = createShapeId(`card-${arrival.card.instanceId}`);

  await entry.room.updateStore((store) => {
    // No per-instance tldraw asset: the card renders its own <img> straight
    // from frontImageUrl/backImageUrl (mtg-card, tabletop-physics ticket 12),
    // so flip is a pure props.face write later, not an asset swap.
    store.put({
      id: shapeId,
      typeName: "shape",
      type: "mtg-card",
      x: position.x,
      y: position.y,
      rotation: 0,
      index: nextIndex(tableName),
      parentId: pageId,
      isLocked: false,
      opacity: 1,
      props: {
        w: CARD_W,
        h: CARD_H,
        instanceId: arrival.card.instanceId,
        scryfallId: arrival.card.scryfallId,
        cardName: arrival.cardName,
        frontImageUrl: arrival.frontImageUrl,
        backImageUrl: arrival.backImageUrl,
        face: arrival.face,
        faceDown: false,
        tapped: false,
        // Ticket 17: the seat's sleeve, baked in at mint time. Legal because
        // sleeve color is a game constant — never changed mid-game. Sleeve is
        // seat data, not payload data: it comes from seat memory, never from
        // the card.played payload.
        sleeveColor: playerArea.sleeveColor ?? null,
        // Ticket 17 (flip-and-face-down): same argument, same seat-data-not-
        // payload-data status. Null for sleeved seats (seat.joined omits it
        // when sleeved — the sleeve always wins) and for seats with none.
        cardBackImageUrl: playerArea.cardBackImageUrl ?? null,
      },
      // No traceparent in meta — cards persist; traces don't. Zone
      // membership lands here once a card is dragged (see
      // MtgCardShapeUtil.onTranslateEnd) — empty at arrival.
      meta: {},
    } as any);
  });

  entry.seenEventIds.add(arrival.id);
  res.status(201).json({ ok: true });
}
