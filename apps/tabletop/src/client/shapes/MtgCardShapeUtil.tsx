import { BaseBoxShapeUtil, HTMLContainer, TLDragShapesOutInfo, TLShape, TLShapePartial, Vec } from "tldraw";
import { MtgCardShape, mtgCardShapeProps } from "../../shared/mtgCardShape";
import { MtgCounterShape } from "../../shared/mtgCounterShape";
import { findOpenSpotsNearZoneEdge, Rect } from "./openSpotNearZoneEdge";
import { swallowIntoLibraryPortal } from "./portalGesturePrototype";
import { topmostZoneAt, ZoneHit } from "./zoneHitTest";

const TAP_ANGLE = Math.PI / 2;

// Ticket 18: counters detach the instant their host card leaves the
// battlefield — one rule, no per-zone special-casing. Battlefield = the
// playmat, the command zone, the bare table (no zone at all) — and the
// Stack, deliberately: cards ARRIVE on the Stack, so their first settled
// move fires a zone-entry for it, and evicting counters for a nudge around
// the Stack would strip every counter the moment one was attached there.
// The detach set is exactly the ticket's list minus "hand", which doesn't
// exist as a zone here yet.
const NON_BATTLEFIELD_ZONES = new Set(["graveyard", "exile", "library"]);

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

  // PROTOTYPE (portal gesture ticket 04): animateShapes only interpolates
  // x/y/rotation/opacity itself; props interpolation is delegated here. Lerp
  // w/h so the swallow's shrink actually animates instead of snapping.
  override getInterpolatedProps(start: MtgCardShape, end: MtgCardShape, t: number): MtgCardShape["props"] {
    return {
      ...end.props,
      w: start.props.w + (end.props.w - start.props.w) * t,
      h: start.props.h + (end.props.h - start.props.h) * t,
    };
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
  override canReceiveNewChildrenOfType(shape: MtgCardShape, type: TLShape["type"]): boolean {
    return !shape.isLocked && type === "mtg-counter";
  }

  override canRemoveChildrenOfType(_shape: MtgCardShape, type: TLShape["type"]): boolean {
    return type === "mtg-counter";
  }

  // Live reparent during the drag (the frame pattern) — DragAndDropManager
  // has already filtered `shapes` through canReceiveNewChildrenOfType, and it
  // hints this card (the hover-highlight) whenever any shape is receivable.
  override onDragShapesIn(card: MtgCardShape, shapes: TLShape[]): void {
    if (shapes.some((s) => this.editor.hasAncestor(card, s.id))) return;
    this.editor.reparentShapes(shapes, card.id);

    // reparentShapes preserves page rotation, so a counter dropped on an
    // already-tapped card would keep a compensating local rotation forever —
    // visibly tilted after the card untaps. Counters are card-aligned: zero
    // the local rotation, holding the counter's center fixed (rotation pivots
    // around the top-left corner; zeroing it alone would swing a disc ~40%
    // of its size sideways — same math as onClick's tap pivot).
    for (const dropped of shapes) {
      const fresh = this.editor.getShape<MtgCounterShape>(dropped.id);
      if (!fresh || fresh.rotation === 0) continue;
      const halfExtent = { x: fresh.props.w / 2, y: fresh.props.h / 2 };
      const center = Vec.Add(fresh, Vec.Rot(halfExtent, fresh.rotation));
      const topLeft = Vec.Sub(center, halfExtent);
      this.editor.updateShape<MtgCounterShape>({
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
  override onDragShapesOut(card: MtgCardShape, shapes: TLShape[], info: TLDragShapesOutInfo): void {
    if (info.nextDraggingOverShapeId) return;
    const mine = shapes.filter((s) => s.parentId === card.id);
    if (mine.length === 0) return;
    this.editor.reparentShapes(mine, this.editor.getCurrentPageId());
  }

  // Ticket 01-zone-entry-events: name "this card instance entered this
  // zone" as a distinct occurrence, once per real zone change — not once
  // per drag frame, and not re-fired for staying in (or returning to) the
  // same zone.
  //
  // `onTranslateEnd` (fired once, on the *moved* card, when a drag settles)
  // rather than `onDragShapesOver`/`onDropShapesOver` (fired on the
  // *target*, every frame while dragging): zones are `mtg-zone` shapes
  // (ticket 13) but always `isLocked: true`, and `Editor.getDraggingOverShape`
  // filters out locked shapes before checking for target-side hooks at all —
  // so a target-side hook on the zone could never fire regardless of whether
  // `MtgZoneShapeUtil` defined one.
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

    const zoneHit = this.zoneAt(current);
    const zone = zoneHit?.zone;
    const previousZone = (current.meta?.zone as string | undefined) ?? undefined;
    if (zone === previousZone) return undefined;

    if (zoneHit) {
      // Descoped 2026-08-06 (Jess): no callback/emitter/queue yet — nothing
      // downstream consumes this. A plain console.log is the whole
      // notification surface for now, proving the detection logic; wiring
      // a real consumer is later tickets' job (tabletop-survives-restart).
      console.log(`zone-entry ${current.props.instanceId} ${zoneHit.zone}`);

      // Ticket 18: the card just left the battlefield — its counters don't
      // follow it into the graveyard/exile/library. They detach and
      // scoot to an open spot near the zone's edge, staying on the table.
      // This has to be driven from here: a parented shape's own
      // onTranslateEnd never fires when only its parent moves.
      if (NON_BATTLEFIELD_ZONES.has(zoneHit.zone)) {
        this.evictCounters(current, zoneHit);
      }

      // PROTOTYPE (portal gesture, wayfinder cards-come-and-go ticket 04):
      // the library swallows the card. Deletes only `current` (self), and
      // deferred — see swallowIntoLibraryPortal.
      if (zoneHit.zone === "library") {
        swallowIntoLibraryPortal(this.editor, current, zoneHit);
      }
    }

    return {
      id: current.id,
      type: current.type,
      meta: { ...current.meta, zone: zone ?? null },
    };
  }

  /**
   * Which zone (if any) the shape's center currently rests in. Matches real
   * `mtg-zone` shapes (tabletop-physics ticket 13) rather than a bare
   * `meta.zone` string tag — a locked shape can never be a drag target
   * (`Editor.getDraggingOverShape` filters `!isLocked` first), so this stays
   * a card-side scan rather than a zone-side `onDragShapesOver` hook. When
   * the card's center overlaps more than one zone, the topmost-drawn zone
   * wins — see `topmostZoneAt` (shared with the zone's own armed-state
   * check, tabletop-physics ticket 14).
   */
  private zoneAt(shape: MtgCardShape): ZoneHit | undefined {
    const bounds = this.editor.getShapePageBounds(shape);
    return bounds ? topmostZoneAt(this.editor, bounds.center) : undefined;
  }

  // Ticket 18: detach every counter riding this card and land each at an
  // open spot near the destination zone's edge — outside the zone, on the
  // table. "Occupied" considers only the small movable stuff (cards and
  // counters); furniture is fair ground to sit on, same as real cardboard.
  private evictCounters(card: MtgCardShape, zoneHit: ZoneHit): void {
    const counters = this.editor
      .getSortedChildIdsForParent(card.id)
      .map((id) => this.editor.getShape<MtgCounterShape>(id))
      .filter((s): s is MtgCounterShape => s?.type === "mtg-counter");
    if (counters.length === 0) return;

    const zoneBounds = this.editor.getShapePageBounds(zoneHit.id);
    const cardBounds = this.editor.getShapePageBounds(card);
    if (!zoneBounds || !cardBounds) return;

    const counterIds = new Set(counters.map((c) => c.id));
    const occupied: Rect[] = [];
    for (const shape of this.editor.getCurrentPageShapes()) {
      if (shape.type !== "mtg-card" && shape.type !== "mtg-counter") continue;
      if (counterIds.has(shape.id as MtgCounterShape["id"])) continue;
      const bounds = this.editor.getShapePageBounds(shape);
      if (bounds) occupied.push({ x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h });
    }

    const spots = findOpenSpotsNearZoneEdge({
      zone: { x: zoneBounds.x, y: zoneBounds.y, w: zoneBounds.w, h: zoneBounds.h },
      entry: { x: cardBounds.center.x, y: cardBounds.center.y },
      spotSize: counters[0].props.w,
      occupied,
      count: counters.length,
    });

    this.editor.reparentShapes(
      counters.map((c) => c.id),
      this.editor.getCurrentPageId(),
    );
    this.editor.animateShapes(
      counters.map((c, i) => ({ id: c.id, type: c.type, x: spots[i].x, y: spots[i].y, rotation: 0 })),
      { animation: { duration: 200 } },
    );
  }
}
