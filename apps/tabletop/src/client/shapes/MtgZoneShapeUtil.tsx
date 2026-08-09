import { BaseBoxShapeUtil, HTMLContainer } from "tldraw";
import { MtgZoneShape, mtgZoneShapeProps, LIBRARY_PILE_INSET } from "../../shared/mtgZoneShape";
import { useIsZoneArmed } from "./zoneHitTest";
import type { CSSProperties } from "react";

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
 * Visual treatment (tabletop-physics ticket 14) is the design already staged
 * and picked on `/design` (`.scratch/tabletop-physics/issues/
 * 11-what-a-zone-looks-like.md`'s "Answer", verified against the literal
 * candidate CSS in `apps/shuffler/public/design-candidates.css`'s
 * `.zone-mock--rest`/`.zone-mock--armed-glow` rather than just its prose
 * summary): dashed `--dark-pink` at rest with a faint tint, an amber
 * `--armed-glow` ring + tint when a dragged card is about to land here, and
 * the playmat keeping the Shuffler's own plain-black-border identity rather
 * than joining the dashed-pink family. The armed ring is additive on top of
 * whichever border a zone already has — `box-shadow` spreads *outward* from
 * the border edge (unlike `border-box`'s inward-drawn border), so it's the
 * one part of this treatment that survives being covered by the playmat's/
 * library's opaque `image` overlay (ticket 03): "the ring still shows" even
 * where the tint doesn't.
 */
export class MtgZoneShapeUtil extends BaseBoxShapeUtil<MtgZoneShape> {
  static override type = "mtg-zone" as const;
  static override props = mtgZoneShapeProps;

  override getDefaultProps(): MtgZoneShape["props"] {
    return { w: 100, h: 100, zone: "playmat", seatId: null, label: "", sleeveColor: null };
  }

  override isAspectRatioLocked(): boolean {
    return false;
  }

  component(shape: MtgZoneShape) {
    const { w, h, zone, label, sleeveColor } = shape.props;
    const playmat = zone === "playmat";
    // Reactive-only: never written to the store, so it produces no synced
    // document write and no undo entry, and is never visible on another
    // client's copy of this same zone shape — this player's drag is local.
    const armed = useIsZoneArmed(this.editor, shape.id);

    const style: CSSProperties = playmat
      ? {
          width: w,
          height: h,
          boxSizing: "border-box",
          border: "10px solid black", // untokenized on purpose — matches the Shuffler's mats exactly
          borderRadius: h * 0.05, // a proportion of the shape's own height, not a CSS % (draws an
          // ellipse on a non-square box) and not a fixed px (drifts out of proportion as the
          // canvas zooms) — computed fresh from props.h every render instead.
          color: "black",
        }
      : {
          width: w,
          height: h,
          boxSizing: "border-box",
          border: "2px dashed var(--dark-pink)",
          color: armed ? "var(--deep-space)" : "var(--dark-pink)",
          background: armed ? "rgba(230, 163, 61, 0.1)" : "rgba(187, 82, 119, 0.03)",
        };

    if (armed) {
      // A single box-shadow value assigned once — not two style objects each
      // setting boxShadow — sidesteps "box-shadow doesn't accumulate across
      // cascading CSS rules" (design choice 5); that gotcha is a stylesheet-
      // cascade problem, not one a single JS style object can hit.
      style.boxShadow = "0 0 0 3px var(--armed-glow), 0 0 16px 5px rgba(230, 163, 61, 0.65)"; /* --armed-glow, #e6a33d */
    }

    // Ticket 17: a sleeved seat's library pile — the bare sleeve rectangle,
    // inset like the card-back image so the box's border and label frame it.
    // The shape's own opacity is 1 when sleeved (tableFurniture.ts), so the
    // pile is as vivid as the cards; the box chrome fades itself back to 0.5
    // here, keeping the same composite the plain furniture gets. Square
    // corners: sleeves are rectangular (Jess, 2026-08-09), same as the
    // sleeved cards themselves.
    const sleevePile = sleeveColor ? (
      <div
        data-testid="library-sleeve-pile"
        style={{
          position: "absolute",
          left: LIBRARY_PILE_INSET,
          top: LIBRARY_PILE_INSET,
          width: w - 2 * LIBRARY_PILE_INSET,
          height: h - 2 * LIBRARY_PILE_INSET,
          background: sleeveColor,
        }}
      />
    ) : null;

    return (
      // position: relative anchors the sleeve pile's absolute inset — the pile
      // is a SIBLING of the box div, not a child, so it doesn't inherit the
      // chrome's 0.5 fade.
      <HTMLContainer id={shape.id} style={{ position: "relative" }}>
        <div
          data-testid="zone-box"
          style={{
            ...style,
            ...(sleeveColor ? { opacity: 0.5 } : {}),
            // @fleet/design-tokens' --font-chrome (Orbitron): a zone label
            // names a canvas region, the same job as a UI label/heading, not
            // prose or a card name (--font-content). This is the first
            // fleet-token consumer inside an actual canvas shape — tokens.css
            // anticipated it ("blocked on the Tabletop having somewhere to
            // put tokens/fonts"); mtg-zone is that somewhere. Resolves via
            // ordinary DOM inheritance: HTMLContainer is a plain unshadowed
            // div, and main.tsx imports tokens.css onto :root before <App/>
            // renders, same as any other DOM element on the page.
            fontFamily: "var(--font-chrome)",
            fontSize: 24,
            padding: 4,
          }}
        >
          {label}
        </div>
        {sleevePile}
      </HTMLContainer>
    );
  }

  override getIndicatorPath(shape: MtgZoneShape) {
    const path = new Path2D();
    path.rect(0, 0, shape.props.w, shape.props.h);
    return path;
  }
}
