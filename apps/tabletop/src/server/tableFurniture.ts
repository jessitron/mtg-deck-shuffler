import { trace } from "@opentelemetry/api";
import { AssetRecordType, createShapeId, toRichText, TLAssetId, TLShapeId } from "@tldraw/tlschema";
import { IndexKey, getIndexAbove, ZERO_INDEX_KEY } from "@tldraw/utils";
import { RoomEntry, PlayerArea } from "./rooms.js";
import {
  playmatBounds,
  libraryBounds,
  exileBounds,
  graveyardBounds,
  nameLabelPosition,
  stackStripBounds,
} from "./cardLayout.js";

// ============================================================================
// Shared shape-building helpers for the table's furniture — the playmat,
// library, graveyard, exile, name label, and Stack strip drawn at seat-joined
// time (seatJoined.ts), plus the per-room z-index used when placing cards
// (cardArrival.ts).
// ============================================================================

export function pageIdOf(entry: RoomEntry): string {
  const page = entry.room.getCurrentSnapshot().documents.find((d) => (d.state as any).typeName === "page");
  return page ? (page.state as any).id : "page:page";
}

// Per-room monotonically increasing z-order index for injected shapes.
const lastIndexByRoom = new Map<string, IndexKey>();
export function nextIndex(tableName: string): IndexKey {
  const next = getIndexAbove(lastIndexByRoom.get(tableName) ?? ZERO_INDEX_KEY);
  lastIndexByRoom.set(tableName, next);
  return next;
}

export function regionShape(id: TLShapeId, pageId: string, x: number, y: number, w: number, h: number, label: string, index: IndexKey) {
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

function imageShape(id: TLShapeId, pageId: string, x: number, y: number, w: number, h: number, assetId: TLAssetId, altText: string, index: IndexKey) {
  return {
    id,
    typeName: "shape",
    type: "image",
    x,
    y,
    rotation: 0,
    index,
    parentId: pageId,
    isLocked: true, // furniture: an image background, not something to drag
    opacity: 1,
    props: { w, h, assetId, playing: true, url: "", crop: null, flipX: false, flipY: false, altText },
    meta: {},
  } as any;
}

function imageAsset(id: TLAssetId, name: string, src: string, w: number, h: number) {
  return AssetRecordType.create({
    id,
    type: "image",
    typeName: "asset",
    props: { name, src, w, h, mimeType: "image/jpeg", isAnimated: false },
    meta: {},
  });
}

export interface PlayerAreaImages {
  playmatImageUrl?: string;
  cardBackImageUrl?: string;
}

/**
 * Draw a seat's whole player area — playmat, library, graveyard, exile, name
 * label — up front, before any card arrives. Idempotent on seatId: a second
 * call for a seat already drawn is a no-op (DESIGN.md's "physical no-op").
 *
 * A missing or broken image URL degrades to a plain box, never a broken
 * player area: the outline is always drawn; the image (if any) layers on top.
 */
export async function ensurePlayerArea(
  entry: RoomEntry,
  pageId: string,
  seatId: string,
  playerName: string,
  images: PlayerAreaImages = {}
): Promise<PlayerArea> {
  const existing = entry.seats.get(seatId);
  if (existing) return existing;

  const seatIndex = entry.seats.size;
  const area: PlayerArea = {
    seatIndex,
    playerName,
    playmatImageUrl: images.playmatImageUrl,
    cardBackImageUrl: images.cardBackImageUrl,
    landCount: 0,
    graveyardCount: 0,
  };
  entry.seats.set(seatId, area);

  const mat = playmatBounds(seatIndex);
  const library = libraryBounds(seatIndex);
  const exile = exileBounds(seatIndex);
  const graveyard = graveyardBounds(seatIndex);
  const namePos = nameLabelPosition(seatIndex);

  const matId = createShapeId(`playmat-${entry.tableName}-${seatId}`);
  const matImageId = createShapeId(`playmat-image-${entry.tableName}-${seatId}`);
  const libraryId = createShapeId(`library-${entry.tableName}-${seatId}`);
  const graveyardId = createShapeId(`region-graveyard-${entry.tableName}-${seatId}`);
  const exileId = createShapeId(`region-exile-${entry.tableName}-${seatId}`);
  const labelId = createShapeId(`name-label-${entry.tableName}-${seatId}`);

  await entry.room.updateStore((store) => {
    // The mat outline is always drawn — the fallback if the image is missing/broken.
    store.put(regionShape(matId, pageId, mat.x, mat.y, mat.w, mat.h, "", nextIndex(entry.tableName)));
    if (images.playmatImageUrl) {
      const assetId = AssetRecordType.createId(`playmat-${entry.tableName}-${seatId}`);
      store.put(imageAsset(assetId, `${playerName}'s playmat`, images.playmatImageUrl, mat.w, mat.h));
      store.put(imageShape(matImageId, pageId, mat.x, mat.y, mat.w, mat.h, assetId, `${playerName}'s playmat`, nextIndex(entry.tableName)));
    }

    if (images.cardBackImageUrl) {
      const assetId = AssetRecordType.createId(`library-${entry.tableName}-${seatId}`);
      store.put(imageAsset(assetId, "Library", images.cardBackImageUrl, library.w, library.h));
      store.put(imageShape(libraryId, pageId, library.x, library.y, library.w, library.h, assetId, "Library", nextIndex(entry.tableName)));
    } else {
      store.put(regionShape(libraryId, pageId, library.x, library.y, library.w, library.h, "Library", nextIndex(entry.tableName)));
    }

    store.put(regionShape(graveyardId, pageId, graveyard.x, graveyard.y, graveyard.w, graveyard.h, "Graveyard", nextIndex(entry.tableName)));
    store.put(regionShape(exileId, pageId, exile.x, exile.y, exile.w, exile.h, "Exile", nextIndex(entry.tableName)));

    store.put({
      id: labelId,
      typeName: "shape",
      type: "text",
      x: namePos.x,
      y: namePos.y,
      rotation: 0,
      index: nextIndex(entry.tableName),
      parentId: pageId,
      isLocked: false,
      opacity: 1,
      props: { richText: toRichText(playerName), color: "green", size: "m", font: "serif", textAlign: "start", autoSize: true, w: 200, scale: 1 },
      meta: {},
    } as any);
  });

  await ensureStackStripWidth(entry, pageId);

  // Attributes on the request span, not an event: this always runs inside the
  // request that caused it (handleSeatJoined, or defensively handleCardArrival).
  trace.getActiveSpan()?.setAttributes({
    "seat.id": seatId,
    "player.name": playerName,
    "seat.index": seatIndex,
    "playmat.image_present": Boolean(images.playmatImageUrl),
    "card_back.image_present": Boolean(images.cardBackImageUrl),
  });

  return area;
}

/** Create or widen the shared Stack strip to span every player area joined so far. */
export async function ensureStackStripWidth(entry: RoomEntry, pageId: string): Promise<void> {
  const seatCount = entry.seats.size;
  if (seatCount === 0) return;
  const bounds = stackStripBounds(seatCount);
  const stackId = createShapeId(`region-stack-${entry.tableName}`);
  await entry.room.updateStore((store) => {
    store.put(regionShape(stackId, pageId, bounds.x, bounds.y, bounds.w, bounds.h, "The Stack", nextIndex(entry.tableName)));
  });
}
