import { Editor, TLDragShapesOutInfo, TLShape } from "tldraw";
import { MtgCardShape } from "../../shared/mtgCardShape";
import { Vec } from "tldraw";

// Ticket 01 (organizational split): the passenger-drag hooks' bodies,
// pulled out of MtgCardShapeUtil.tsx verbatim, `this.editor` passed
// explicitly as `editor` instead. Still tldraw-dependent (Editor,
// reparentShapes' rotation-preservation quirk below) — see the ticket for
// why no tldraw-free boundary exists cleanly here.

// Ticket 19: notes ride along exactly like counters — same accept-list, same
// battlefield-exit eviction. "Passenger" is anything a card hosts by
// parenting; not the card's own props, per ticket 02's "the card carries
// nothing about its passengers."
export const PASSENGER_TYPES = new Set(["mtg-counter", "note"]);

// Ticket 18 (counters): the card hosts counters via tldraw's native
// drag-and-drop parenting — a deliberate, narrow exception to "the card
// carries nothing about its passengers": the card's util MEDIATES the drop,
// but the resulting parent relationship (the counter's parentId, not any
// list on the card's props) is what carries the state. Defining any of
// these hooks makes every card a drag target for every unlocked dragged
// shape (getDraggingOverShape checks only that hooks exist), so both `can*`
// gates are type-narrowed to counters — without the canRemoveChildrenOfType
// gate (default: true for ALL types), dragging card A across card B would
// fire B.onDragShapesOut(B, [cardA]).
export function canReceivePassenger(shape: MtgCardShape, type: TLShape["type"]): boolean {
  return !shape.isLocked && PASSENGER_TYPES.has(type);
}

export function canRemovePassenger(type: TLShape["type"]): boolean {
  return PASSENGER_TYPES.has(type);
}

// Live reparent during the drag (the frame pattern) — DragAndDropManager
// has already filtered `shapes` through canReceiveNewChildrenOfType, and it
// hints this card (the hover-highlight) whenever any shape is receivable.
export function handleDragShapesIn(editor: Editor, card: MtgCardShape, shapes: TLShape[]): void {
  if (shapes.some((s) => editor.hasAncestor(card, s.id))) return;
  editor.reparentShapes(shapes, card.id);

  // reparentShapes preserves page rotation, so a passenger dropped on an
  // already-tapped card would keep a compensating local rotation forever —
  // visibly tilted after the card untaps. Passengers are card-aligned: zero
  // the local rotation, holding the passenger's center fixed (rotation
  // pivots around the top-left corner; zeroing it alone would swing it
  // sideways — same math as onClick's tap pivot). Geometry bounds, not
  // `props.w/h`: a note has no w/h prop (its size comes from a style enum
  // plus `growY`), but every shape's geometry does.
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

// Dragged off the card and not into another receiver: detached, staying
// wherever it's dropped. Only the dragged shapes that are currently THIS
// card's children — a multi-shape drag containing someone else's counter
// must not touch it, and this card's other counters stay put.
export function handleDragShapesOut(editor: Editor, card: MtgCardShape, shapes: TLShape[], info: TLDragShapesOutInfo): void {
  if (info.nextDraggingOverShapeId) return;
  const mine = shapes.filter((s) => s.parentId === card.id);
  if (mine.length === 0) return;
  editor.reparentShapes(mine, editor.getCurrentPageId());
}
