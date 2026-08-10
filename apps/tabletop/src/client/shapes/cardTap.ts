import { TLShapePartial, Vec } from "tldraw";
import { MtgCardShape } from "../../shared/mtgCardShape";

const TAP_ANGLE = Math.PI / 2;

// The tap write for one card: toggle `props.tapped` and apply the ±90°
// rotation delta. shape.x/y is the card's top-left corner, and rotation
// pivots around that point, not the card's center — so applying the delta
// to rotation alone would swing the card around its corner. Hold the
// center fixed instead: find it under the current rotation, then solve
// for the top-left that puts the same center under the new rotation.
//
// Pulled out of MtgCardShapeUtil (ticket 17) as a standalone pure function —
// no `this.editor`, so both the shape's own onClick and the context menu's
// Tap/Untap item can share one implementation.
export function tapPartial(shape: MtgCardShape, tapped: boolean): TLShapePartial<MtgCardShape> {
  const delta = tapped ? TAP_ANGLE : -TAP_ANGLE;
  const rotation = shape.rotation + delta;

  const { w, h } = shape.props;
  const halfExtent = { x: w / 2, y: h / 2 };
  const center = Vec.Add(shape, Vec.Rot(halfExtent, shape.rotation));
  const topLeft = Vec.Sub(center, Vec.Rot(halfExtent, rotation));

  return {
    id: shape.id,
    type: shape.type,
    x: topLeft.x,
    y: topLeft.y,
    rotation,
    props: { ...shape.props, tapped },
  };
}
