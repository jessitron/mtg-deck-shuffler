import { trace } from "@opentelemetry/api";
import { AssetRecordType, createShapeId, toRichText, TLAssetId, TLShapeId } from "@tldraw/tlschema";
import { IndexKey, getIndexAbove, ZERO_INDEX_KEY } from "@tldraw/utils";
import { RoomEntry, PlayerArea } from "./rooms.js";
import { MtgZoneShapeProps } from "../shared/mtgZoneShape.js";
import {
  playmatBounds,
  libraryBounds,
  commandZoneBounds,
  exileBounds,
  graveyardBounds,
  nameLabelPosition,
  stackBounds,
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

/**
 * Zones a card can be detected entering (01-zone-entry-events, upgraded in
 * tabletop-physics ticket 13 to real `mtg-zone` shapes).
 */
export type Zone = MtgZoneShapeProps["zone"];

/** How far the library's card-back image insets from its box, so the box's border and "Library" label peek out as a frame around the opaque image. */
const LIBRARY_IMAGE_INSET = 12;

export interface ZoneShapeArgs {
  id: TLShapeId;
  pageId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  index: IndexKey;
  zone: Zone;
  seatId: string | null;
}

/**
 * Furniture (playmat, library, graveyard, exile, the Stack) as an `mtg-zone`
 * shape (tabletop-physics ticket 13) — always locked; tldraw's own
 * context-menu Lock/Unlock is the sole unlock affordance. `MtgZoneShapeUtil`
 * decides the visual treatment (dashed vs. playmat's solid border) from
 * `props.zone`. `opacity: 0.5` matches the pre-ticket-13 `regionShape`'s
 * look (furniture read as a faint outline, not a solid block).
 */
export function zoneShape({ id, pageId, x, y, w, h, label, index, zone, seatId }: ZoneShapeArgs) {
  return {
    id,
    typeName: "shape",
    type: "mtg-zone",
    x,
    y,
    rotation: 0,
    index,
    parentId: pageId,
    isLocked: true, // furniture: don't let a stray drag eat the graveyard
    opacity: 0.5,
    props: { w, h, zone, seatId, label } satisfies MtgZoneShapeProps,
    meta: {},
  } as any;
}

function imageShape(
  id: TLShapeId,
  pageId: string,
  x: number,
  y: number,
  w: number,
  h: number,
  assetId: TLAssetId,
  altText: string,
  index: IndexKey
) {
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

export interface PlayerAreaLook {
  deckName?: string;
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
  look: PlayerAreaLook = {}
): Promise<PlayerArea> {
  const existing = entry.seats.get(seatId);
  if (existing) return existing;

  const seatIndex = entry.seats.size;
  const area: PlayerArea = {
    seatIndex,
    playerName,
    playmatImageUrl: look.playmatImageUrl,
    cardBackImageUrl: look.cardBackImageUrl,
    landCount: 0,
    graveyardCount: 0,
  };
  entry.seats.set(seatId, area);

  const mat = playmatBounds(seatIndex);
  const library = libraryBounds(seatIndex);
  const commandZone = commandZoneBounds(seatIndex);
  const exile = exileBounds(seatIndex);
  const graveyard = graveyardBounds(seatIndex);
  const namePos = nameLabelPosition(seatIndex);

  const matId = createShapeId(`playmat-${entry.tableName}-${seatId}`);
  const matImageId = createShapeId(`playmat-image-${entry.tableName}-${seatId}`);
  const libraryId = createShapeId(`library-${entry.tableName}-${seatId}`);
  const libraryImageId = createShapeId(`library-image-${entry.tableName}-${seatId}`);
  const commandZoneId = createShapeId(`region-command-${entry.tableName}-${seatId}`);
  const graveyardId = createShapeId(`region-graveyard-${entry.tableName}-${seatId}`);
  const exileId = createShapeId(`region-exile-${entry.tableName}-${seatId}`);
  const labelId = createShapeId(`name-label-${entry.tableName}-${seatId}`);

  await entry.room.updateStore((store) => {
    // The mat outline is always drawn — the fallback if the image is missing/broken.
    store.put(
      zoneShape({ id: matId, pageId, x: mat.x, y: mat.y, w: mat.w, h: mat.h, label: "", index: nextIndex(entry.tableName), zone: "playmat", seatId })
    );
    if (look.playmatImageUrl) {
      const assetId = AssetRecordType.createId(`playmat-${entry.tableName}-${seatId}`);
      store.put(imageAsset(assetId, `${playerName}'s playmat`, look.playmatImageUrl, mat.w, mat.h));
      store.put(imageShape(matImageId, pageId, mat.x, mat.y, mat.w, mat.h, assetId, `${playerName}'s playmat`, nextIndex(entry.tableName)));
    }

    if (look.cardBackImageUrl) {
      // An opaque image shape hides whatever's underneath it (tldraw limit), so the
      // border and "Library" label have to read as an outward frame: draw the box at
      // full bounds first, then the image inset within it so the box's edge — and the
      // label riding on it — stays visible as a ring around the picture.
      store.put(
        zoneShape({
          id: libraryId,
          pageId,
          x: library.x,
          y: library.y,
          w: library.w,
          h: library.h,
          label: "Library",
          index: nextIndex(entry.tableName),
          zone: "library",
          seatId,
        })
      );
      const assetId = AssetRecordType.createId(`library-${entry.tableName}-${seatId}`);
      const insetW = library.w - 2 * LIBRARY_IMAGE_INSET;
      const insetH = library.h - 2 * LIBRARY_IMAGE_INSET;
      store.put(imageAsset(assetId, "Library", look.cardBackImageUrl, insetW, insetH));
      store.put(
        imageShape(
          libraryImageId,
          pageId,
          library.x + LIBRARY_IMAGE_INSET,
          library.y + LIBRARY_IMAGE_INSET,
          insetW,
          insetH,
          assetId,
          "Library",
          nextIndex(entry.tableName)
        )
      );
    } else {
      store.put(
        zoneShape({
          id: libraryId,
          pageId,
          x: library.x,
          y: library.y,
          w: library.w,
          h: library.h,
          label: "Library",
          index: nextIndex(entry.tableName),
          zone: "library",
          seatId,
        })
      );
    }

    store.put(
      zoneShape({
        id: commandZoneId,
        pageId,
        x: commandZone.x,
        y: commandZone.y,
        w: commandZone.w,
        h: commandZone.h,
        label: "Command Zone",
        index: nextIndex(entry.tableName),
        zone: "command",
        seatId,
      })
    );
    store.put(
      zoneShape({
        id: graveyardId,
        pageId,
        x: graveyard.x,
        y: graveyard.y,
        w: graveyard.w,
        h: graveyard.h,
        label: "Graveyard",
        index: nextIndex(entry.tableName),
        zone: "graveyard",
        seatId,
      })
    );
    store.put(
      zoneShape({
        id: exileId,
        pageId,
        x: exile.x,
        y: exile.y,
        w: exile.w,
        h: exile.h,
        label: "Exile",
        index: nextIndex(entry.tableName),
        zone: "exile",
        seatId,
      })
    );

    store.put({
      id: labelId,
      typeName: "shape",
      type: "text",
      x: namePos.x,
      y: namePos.y,
      rotation: 0,
      index: nextIndex(entry.tableName),
      parentId: pageId,
      isLocked: true, // fixes a live bug: any player could drag/delete another player's name
      opacity: 1,
      // Two lines, player name first (design ruling 2026-08-08): line position is
      // the only hierarchy a stock text shape offers, and two lines keep a long
      // deck name from growing the autoSized label toward the neighboring seat.
      // No deck name (e.g. the defensive redraw at card arrival) → today's
      // one-line label, no dangling blank line.
      props: {
        richText: toRichText(look.deckName ? `${playerName}\n${look.deckName}` : playerName),
        color: "green",
        size: "m",
        font: "serif",
        textAlign: "start",
        autoSize: true,
        w: 200,
        scale: 1,
      },
      meta: {},
    } as any);
  });

  await ensureStackDrawn(entry, pageId);

  // Attributes on the request span, not an event: this always runs inside the
  // request that caused it (handleSeatJoined, or defensively handleCardArrival).
  trace.getActiveSpan()?.setAttributes({
    "seat.id": seatId,
    "player.name": playerName,
    "seat.index": seatIndex,
    "playmat.image_present": Boolean(look.playmatImageUrl),
    "card_back.image_present": Boolean(look.cardBackImageUrl),
  });

  return area;
}

/**
 * Draw the shared Stack — a fixed-size square centered on the origin, the
 * same footprint at every player count — the first time a seat joins. The
 * shape id is deterministic (one Stack per table); once it exists, later
 * joins are a no-op, which also means its z-order `index` can never be
 * silently promoted over whatever was placed above it since (the widening
 * bug tabletop-physics ticket 13 fixed).
 */
export async function ensureStackDrawn(entry: RoomEntry, pageId: string): Promise<void> {
  if (entry.seats.size === 0) return;
  const bounds = stackBounds();
  const stackId = createShapeId(`region-stack-${entry.tableName}`);
  await entry.room.updateStore((store) => {
    if (store.get(stackId)) return;
    store.put(
      zoneShape({
        id: stackId,
        pageId,
        x: bounds.x,
        y: bounds.y,
        w: bounds.w,
        h: bounds.h,
        label: "The Stack",
        index: nextIndex(entry.tableName),
        zone: "stack",
        seatId: null,
      })
    );
  });
}
