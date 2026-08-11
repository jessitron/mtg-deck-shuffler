import { BaseBoxShapeUtil, HTMLContainer, useValue } from "tldraw";
import { MtgCounterShape, mtgCounterShapeProps } from "../../shared/mtgCounterShape";
import { fitCounterFont } from "./counterTextFit";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";

export const COUNTER_SIZE = 44;

export class MtgCounterShapeUtil extends BaseBoxShapeUtil<MtgCounterShape> {
  static override type = "mtg-counter" as const;
  static override props = mtgCounterShapeProps;

  override getDefaultProps(): MtgCounterShape["props"] {
    return { w: COUNTER_SIZE, h: COUNTER_SIZE, text: "" };
  }

  override isAspectRatioLocked(): boolean {
    return true;
  }

  override canEdit(): boolean {
    return true;
  }

  component(shape: MtgCounterShape) {
    const { w, h, text } = shape.props;
    const isEditing = useValue("isEditingCounter", () => this.editor.getEditingShapeId() === shape.id, [
      this.editor,
      shape.id,
    ]);

    const hostTapped = useValue(
      "hostCardTapped",
      () => {
        const self = this.editor.getShape(shape.id);
        const parent = self?.parentId ? this.editor.getShape(self.parentId) : undefined;
        return parent?.type === "mtg-card" ? parent.props.tapped : undefined;
      },
      [this.editor, shape.id],
    );
    const rideAlongRef = useRef<HTMLDivElement>(null);
    const prevHostTappedRef = useRef(hostTapped);
    useLayoutEffect(() => {
      const previous = prevHostTappedRef.current;
      prevHostTappedRef.current = hostTapped;
      if (previous === undefined || hostTapped === undefined || previous === hostTapped) return;
      const el = rideAlongRef.current;
      if (!el) return;
      el.getAnimations().forEach((a) => a.cancel());
      el.animate([{ transform: `rotate(${hostTapped ? -90 : 90}deg)` }, { transform: "rotate(0deg)" }], {
        duration: 500,
        easing: "ease-out",
      });
    }, [hostTapped]);

    const rInput = useRef<HTMLTextAreaElement>(null);
    useEffect(() => {
      if (!isEditing) return;
      const timer = setTimeout(() => {
        if (document.activeElement !== rInput.current) {
          rInput.current?.focus();
        }
      }, 0);
      return () => clearTimeout(timer);
    }, [isEditing]);

    const { fontSize } = fitCounterFont(text, w, h);
    const [measuredPadTop, setMeasuredPadTop] = useState(0);
    useLayoutEffect(() => {
      if (!isEditing) return;
      const ta = rInput.current;
      if (!ta) return;
      const border = h * (3 / COUNTER_SIZE);
      const usableHeight = h - 2 * border;
      const previousPadding = ta.style.paddingTop;
      ta.style.paddingTop = "0px";
      const contentHeight = ta.scrollHeight;
      ta.style.paddingTop = previousPadding;
      setMeasuredPadTop(Math.max(0, (usableHeight - contentHeight) / 2));
    }, [isEditing, text, fontSize, h]);

    const disc: CSSProperties = {
      width: w,
      height: h,
      boxSizing: "border-box",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "50%", // sanctioned: count discs keep real round corners
      background: "var(--deep-space)",
      border: `${h * (3 / COUNTER_SIZE)}px solid var(--dark-pink)` /* --narrow-border, proportional */,
      color: "var(--light-pink)",
      fontFamily: "var(--font-chrome)",
      fontSize,
      fontWeight: 700,
      lineHeight: 1.1,
      textAlign: "center",
      overflowWrap: "anywhere", // a long single word ("lifelink") wraps rather than overflowing
      overflow: "hidden",
    };

    return (
      <HTMLContainer id={shape.id}>
        {/* tl-html-container is `pointer-events: none` (tldraw.css) and it
            inherits — without re-enabling hit-testing, double-click-to-edit
            never reaches this shape. Same .tl-image-container reuse as the
            card. */}
        <div className="tl-image-container" style={{ pointerEvents: "all" }} ref={rideAlongRef}>
          {isEditing ? (
            <textarea
              data-testid="mtg-counter-input"
              ref={rInput}
              defaultValue={text}
              onChange={(e) =>
                this.editor.updateShape<MtgCounterShape>({
                  id: shape.id,
                  type: shape.type,
                  props: { ...shape.props, text: e.currentTarget.value },
                })
              }
              // Cursor-positioning clicks belong to the input, not the canvas.
              onPointerDown={(e) => this.editor.markEventAsHandled(e)}
              onKeyDown={(e) => {
                if (e.key === "Escape" || e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  this.editor.complete();
                }
              }}
              style={{
                ...disc,
                display: "block",
                paddingTop: measuredPadTop,
                resize: "none",
                outline: "none",
                textAlign: "center",
              }}
            />
          ) : (
            <div data-testid="mtg-counter" style={disc}>
              {text}
            </div>
          )}
        </div>
      </HTMLContainer>
    );
  }

  override getIndicatorPath(shape: MtgCounterShape) {
    const path = new Path2D();
    path.rect(0, 0, shape.props.w, shape.props.h);
    return path;
  }
}
