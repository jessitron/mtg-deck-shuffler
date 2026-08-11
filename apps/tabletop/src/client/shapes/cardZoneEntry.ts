import { Editor, TLShape, TLShapePartial } from "tldraw";
import { MtgCardShape } from "../../shared/mtgCardShape";
import { findOpenSpotsNearZoneEdge, Rect } from "./openSpotNearZoneEdge";
import { topmostZoneAt, ZoneHit } from "./zoneHitTest";
import { PASSENGER_TYPES } from "./cardPassengers";


const NON_BATTLEFIELD_ZONES = new Set(["graveyard", "exile", "library"]);

export function handleTranslateEnd(editor: Editor, current: MtgCardShape): TLShapePartial<MtgCardShape> | undefined {
  const zoneHit = zoneAt(editor, current);
  const zone = zoneHit?.zone;
  const previousZone = (current.meta?.zone as string | undefined) ?? undefined;
  if (zone === previousZone) return undefined;

  if (zoneHit) {

    if (NON_BATTLEFIELD_ZONES.has(zoneHit.zone)) {
      evictPassengers(editor, current, zoneHit);
    }
  }

  const resetFace = zoneHit?.zone === "library" && (current.props.face !== "front" || current.props.faceDown);

  return {
    id: current.id,
    type: current.type,
    ...(resetFace ? { props: { ...current.props, face: "front" as const, faceDown: false } } : {}),
    meta: { ...current.meta, zone: zone ?? null },
  };
}

function zoneAt(editor: Editor, shape: MtgCardShape): ZoneHit | undefined {
  const bounds = editor.getShapePageBounds(shape);
  return bounds ? topmostZoneAt(editor, bounds.center) : undefined;
}

function evictPassengers(editor: Editor, card: MtgCardShape, zoneHit: ZoneHit): void {
  const passengers = editor
    .getSortedChildIdsForParent(card.id)
    .map((id) => editor.getShape(id))
    .filter((s): s is TLShape => !!s && PASSENGER_TYPES.has(s.type));
  if (passengers.length === 0) return;

  const zoneBounds = editor.getShapePageBounds(zoneHit.id);
  const cardBounds = editor.getShapePageBounds(card);
  if (!zoneBounds || !cardBounds) return;

  const passengerIds = new Set(passengers.map((p) => p.id));
  const occupied: Rect[] = [];
  for (const shape of editor.getCurrentPageShapes()) {
    if (shape.type !== "mtg-card" && !PASSENGER_TYPES.has(shape.type)) continue;
    if (passengerIds.has(shape.id)) continue;
    const bounds = editor.getShapePageBounds(shape);
    if (bounds) occupied.push({ x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h });
  }

  const spotSize = editor.getShapeGeometry(passengers[0]).bounds.w;
  const spots = findOpenSpotsNearZoneEdge({
    zone: { x: zoneBounds.x, y: zoneBounds.y, w: zoneBounds.w, h: zoneBounds.h },
    entry: { x: cardBounds.center.x, y: cardBounds.center.y },
    spotSize,
    occupied,
    count: passengers.length,
  });

  editor.reparentShapes(
    passengers.map((p) => p.id),
    editor.getCurrentPageId(),
  );
  editor.animateShapes(
    passengers.map((p, i) => ({ id: p.id, type: p.type, x: spots[i].x, y: spots[i].y, rotation: 0 })),
    { animation: { duration: 200 } },
  );
}
