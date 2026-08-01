import { ImageShapeUtil, TLImageShape, TLShapePartial } from "tldraw";

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
    return {
      id: shape.id,
      type: shape.type,
      rotation: (shape.rotation + Math.PI / 2) % (Math.PI * 2),
    };
  }
}
