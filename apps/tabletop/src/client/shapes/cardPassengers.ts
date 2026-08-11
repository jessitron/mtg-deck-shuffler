import { Editor, TLDragShapesOutInfo, TLShape } from "tldraw";
import { MtgCardShape } from "../../shared/mtgCardShape";
import { Vec } from "tldraw";


export const PASSENGER_TYPES = new Set(["mtg-counter", "note"]);

export function canReceivePassenger(shape: MtgCardShape, type: TLShape["type"]): boolean {
  return !shape.isLocked && PASSENGER_TYPES.has(type);
}

export function canRemovePassenger(type: TLShape["type"]): boolean {
  return PASSENGER_TYPES.has(type);
}

export function handleDragShapesIn(editor: Editor, card: MtgCardShape, shapes: TLShape[]): void {
  if (shapes.some((s) => editor.hasAncestor(card, s.id))) return;
  editor.reparentShapes(shapes, card.id);

  for (const dropped of shapes) {
    const fresh = editor.getShape(dropped.id);
    if (!fresh || fresh.rotation === 0) continue;
    const { w, h } = editor.getShapeGeometry(fresh).bounds;
    const halfExtent = { x: w / 2, y: h / 2 };
    const center = Vec.Add(fresh, Vec.Rot(halfExtent, fresh.rotation));
    const topLeft = Vec.Sub(center, halfExtent);
    editor.updateShape({
      id: fresh.id,
      type: fresh.type,
      x: topLeft.x,
      y: topLeft.y,
      rotation: 0,
    });
  }
}

export function handleDragShapesOut(editor: Editor, card: MtgCardShape, shapes: TLShape[], info: TLDragShapesOutInfo): void {
  if (info.nextDraggingOverShapeId) return;
  const mine = shapes.filter((s) => s.parentId === card.id);
  if (mine.length === 0) return;
  editor.reparentShapes(mine, editor.getCurrentPageId());
}
