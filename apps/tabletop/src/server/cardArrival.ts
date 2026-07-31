import { Request, Response } from "express";
import { trace } from "@opentelemetry/api";
import { AssetRecordType, createShapeId, toRichText, TLAssetId, TLShapeId } from "@tldraw/tlschema";
import { IndexKey, getIndexAbove, ZERO_INDEX_KEY } from "@tldraw/utils";
import { getOrCreateRoom, RoomEntry, SeatRow } from "./rooms.js";
import { slugifyTableName } from "../shared/slugify.js";
import { CARD_W, CARD_H, STACK_AREA, EXILE_X, EXILE_SCALE, GRAVEYARD_X, rowOrigin, stackPosition, battlefieldPosition, graveyardPosition } from "./cardLayout.js";

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

// Per-room monotonically increasing z-order index for injected shapes.
const lastIndexByRoom = new Map<string, IndexKey>();
function nextIndex(tableName: string): IndexKey {
  const next = getIndexAbove(lastIndexByRoom.get(tableName) ?? ZERO_INDEX_KEY);
  lastIndexByRoom.set(tableName, next);
  return next;
}

// Per-room count of cards placed on the stack (drives the cascade).
const stackCountByRoom = new Map<string, number>();

function pageIdOf(entry: RoomEntry): string {
  const page = entry.room.getCurrentSnapshot().documents.find((d) => (d.state as any).typeName === "page");
  return page ? (page.state as any).id : "page:page";
}

function instanceAlreadyOnTable(entry: RoomEntry, instanceId: string): boolean {
  return entry.room
    .getCurrentSnapshot()
    .documents.some((d) => (d.state as any).typeName === "shape" && (d.state as any).meta?.instanceId === instanceId);
}

/** Region furniture drawn once per table: the stack area outline. */
async function ensureStackArea(entry: RoomEntry, pageId: string): Promise<void> {
  const stackId = createShapeId(`region-stack-${entry.tableName}`);
  if (entry.room.getRecord(stackId)) return;
  await entry.room.updateStore((store) => {
    store.put(regionShape(stackId, pageId, STACK_AREA.x - 20, STACK_AREA.y - 20, CARD_W + 260, CARD_H + 120, STACK_AREA.label, nextIndex(entry.tableName)));
  });
}

/**
 * Allocate a battlefield row for a seat (first-play order), with the player's
 * name label and the row's Graveyard + smaller Exile spots.
 */
async function ensureSeatRow(entry: RoomEntry, pageId: string, seatId: string, playerName: string): Promise<SeatRow> {
  const existing = entry.seats.get(seatId);
  if (existing) return existing;

  const rowIndex = entry.seats.size;
  const seatRow: SeatRow = { rowIndex, playerName, battlefieldCount: 0, graveyardCount: 0, exileCount: 0 };
  entry.seats.set(seatId, seatRow);

  const origin = rowOrigin(rowIndex);
  const labelId = createShapeId(`row-label-${entry.tableName}-${seatId}`);
  const graveyardId = createShapeId(`region-graveyard-${entry.tableName}-${seatId}`);
  const exileId = createShapeId(`region-exile-${entry.tableName}-${seatId}`);
  await entry.room.updateStore((store) => {
    store.put({
      id: labelId,
      typeName: "shape",
      type: "text",
      x: origin.x,
      y: origin.y - 52,
      rotation: 0,
      index: nextIndex(entry.tableName),
      parentId: pageId,
      isLocked: false,
      opacity: 1,
      props: { richText: toRichText(playerName), color: "green", size: "m", font: "serif", textAlign: "start", autoSize: true, w: 200, scale: 1 },
      meta: {},
    } as any);
    store.put(regionShape(graveyardId, pageId, GRAVEYARD_X - 10, origin.y - 10, CARD_W + 40, CARD_H + 40, "Graveyard", nextIndex(entry.tableName)));
    store.put(
      regionShape(exileId, pageId, EXILE_X - 10, origin.y - 10, CARD_W * EXILE_SCALE + 30, CARD_H * EXILE_SCALE + 30, "Exile", nextIndex(entry.tableName))
    );
  });

  // Attributes on the request span, not an event: this always runs inside
  // handleCardArrival, and the fact that THIS arrival allocated a row is part of
  // what that request did.
  trace.getActiveSpan()?.setAttributes({ "row.allocated": true, "seat.id": seatId, "player.name": playerName, "row.index": rowIndex });
  return seatRow;
}

function regionShape(id: TLShapeId, pageId: string, x: number, y: number, w: number, h: number, label: string, index: IndexKey) {
  return {
    id,
    typeName: "shape",
    type: "geo",
    x,
    y,
    rotation: 0,
    index,
    parentId: pageId,
    isLocked: true, // furniture: don't let a stray drag eat the graveyard
    opacity: 0.5,
    props: {
      geo: "rectangle",
      w,
      h,
      dash: "dashed",
      fill: "none",
      color: "grey",
      labelColor: "grey",
      size: "s",
      font: "serif",
      align: "start-legacy",
      verticalAlign: "start",
      growY: 0,
      url: "",
      scale: 1,
      richText: toRichText(label),
    },
    meta: {},
  } as any;
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
  await ensureStackArea(entry, pageId);
  const seatRow = await ensureSeatRow(entry, pageId, arrival.initiator.seatId, arrival.initiator.playerName);

  let position: { x: number; y: number };
  switch (arrival.zoneHint) {
    case "battlefield":
      position = battlefieldPosition(seatRow.rowIndex, seatRow.battlefieldCount++);
      break;
    case "graveyard":
      position = graveyardPosition(seatRow.rowIndex, seatRow.graveyardCount++);
      break;
    case "stack": {
      const count = stackCountByRoom.get(tableName) ?? 0;
      stackCountByRoom.set(tableName, count + 1);
      position = stackPosition(count);
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
