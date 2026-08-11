import { TLShapePartial, Vec } from "tldraw";
import { MtgCardShape } from "../../shared/mtgCardShape";

const TAP_ANGLE = Math.PI / 2;

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
