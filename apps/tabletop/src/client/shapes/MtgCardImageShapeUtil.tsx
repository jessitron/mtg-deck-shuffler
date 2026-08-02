import { ImageShapeUtil, TLImageShape, TLShapePartial, Vec } from "tldraw";

/**
 * JES-144: rotate a card 90° by clicking it. Cards are stock tldraw `image`
 * shapes identified by `meta.instanceId` (see cardArrival.ts); furniture
 * images (playmat/library backgrounds) are also type "image" but locked, so
 * they never reach onClick and are left at tldraw's default behavior.
 *
 * Extends the built-in ImageShapeUtil rather than introducing a new shape
 * type, so crop/resize/rendering/migrations stay exactly as tldraw ships
 * them — only click behavior differs.
 */
export class MtgCardImageShapeUtil extends ImageShapeUtil {
  override onClick(shape: TLImageShape): TLShapePartial<TLImageShape> | undefined {
    if (!shape.meta?.instanceId) return undefined;

    // shape.x/y is the card's top-left corner, and rotation pivots around
    // that point, not the card's center — so a naive `rotation` bump alone
    // swings the card around its corner. Hold the center fixed instead: find
    // it under the current rotation, then solve for the top-left that puts
    // the same center under the new rotation.
    const { w, h } = shape.props;
    const halfExtent = { x: w / 2, y: h / 2 };
    const rotation = (shape.rotation + Math.PI / 2) % (Math.PI * 2);
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
