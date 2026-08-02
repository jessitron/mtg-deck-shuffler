import { ImageShapeUtil, TLImageShape, TLShapePartial, Vec } from "tldraw";

const TAU = Math.PI * 2;
const TAP_ANGLE = Math.PI / 2;
// Tolerance for "is this card untapped" — rotation is a float, so an exact
// `=== 0` check would miss floating-point drift.
const UNTAPPED_EPSILON = 0.01;

/**
 * JES-144: tap/untap a card by clicking it. This mirrors the physical
 * gesture — a toggle between untapped (0°) and tapped (90°), not a 4-way
 * rotation cycle — so a second click always taps it back rather than
 * continuing on to 180°/270°.
 *
 * Cards are stock tldraw `image` shapes identified by `meta.instanceId` (see
 * cardArrival.ts); furniture images (playmat/library backgrounds) are also
 * type "image" but locked, so they never reach onClick and are left at
 * tldraw's default behavior.
 *
 * Extends the built-in ImageShapeUtil rather than introducing a new shape
 * type, so crop/resize/rendering/migrations stay exactly as tldraw ships
 * them — only click behavior differs.
 */
export class MtgCardImageShapeUtil extends ImageShapeUtil {
  override onClick(shape: TLImageShape): TLShapePartial<TLImageShape> | undefined {
    if (!shape.meta?.instanceId) return undefined;

    const current = ((shape.rotation % TAU) + TAU) % TAU;
    const isUntapped = current < UNTAPPED_EPSILON || current > TAU - UNTAPPED_EPSILON;
    const rotation = isUntapped ? TAP_ANGLE : 0;

    // shape.x/y is the card's top-left corner, and rotation pivots around
    // that point, not the card's center — so setting `rotation` alone would
    // swing the card around its corner. Hold the center fixed instead: find
    // it under the current rotation, then solve for the top-left that puts
    // the same center under the new rotation.
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
    };
  }
}
