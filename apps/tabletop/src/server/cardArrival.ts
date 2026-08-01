import { Request, Response } from "express";
import { trace } from "@opentelemetry/api";
import { AssetRecordType, createShapeId, TLAssetId } from "@tldraw/tlschema";
import { getOrCreateRoom, RoomEntry } from "./rooms.js";
import { slugifyTableName } from "../shared/slugify.js";
import { CARD_W, CARD_H, landPosition, graveyardCardPosition, stackCardPosition } from "./cardLayout.js";
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
  imageUrl: string;
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
  if (typeof b.imageUrl !== "string" || !b.imageUrl) return "imageUrl (string) is required";
  if (typeof b.cardName !== "string" || !b.cardName) return "cardName (string) is required";
  // The decodable secret must not cross the boundary — reject loudly if a
  // sender ever tries (defense in depth; the Shuffler also never sends it).
  if ("gameCardIndex" in b) return "gameCardIndex is forbidden beyond the Shuffler's boundary";
  return null;
}

// Per-room count of cards placed on the stack (drives the cascade).
const stackCountByRoom = new Map<string, number>();

function instanceAlreadyOnTable(entry: RoomEntry, instanceId: string): boolean {
  return entry.room
    .getCurrentSnapshot()
    .documents.some((d) => (d.state as any).typeName === "shape" && (d.state as any).meta?.instanceId === instanceId);
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
    case "stack": {
      const count = stackCountByRoom.get(tableName) ?? 0;
      stackCountByRoom.set(tableName, count + 1);
      position = stackCardPosition(count);
      break;
    }
  }

  const assetId: TLAssetId = AssetRecordType.createId(arrival.card.instanceId);
  const shapeId = createShapeId(`card-${arrival.card.instanceId}`);

  await entry.room.updateStore((store) => {
    store.put(
      AssetRecordType.create({
        id: assetId,
        type: "image",
        typeName: "asset",
        props: {
          name: arrival.cardName,
          src: arrival.imageUrl,
          w: 488, // Scryfall "normal" natural size
          h: 680,
          mimeType: "image/jpeg",
          isAnimated: false,
        },
        meta: {},
      })
    );
    store.put({
      id: shapeId,
      typeName: "shape",
      type: "image",
      x: position.x,
      y: position.y,
      rotation: 0,
      index: nextIndex(tableName),
      parentId: pageId,
      isLocked: false,
      opacity: 1,
      props: { w: CARD_W, h: CARD_H, assetId, playing: true, url: "", crop: null, flipX: false, flipY: false, altText: arrival.cardName },
      // Identity, not face: face is card state (see the two-faced-cards owner).
      // No traceparent in meta — cards persist; traces don't.
      meta: { instanceId: arrival.card.instanceId, scryfallId: arrival.card.scryfallId, cardName: arrival.cardName },
    } as any);
  });

  entry.seenEventIds.add(arrival.id);
  res.status(201).json({ ok: true });
}
