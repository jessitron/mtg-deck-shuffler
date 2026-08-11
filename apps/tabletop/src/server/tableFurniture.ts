import { trace } from "@opentelemetry/api";
import { AssetRecordType, createShapeId, toRichText, TLAssetId, TLImageShape, TLPageId, TLShapeId } from "@tldraw/tlschema";
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
  stackBounds,
} from "./cardLayout.js";

// ============================================================================
// Shared shape-building helpers for the table's furniture — the playmat,
// library, graveyard, exile, name label, and Stack strip drawn at seat-joined
// time (seatJoined.ts), plus the per-room z-index used when placing cards
// (cardArrival.ts).
// ============================================================================

// Every locked background picture (playmat, library card back) gets a shape
// id starting with this prefix — the one marker a Playwright spec needs to
// tell "this table's own decor" apart from "something a player actually put
// on the table" (e.g. `.tl-shape[data-shape-type="image"]:not([data-shape-id*="${FURNITURE_IMAGE_ID_MARKER}"])`),
// without hand-duplicating each furniture piece's naming scheme. See
// verify-life-counter.spec.ts.
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

// Furniture (playmat, library, command zone, graveyard, exile, name label, the
// Stack) draws from a separate band, always below the ZERO_INDEX_KEY that
// `nextIndex` counts up from — so any playmat, however late a seat joins, is
// guaranteed beneath every card that exists, has ever existed, or ever will,
// regardless of mint order. This is what makes "furniture is always behind
// everything" structurally true instead of an accident of join order.
const lowestFurnitureIndexByRoom = new Map<string, IndexKey>();
function nextFurnitureIndex(tableName: string): IndexKey {
  const next = getIndexBelow(lowestFurnitureIndexByRoom.get(tableName) ?? null);
  lowestFurnitureIndexByRoom.set(tableName, next);
  return next;
}

/**
 * Zones a card can be detected entering (01-zone-entry-events, upgraded in
 * tabletop-physics ticket 13 to real `mtg-zone` shapes).
 */
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
}

/**
 * Furniture (playmat, library, graveyard, exile, the Stack) as an `mtg-zone`
 * shape (tabletop-physics ticket 13) — always locked; tldraw's own
 * context-menu Lock/Unlock is the sole unlock affordance. `MtgZoneShapeUtil`
 * decides the visual treatment (dashed vs. playmat's solid border) from
 * `props.zone`. `opacity: 0.5` matches the pre-ticket-13 `regionShape`'s
 * look (furniture read as a faint outline, not a solid block).
 */
export function zoneShape({ id, pageId, x, y, w, h, label, index, zone, seatId, sleeveColor }: ZoneShapeArgs): MtgZoneShape {
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
    // A sleeved library pile must be as vivid as the cards it represents, so
    // the shape's own opacity is 1 and MtgZoneShapeUtil fades just the box
    // chrome back to 0.5 — the same composite the plain furniture gets.
    opacity: sleeveColor ? 1 : 0.5,
    props: { w, h, zone, seatId, label, sleeveColor: sleeveColor ?? null } satisfies MtgZoneShapeProps,
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

/**
 * An `mtg-card` shape record — the one place every required `mtg-card` prop
 * is listed, shared by every seam that mints a card server-side
 * (cardArrival.ts's ordinary arrivals, seatJoined.ts's commanders and their
 * ghosts — table-layout ticket 18). A required prop added here can't drift
 * out of sync between mint sites.
 */
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
    // No traceparent in meta — cards persist; traces don't. Zone membership
    // lands here once a card is dragged (MtgCardShapeUtil.onTranslateEnd) —
    // empty at mint time.
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
    // sleeveColor wins (contract: seat.joined.v1) — a sleeved seat drops the
    // card back entirely rather than keeping a loser around to mix up later.
    cardBackImageUrl: look.sleeveColor ? undefined : look.cardBackImageUrl,
    sleeveColor: look.sleeveColor,
    landCount: 0,
    graveyardCount: 0,
    stackCount: 0,
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
  const matImageId = createShapeId(`${FURNITURE_IMAGE_ID_MARKER}playmat-${entry.tableName}-${seatId}`);
  const libraryId = createShapeId(`library-${entry.tableName}-${seatId}`);
  const libraryImageId = createShapeId(`${FURNITURE_IMAGE_ID_MARKER}library-${entry.tableName}-${seatId}`);
  const commandZoneId = createShapeId(`region-command-${entry.tableName}-${seatId}`);
  const graveyardId = createShapeId(`region-graveyard-${entry.tableName}-${seatId}`);
  const exileId = createShapeId(`region-exile-${entry.tableName}-${seatId}`);
  const labelId = createShapeId(`name-label-${entry.tableName}-${seatId}`);
  const lifeCounterId = createShapeId(`life-counter-${entry.tableName}-${seatId}`);

  await entry.room.updateStore((store) => {
    // The mat outline is always drawn — the fallback if the image is missing/broken.
    store.put(
      zoneShape({ id: matId, pageId, x: mat.x, y: mat.y, w: mat.w, h: mat.h, label: "", index: nextFurnitureIndex(entry.tableName), zone: "playmat", seatId })
    );
    if (look.playmatImageUrl) {
      const assetId = AssetRecordType.createId(`playmat-${entry.tableName}-${seatId}`);
      store.put(imageAsset(assetId, `${playerName}'s playmat`, look.playmatImageUrl, mat.w, mat.h));
      store.put(imageShape(matImageId, pageId, mat.x, mat.y, mat.w, mat.h, assetId, `${playerName}'s playmat`, nextFurnitureIndex(entry.tableName)));
    }

    // A sleeved seat's pile is drawn by the zone shape itself (ticket 17):
    // MtgZoneShapeUtil renders props.sleeveColor as the bare sleeve rectangle,
    // inset like the image so the box's border and label still frame it. No
    // image shape, so nothing opaque covers the zone's interior.
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
      // An opaque image shape hides whatever's underneath it (tldraw limit), so the
      // border and "Library" label have to read as an outward frame: the box is at
      // full bounds above, and the image insets within it so the box's edge — and
      // the label riding on it — stays visible as a ring around the picture. The
      // top inset is the label band, so the label sits fully above the pile.
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

    store.put({
      id: labelId,
      typeName: "shape",
      type: "text",
      x: namePos.x,
      y: namePos.y,
      rotation: 0,
      index: nextFurnitureIndex(entry.tableName),
      parentId: pageId,
      isLocked: true, // fixes a live bug: any player could drag/delete another player's name
      opacity: 1,
      // One line, player name first, at double size (design ruling 2026-08-09,
      // superseding the 2026-08-08 two-line ruling): `Name 〜 Deck`, joined by a
      // wave-dash swoosh. A very long deck name can grow the autoSized label
      // toward the neighboring seat — accepted trade-off for the bigger label.
      props: {
        richText: toRichText(look.deckName ? `${playerName} 〜 ${look.deckName}` : playerName),
        color: "green",
        size: "m",
        font: "serif",
        textAlign: "start",
        autoSize: true,
        w: 200,
        scale: 2,
      },
      meta: {},
    } as any);

    // Life counter (ticket 20): locked furniture, starts at 40, far right of
    // the name row. +/- and typing work through DOM events inside its own
    // component() — locking only gates tldraw's gesture state machine.
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
      props: { w: LIFE_COUNTER_W, h: LIFE_COUNTER_H, value: 40 },
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
    "card_back.image_present": Boolean(area.cardBackImageUrl),
    "sleeve.present": Boolean(area.sleeveColor),
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
        index: nextFurnitureIndex(entry.tableName),
        zone: "stack",
        seatId: null,
      })
    );
  });
}
