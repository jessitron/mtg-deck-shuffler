import { BaseBoxShapeUtil, HTMLContainer } from "tldraw";
import { MtgZoneShape, mtgZoneShapeProps, LIBRARY_PILE_INSET, ZONE_LABEL_BAND } from "../../shared/mtgZoneShape";
import { useIsZoneArmed } from "./zoneHitTest";
import type { CSSProperties } from "react";

export class MtgZoneShapeUtil extends BaseBoxShapeUtil<MtgZoneShape> {
  static override type = "mtg-zone" as const;
  static override props = mtgZoneShapeProps;

  override getDefaultProps(): MtgZoneShape["props"] {
    return { w: 100, h: 100, zone: "playmat", seatId: null, label: "", sleeveColor: null, imageUrl: null };
  }

  override isAspectRatioLocked(): boolean {
    return false;
  }

  component(shape: MtgZoneShape) {
    const { w, h, zone, label, sleeveColor, imageUrl } = shape.props;
    const playmat = zone === "playmat";
    const armed = useIsZoneArmed(this.editor, shape.id);

    const style: CSSProperties = playmat
      ? imageUrl
        ? {
            width: w,
            height: h,
            boxSizing: "border-box",
            color: "black",
            position: "relative", // anchors the picture below, absolutely positioned to fill the box
          }
        : {
            width: w,
            height: h,
            boxSizing: "border-box",
            border: "10px solid black", // untokenized on purpose — matches the Shuffler's mats exactly
            borderRadius: h * 0.05,
            color: "black",
            position: "relative",
            overflow: "hidden",
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
      style.boxShadow = "0 0 0 3px var(--armed-glow), 0 0 16px 5px rgba(230, 163, 61, 0.65)"; /* --armed-glow, #e6a33d */
    }

    const sleevePile = sleeveColor ? (
      <div
        data-testid="library-sleeve-pile"
        style={{
          position: "absolute",
          left: LIBRARY_PILE_INSET,
          top: ZONE_LABEL_BAND, // below the label band, same as the card-back image (tableFurniture.ts)
          width: w - 2 * LIBRARY_PILE_INSET,
          height: h - ZONE_LABEL_BAND - LIBRARY_PILE_INSET,
          background: sleeveColor,
        }}
      />
    ) : null;

    return (
      <HTMLContainer id={shape.id} style={{ position: "relative" }}>
        <div
          data-testid="zone-box"
          style={{
            ...style,
            fontFamily: "var(--font-chrome)",
            fontSize: 24,
            padding: 4,
          }}
        >
          {playmat && imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                boxSizing: "border-box",
                border: "10px solid black", // untokenized on purpose — matches the Shuffler's mats exactly
                borderRadius: h * 0.05,
              }}
            />
          ) : null}
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
