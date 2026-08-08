import { BaseBoxShapeUtil, HTMLContainer, TLShapePartial, Vec } from "tldraw";
import { MtgCardShape, mtgCardShapeProps } from "../../shared/mtgCardShape";

const TAP_ANGLE = Math.PI / 2;

/**
 * JES-144, tabletop-physics ticket 12: `mtg-card`, a genuine custom shape
 * (see MtgCardShapeProps) rather than a stock `image` shape borrowed for
 * cards, furniture, and stray drops alike. Tap state lives in `props.tapped`
 * — never read back out of rotation — so free rotation and tap compose
 * independently instead of one clobbering the other's read of "is this
 * tapped".
 */
export class MtgCardShapeUtil extends BaseBoxShapeUtil<MtgCardShape> {
  static override type = "mtg-card" as const;
  static override props = mtgCardShapeProps;

  override getDefaultProps(): MtgCardShape["props"] {
    return {
      w: 170,
      h: 238,
      instanceId: "",
      scryfallId: "",
      cardName: "",
      frontImageUrl: "",
      backImageUrl: null,
      face: "front",
      faceDown: false,
      tapped: false,
    };
  }

  override isAspectRatioLocked(): boolean {
    return true;
  }

  component(shape: MtgCardShape) {
    const { frontImageUrl, backImageUrl, face, cardName } = shape.props;
    const src = (face === "back" ? backImageUrl : frontImageUrl) ?? frontImageUrl;
    return (
      <HTMLContainer id={shape.id}>
        {/* tl-html-container is `pointer-events: none` by default (tldraw.css)
            so hover/click reach whatever's behind it; tldraw's own image/video
            shapes re-enable hit-testing via .tl-image-container's `pointer-
            events: all` — reusing that class here rather than reinventing it. */}
        <div className="tl-image-container">
          <img className="tl-image" src={src} alt={cardName} draggable={false} />
        </div>
      </HTMLContainer>
    );
  }

  override getIndicatorPath(shape: MtgCardShape) {
    const path = new Path2D();
    path.rect(0, 0, shape.props.w, shape.props.h);
    return path;
  }

  // JES-144: tap/untap a card by clicking it — a toggle, not a 4-way
  // rotation cycle, so a second click always taps it back. `props.tapped` is
  // the source of truth; rotation is purely visual and additive on top of it,
  // applied as a delta so it composes with whatever free rotation left the
  // card at, instead of snapping to an absolute angle.
  override onClick(shape: MtgCardShape): TLShapePartial<MtgCardShape> | undefined {
    const tapped = !shape.props.tapped;
    const delta = tapped ? TAP_ANGLE : -TAP_ANGLE;
    const rotation = shape.rotation + delta;

    // shape.x/y is the card's top-left corner, and rotation pivots around
    // that point, not the card's center — so applying the delta to rotation
    // alone would swing the card around its corner. Hold the center fixed
    // instead: find it under the current rotation, then solve for the
    // top-left that puts the same center under the new rotation.
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
  // their own ShapeUtil (ticket 13's job, not this one).
  //
  // Debounce state rides on the card's `meta.zone` — the last zone this card
  // was known to be in — so re-entering a zone it already left still counts
  // as a fresh entry, but staying put (or a tiny in-zone nudge) doesn't. Zone
  // membership deliberately stays out of `props`: see MtgCardShapeProps.
  override onTranslateEnd(_initial: MtgCardShape, current: MtgCardShape): TLShapePartial<MtgCardShape> | undefined {
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
      // a real consumer is later tickets' job (tabletop-survives-restart).
      console.log(`zone-entry ${current.props.instanceId} ${zone}`);
    }

    return {
      id: current.id,
      type: current.type,
      meta: { ...current.meta, zone: zone ?? null },
    };
  }

  /** Which zone (if any) the shape's center currently rests in. */
  private zoneAt(shape: MtgCardShape): string | undefined {
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
