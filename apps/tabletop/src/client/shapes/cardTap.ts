import { TLShapePartial, Vec } from "tldraw";
import { MtgCardShape } from "../../shared/mtgCardShape";

const TAP_ANGLE = Math.PI / 2;

interface Pose {
  x: number;
  y: number;
  rotation: number;
}

// A shape's x/y is its top-left corner, and rotation pivots around that
// point, not its center — so writing a new rotation alone swings the shape
// sideways. Hold the center fixed instead: find it under the current
// rotation, then solve for the top-left that puts the same center under the
// new rotation. Shared by tapPartial (rotation = current ± 90°) and
// MtgCardShapeUtil's zeroRotationHoldingCenter (rotation = 0) — same pivot
// math, different target angle and different source of halfExtent (a card's
// own props.w/h here; shape geometry bounds there, since that caller runs
// on any passenger type, not just cards).
export function rotateHoldingCenter(pose: Pose, halfExtent: { x: number; y: number }, rotation: number): Pose {
  const center = Vec.Add(pose, Vec.Rot(halfExtent, pose.rotation));
  const topLeft = Vec.Sub(center, Vec.Rot(halfExtent, rotation));
  return { x: topLeft.x, y: topLeft.y, rotation };
}

// The tap write for one card: toggle `props.tapped` and apply the ±90°
// rotation delta, holding the card's center fixed.
//
// Pulled out of MtgCardShapeUtil (ticket 17) as a standalone pure function —
// no `this.editor`, so both the shape's own onClick and the context menu's
// Tap/Untap item can share one implementation.
export function tapPartial(shape: MtgCardShape, tapped: boolean): TLShapePartial<MtgCardShape> {
  const delta = tapped ? TAP_ANGLE : -TAP_ANGLE;
  const { w, h } = shape.props;
  const pose = rotateHoldingCenter(shape, { x: w / 2, y: h / 2 }, shape.rotation + delta);

  return {
    id: shape.id,
    type: shape.type,
    x: pose.x,
    y: pose.y,
    rotation: pose.rotation,
    props: { ...shape.props, tapped },
  };
}

// Tap (or untap) each of `cards` to `tapped`. Cards already at the target
// state are left untouched — shared by the context menu's Tap/Untap item and
// MtgCardShapeUtil's ticket-16 multi-select propagation.
//
// Ticket 20 (corrected 2026-08-10): a tucked card is never a real tldraw
// child of its host (see MtgCardShapeUtil's tuck comment for why), so
// tapping a card never needs to compensate anything riding on it — there's
// no page-transform composition between two tucked cards at all, only a
// `meta.tuckedWith` link the util maintains by hand.
export function tapPartialsForCards(cards: MtgCardShape[], tapped: boolean): TLShapePartial<MtgCardShape>[] {
  return cards.filter((c) => c.props.tapped !== tapped).map((c) => tapPartial(c, tapped));
}
