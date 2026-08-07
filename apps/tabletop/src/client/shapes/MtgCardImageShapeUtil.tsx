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

  // Ticket 01-zone-entry-events: name "this card instance entered this
  // zone" as a distinct occurrence, once per real zone change — not once
  // per drag frame, and not re-fired for staying in (or returning to) the
  // same zone.
  //
  // `onTranslateEnd` (fired once, on the *moved* card, when a drag settles)
  // rather than `onDragShapesOver`/`onDropShapesOver` (fired on the
  // *target*, every frame while dragging): the zones tableFurniture.ts
  // draws are stock, locked `geo`/`image` shapes, not a custom ShapeUtil,
  // so there's nothing to hang a target-side hook on without giving zones
  // their own ShapeUtil — a bigger change this ticket doesn't need. Firing
  // once on settle also matches what the acceptance criteria actually
  // wants: a single occurrence per drag, named by where the card came to
  // rest, not a stream of over/under events during the drag.
  //
  // Debounce state rides on the card's own `meta.zone` (alongside the
  // existing `instanceId`/`scryfallId`/`cardName` identity fields) — the
  // last zone this card was known to be in — so re-entering a zone it
  // already left still counts as a fresh entry, but staying put (or a tiny
  // in-zone nudge) doesn't.
  override onTranslateEnd(_initial: TLImageShape, current: TLImageShape): TLShapePartial<TLImageShape> | undefined {
    if (!current.meta?.instanceId) return undefined;

    // tldraw bug workaround: because this ShapeUtil defines `onClick`,
    // tldraw's SelectTool defers selecting the pointed-at shape until
    // pointer-up (PointingShape.onEnter in node_modules/tldraw/src/lib/tools/
    // SelectTool/childStates/PointingShape.ts skips select-on-enter whenever
    // `getShapeUtil(shape).onClick` is truthy). If the drag threshold is
    // crossed before pointer-up, `startTranslating` only forces a reselect
    // of the actually-hit shape when NOTHING is currently selected:
    //   if (!this.didSelectOnEnter && !this.editor.getSelectedShapeIds().length)
    // Since tldraw leaves the just-dragged card selected after a drag ends,
    // that guard is false on the next drag — so dragging a second,
    // still-selected-from-before card silently re-translates the FIRST
    // (still-selected) card instead of the one under the pointer. Clearing
    // selection here — on every drag settle, not just on a zone change —
    // makes the next drag's guard see an empty selection and correctly pick
    // up whichever card the pointer actually lands on.
    this.editor.setSelectedShapes([]);

    const zone = this.zoneAt(current);
    const previousZone = (current.meta?.zone as string | undefined) ?? undefined;
    if (zone === previousZone) return undefined;

    if (zone) {
      // Descoped 2026-08-06 (Jess): no callback/emitter/queue yet — nothing
      // downstream consumes this. A plain console.log is the whole
      // notification surface for now, proving the detection logic; wiring
      // a real consumer (and, eventually, routing this through the
      // Tabletop's telemetry as a span attribute or log.ts call) is later
      // tickets' job (tabletop-survives-restart).
      console.log(`zone-entry ${current.meta.instanceId} ${zone}`);
    }

    return {
      id: current.id,
      type: current.type,
      meta: { ...current.meta, zone: zone ?? null },
    };
  }

  /** Which zone (if any) the shape's center currently rests in. */
  private zoneAt(shape: TLImageShape): string | undefined {
    const bounds = this.editor.getShapePageBounds(shape);
    if (!bounds) return undefined;
    const center = bounds.center;

    for (const candidate of this.editor.getCurrentPageShapes()) {
      const zone = candidate.meta?.zone;
      if (typeof zone !== "string") continue;
      const candidateBounds = this.editor.getShapePageBounds(candidate);
      if (candidateBounds?.containsPoint(center)) return zone;
    }
    return undefined;
  }
}
