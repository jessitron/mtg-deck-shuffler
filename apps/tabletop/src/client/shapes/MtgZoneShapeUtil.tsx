import { BaseBoxShapeUtil, HTMLContainer } from "tldraw";
import { MtgZoneShape, mtgZoneShapeProps } from "../../shared/mtgZoneShape";

/**
 * tabletop-physics ticket 13: `mtg-zone`, a genuine custom shape for
 * furniture (playmat, library, graveyard, exile, the Stack) rather than
 * stock locked `geo`/`image` shapes tagged with a freeform `meta.zone`
 * string. Zones are always `isLocked: true` (set where they're created,
 * tableFurniture.ts) and never enter tldraw's normal selection/pointing
 * flow at all — `SelectTool`'s `Idle` state gates on `isLocked` before a
 * locked shape ever reaches `PointingShape`, and `Editor.getDraggingOverShape`
 * filters out locked shapes before checking for drag-over hooks. So this
 * ShapeUtil deliberately defines no `onClick`/`onTranslateEnd`/
 * `onDragShapesOver` — there's nothing those hooks could ever be asked to do
 * for a locked shape, and giving it an `onClick` later (e.g. a custom
 * unlock affordance) wouldn't reopen mtg-card's onClick/PointingShape
 * selection-deferral quirk, since that quirk is gated on the SAME
 * `isLocked` check. Unlocking, if it ever happens, stays tldraw's own
 * context-menu Lock/Unlock — the sole unlock affordance per the ticket.
 *
 * Zone-entry detection stays card-side (MtgCardShapeUtil's `onTranslateEnd`)
 * for exactly this reason: a locked shape can't be a drag target.
 *
 * The retokenized look (dashed --dark-pink at rest, armed glow) is ticket
 * 14's job; this keeps today's plain dashed-grey / solid-black-playmat look,
 * just moved onto a real shape type.
 */
export class MtgZoneShapeUtil extends BaseBoxShapeUtil<MtgZoneShape> {
  static override type = "mtg-zone" as const;
  static override props = mtgZoneShapeProps;

  override getDefaultProps(): MtgZoneShape["props"] {
    return { w: 100, h: 100, zone: "playmat", seatId: null, label: "" };
  }

  override isAspectRatioLocked(): boolean {
    return false;
  }

  component(shape: MtgZoneShape) {
    const { w, h, zone, label } = shape.props;
    const playmat = zone === "playmat";
    return (
      <HTMLContainer id={shape.id}>
        <div
          style={{
            width: w,
            height: h,
            boxSizing: "border-box",
            border: playmat ? "10px solid black" : "2px dashed grey",
            color: playmat ? "black" : "grey",
            // tldraw's own serif token (loaded font-face, see tldraw.css
            // --tl-font-serif), matching the label's stock-geo look this
            // shape replaces — not a design decision, parity with the size
            // tldraw's own "s"/"xl" geo label rendering used before ticket 13.
            fontFamily: "var(--tl-font-serif)",
            fontSize: 24,
            padding: 4,
          }}
        >
          {label}
        </div>
      </HTMLContainer>
    );
  }

  override getIndicatorPath(shape: MtgZoneShape) {
    const path = new Path2D();
    path.rect(0, 0, shape.props.w, shape.props.h);
    return path;
  }
}
