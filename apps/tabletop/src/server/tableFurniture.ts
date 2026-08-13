import { trace } from "@opentelemetry/api";
import { AssetRecordType, createShapeId, TLAssetId, TLImageShape, TLPageId, TLShapeId } from "@tldraw/tlschema";
import { IndexKey, getIndexAbove, getIndexBelow, ZERO_INDEX_KEY } from "@tldraw/utils";
import { RoomEntry, PlayerArea } from "./rooms.js";
import { MtgCardShape } from "../shared/mtgCardShape.js";
import { MtgZoneShape, MtgZoneShapeProps, LIBRARY_PILE_INSET, ZONE_LABEL_BAND } from "../shared/mtgZoneShape.js";
import {
  playmatBounds,
  libraryBounds,
  commandZoneBounds,
  exileBounds,
  graveyardBounds,
  nameLabelPosition,
  lifeCounterPosition,
  LIFE_COUNTER_W,
  LIFE_COUNTER_H,
  NAME_LABEL_HEIGHT,
  PLAYMAT_W,
  GAP,
  commanderDamageCounterPosition,
  COMMANDER_DAMAGE_COUNTER_W,
  COMMANDER_DAMAGE_COUNTER_H,
  stackBounds,
} from "./cardLayout.js";


export const FURNITURE_IMAGE_ID_MARKER = "furniture-image-";

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

const lowestFurnitureIndexByRoom = new Map<string, IndexKey>();
function nextFurnitureIndex(tableName: string): IndexKey {
  const next = getIndexBelow(lowestFurnitureIndexByRoom.get(tableName) ?? null);
  lowestFurnitureIndexByRoom.set(tableName, next);
  return next;
}

const DEFAULT_TITLE_COLOR = "var(--deep-space)";

/** Relative luminance (0 dark … 1 light) of a #rrggbb hex, sRGB-weighted. */
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * The darker of the deck's two identity colors, for the deck-title text. Both are optional
 * (an older Shuffler may send neither); with one or none present, fall back to the house
 * dark chrome token so the title stays on-brand and legible.
 */
export function darkerColor(a?: string, b?: string): string {
  if (a && b) return luminance(a) <= luminance(b) ? a : b;
  return a ?? b ?? DEFAULT_TITLE_COLOR;
}

export type Zone = MtgZoneShapeProps["zone"];

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
  /** Set only on a sleeved seat's library zone (ticket 17) — the pile renders as the bare sleeve rectangle. */
  sleeveColor?: string;
  /** The playmat's own picture — rendered inside the zone's own bordered box, clipped to its border radius, instead of a separate stock `image` shape. */
  imageUrl?: string | null;
}

export function zoneShape({ id, pageId, x, y, w, h, label, index, zone, seatId, sleeveColor, imageUrl }: ZoneShapeArgs): MtgZoneShape {
  return {
    id,
    typeName: "shape",
    type: "mtg-zone",
    x,
    y,
    rotation: 0,
    index,
    parentId: pageId as TLPageId,
    isLocked: true, // furniture: don't let a stray drag eat the graveyard
    opacity: 1,
    props: { w, h, zone, seatId, label, sleeveColor: sleeveColor ?? null, imageUrl: imageUrl ?? null } satisfies MtgZoneShapeProps,
    meta: {},
  };
}

export interface MtgCardShapeArgs {
  id: TLShapeId;
  pageId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  index: IndexKey;
  instanceId: string;
  scryfallId: string;
  cardName: string;
  frontImageUrl: string;
  backImageUrl: string | null;
  face: "front" | "back";
  faceDown: boolean;
  sleeveColor: string | null;
  /** The table's generic Magic card back (tabletop-physics ticket 17) — used only when unsleeved and faceDown. */
  cardBackImageUrl: string | null;
  owner: string;
  isCommander: boolean;
  /** Furniture-style lock (ghost copies); ordinary cards are draggable. */
  isLocked?: boolean;
  opacity?: number;
}

export function mtgCardShape({
  id,
  pageId,
  x,
  y,
  w,
  h,
  index,
  instanceId,
  scryfallId,
  cardName,
  frontImageUrl,
  backImageUrl,
  face,
  faceDown,
  sleeveColor,
  cardBackImageUrl,
  owner,
  isCommander,
  isLocked = false,
  opacity = 1,
}: MtgCardShapeArgs): MtgCardShape {
  return {
    id,
    typeName: "shape",
    type: "mtg-card",
    x,
    y,
    rotation: 0,
    index,
    parentId: pageId as TLPageId,
    isLocked,
    opacity,
    props: {
      w,
      h,
      instanceId,
      scryfallId,
      cardName,
      frontImageUrl,
      backImageUrl,
      face,
      faceDown,
      tapped: false,
      sleeveColor,
      cardBackImageUrl,
      owner,
      isCommander,
    },
    meta: {},
  };
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
): TLImageShape {
  return {
    id,
    typeName: "shape",
    type: "image",
    x,
    y,
    rotation: 0,
    index,
    parentId: pageId as TLPageId,
    isLocked: true, // furniture: an image background, not something to drag
    opacity: 1,
    props: { w, h, assetId, playing: true, url: "", crop: null, flipX: false, flipY: false, altText },
    meta: {},
  };
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
  /** The seat's sleeve (ticket 17) — when present it wins; cardBackImageUrl is dropped. */
  sleeveColor?: string;
  /** The seat's resolved identity colors. */
  primaryColor?: string;
  secondaryColor?: string;
}

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
    cardBackImageUrl: look.sleeveColor ? undefined : look.cardBackImageUrl,
    sleeveColor: look.sleeveColor,
    primaryColor: look.primaryColor,
    secondaryColor: look.secondaryColor,
    landCount: 0,
    graveyardCount: 0,
    stackCount: 0,
    commanderNames: [],
    damageCounterCount: 0,
  };
  entry.seats.set(seatId, area);

  const mat = playmatBounds(seatIndex);
  const library = libraryBounds(seatIndex);
  const commandZone = commandZoneBounds(seatIndex);
  const exile = exileBounds(seatIndex);
  const graveyard = graveyardBounds(seatIndex);
  const namePos = nameLabelPosition(seatIndex);
  const lifeCounterPos = lifeCounterPosition(seatIndex);

  const matId = createShapeId(`playmat-${entry.tableName}-${seatId}`);
  const libraryId = createShapeId(`library-${entry.tableName}-${seatId}`);
  const libraryImageId = createShapeId(`${FURNITURE_IMAGE_ID_MARKER}library-${entry.tableName}-${seatId}`);
  const commandZoneId = createShapeId(`region-command-${entry.tableName}-${seatId}`);
  const graveyardId = createShapeId(`region-graveyard-${entry.tableName}-${seatId}`);
  const exileId = createShapeId(`region-exile-${entry.tableName}-${seatId}`);
  const labelId = createShapeId(`name-label-${entry.tableName}-${seatId}`);
  const lifeCounterId = createShapeId(`life-counter-${entry.tableName}-${seatId}`);

  await entry.room.updateStore((store) => {
    store.put(
      zoneShape({
        id: matId,
        pageId,
        x: mat.x,
        y: mat.y,
        w: mat.w,
        h: mat.h,
        label: "",
        index: nextFurnitureIndex(entry.tableName),
        zone: "playmat",
        seatId,
        imageUrl: look.playmatImageUrl,
      })
    );

    store.put(
      zoneShape({
        id: libraryId,
        pageId,
        x: library.x,
        y: library.y,
        w: library.w,
        h: library.h,
        label: "Library",
        index: nextFurnitureIndex(entry.tableName),
        zone: "library",
        seatId,
        sleeveColor: area.sleeveColor,
      })
    );
    if (area.cardBackImageUrl) {
      const assetId = AssetRecordType.createId(`library-${entry.tableName}-${seatId}`);
      const insetW = library.w - 2 * LIBRARY_PILE_INSET;
      const insetH = library.h - ZONE_LABEL_BAND - LIBRARY_PILE_INSET;
      store.put(imageAsset(assetId, "Library", area.cardBackImageUrl, insetW, insetH));
      store.put(
        imageShape(
          libraryImageId,
          pageId,
          library.x + LIBRARY_PILE_INSET,
          library.y + ZONE_LABEL_BAND,
          insetW,
          insetH,
          assetId,
          "Library",
          nextFurnitureIndex(entry.tableName)
        )
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
        index: nextFurnitureIndex(entry.tableName),
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
        index: nextFurnitureIndex(entry.tableName),
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
        index: nextFurnitureIndex(entry.tableName),
        zone: "exile",
        seatId,
      })
    );

    // Put the life counter first so it takes the higher furniture index: a long deck
    // title runs rightward into the counter's band, and the label must sit behind it.
    store.put({
      id: lifeCounterId,
      typeName: "shape",
      type: "mtg-life-counter",
      x: lifeCounterPos.x,
      y: lifeCounterPos.y,
      rotation: 0,
      index: nextFurnitureIndex(entry.tableName),
      parentId: pageId,
      isLocked: true,
      opacity: 1,
      props: { w: LIFE_COUNTER_W, h: LIFE_COUNTER_H, value: 40, label: null, sleeveColor: null },
      meta: {},
    } as any);

    store.put({
      id: labelId,
      typeName: "shape",
      type: "mtg-title",
      x: namePos.x,
      y: namePos.y,
      rotation: 0,
      index: nextFurnitureIndex(entry.tableName),
      parentId: pageId,
      isLocked: true, // editing happens inside the shape; the lock keeps drag/delete off
      opacity: 1,
      props: {
        // The band runs from the playmat's left edge up to the life counter.
        w: PLAYMAT_W - LIFE_COUNTER_W - GAP,
        h: NAME_LABEL_HEIGHT,
        text: look.deckName ? `${playerName} 〜 ${look.deckName}` : playerName,
        color: darkerColor(look.primaryColor, look.secondaryColor),
      },
      meta: {},
    } as any);
  });

  await ensureStackDrawn(entry, pageId);

  trace.getActiveSpan()?.setAttributes({
    "seat.id": seatId,
    "player.name": playerName,
    "seat.index": seatIndex,
    "playmat.image_present": Boolean(look.playmatImageUrl),
    "card_back.image_present": Boolean(area.cardBackImageUrl),
    "sleeve.present": Boolean(area.sleeveColor),
  });

  return area;
}

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
        index: nextFurnitureIndex(entry.tableName),
        zone: "stack",
        seatId: null,
      })
    );
  });
}

export async function addCommanderDamageCounters(
  entry: RoomEntry,
  pageId: string,
  targetSeatId: string,
  opponentSeatId: string,
  commanderNames: string[],
  opponentSleeveColor: string | undefined
): Promise<void> {
  if (commanderNames.length === 0) return;
  const target = entry.seats.get(targetSeatId);
  if (!target) return;

  await entry.room.updateStore((store) => {
    const firstId = createShapeId(`damage-counter-${entry.tableName}-${targetSeatId}-${opponentSeatId}-0`);
    if (store.get(firstId)) return;

    // Draw above the deck-title label, not on the (ever-decreasing) furniture floor:
    // the title can run rightward into these counters and must sit behind them.
    const labelId = createShapeId(`name-label-${entry.tableName}-${targetSeatId}`);
    const label = store.get(labelId) as { index: IndexKey } | undefined;
    let counterZ = label ? getIndexAbove(label.index) : nextFurnitureIndex(entry.tableName);

    commanderNames.forEach((commanderName, i) => {
      const counterIndex = target.damageCounterCount++;
      const pos = commanderDamageCounterPosition(target.seatIndex, counterIndex);
      store.put({
        id: i === 0 ? firstId : createShapeId(`damage-counter-${entry.tableName}-${targetSeatId}-${opponentSeatId}-${i}`),
        typeName: "shape",
        type: "mtg-life-counter",
        x: pos.x,
        y: pos.y,
        rotation: 0,
        index: counterZ,
        parentId: pageId,
        isLocked: true,
        opacity: 1,
        props: {
          w: COMMANDER_DAMAGE_COUNTER_W,
          h: COMMANDER_DAMAGE_COUNTER_H,
          value: 0,
          label: commanderName,
          sleeveColor: opponentSleeveColor ?? null,
        },
        meta: {},
      } as any);
      counterZ = getIndexAbove(counterZ);
    });
  });
}
