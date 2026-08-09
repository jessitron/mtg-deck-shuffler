import { BaseBoxShapeUtil, HTMLContainer, TLShapePartial, useValue } from "tldraw";
import { MtgCounterShape, mtgCounterShapeProps } from "../../shared/mtgCounterShape";
import { useEffect, useRef, type CSSProperties } from "react";

export const COUNTER_SIZE = 44;

/**
 * tabletop-physics ticket 18: `mtg-counter`, the disc a player drops onto a
 * card. Free editable text, blank by default. Attachment is tldraw parenting,
 * mediated by the card's ShapeUtil (see MtgCardShapeUtil's drag hooks) — this
 * util carries no attachment logic of its own.
 *
 * Text editing is tldraw's stock double-click-to-edit (`canEdit`), NOT a
 * custom `onClick` — deliberately, so this util never triggers the
 * PointingShape selection-deferral quirk the card's onClick does. Keystrokes
 * while editing are shielded from tool hotkeys for free: tldraw's
 * `areShortcutsDisabled` is true whenever any shape is being edited
 * (useKeyboardShortcuts.ts).
 *
 * Look: the `.hand-count` disc from the Shuffler's game.css — the app's one
 * existing count disc — re-expressed inline with fleet tokens (there is still
 * no Tabletop ship-local stylesheet, and this ticket deliberately doesn't
 * start one). Staged on /design as "counter disc" for Jess's sign-off.
 */
export class MtgCounterShapeUtil extends BaseBoxShapeUtil<MtgCounterShape> {
  static override type = "mtg-counter" as const;
  static override props = mtgCounterShapeProps;

  override getDefaultProps(): MtgCounterShape["props"] {
    return { w: COUNTER_SIZE, h: COUNTER_SIZE, text: "" };
  }

  // Keeps the box square, which is also what makes `border-radius: 50%` safe:
  // on a non-square box a CSS percentage radius draws an ellipse.
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

    // Focus the input once editing starts — but a tick late (setTimeout 0):
    // the double-click that starts editing hasn't finished when React's
    // effects run, and tldraw's own end-of-gesture focus handling would
    // otherwise reclaim focus right after a synchronous focus() here
    // (verified empirically: autoFocus, ref-callback focus, and a bare
    // effect focus all end with document.activeElement === body).
    const rInput = useRef<HTMLInputElement>(null);
    useEffect(() => {
      if (!isEditing) return;
      const timer = setTimeout(() => {
        if (document.activeElement !== rInput.current) {
          rInput.current?.focus();
        }
      }, 0);
      return () => clearTimeout(timer);
    }, [isEditing]);

    // The .hand-count recipe (apps/shuffler/public/game.css), proportional to
    // the shape's own height rather than fixed px so a resized counter keeps
    // its proportions (the playmat-radius lesson: fixed px drifts as the
    // shape scales). Border width is --narrow-border (3px) at the default
    // 44px size, scaled with the disc.
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
      fontSize: h * 0.32,
      fontWeight: 700,
      lineHeight: 1,
      textAlign: "center",
      overflow: "hidden",
    };

    return (
      <HTMLContainer id={shape.id}>
        {/* tl-html-container is `pointer-events: none` (tldraw.css) and it
            inherits — without re-enabling hit-testing, double-click-to-edit
            never reaches this shape. Same .tl-image-container reuse as the
            card. */}
        <div className="tl-image-container" style={{ pointerEvents: "all" }}>
          {isEditing ? (
            <input
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
              // The focused input swallows keys before tldraw's document-level
              // handlers see them, so Enter/Escape must end editing here.
              onKeyDown={(e) => {
                if (e.key === "Escape" || e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  this.editor.complete();
                }
              }}
              style={{
                ...disc,
                // Invisible chrome: editing changes nothing visually except
                // the caret. Suppressing the native focus outline is the
                // sanctioned canvas exemption — selection/focus indication on
                // canvas shapes is tldraw's to own, and the Shuffler's global
                // :focus-visible rule doesn't exist on the Tabletop.
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

  // Hazard A (tabletop-shape-mechanics owner): tldraw leaves the just-dragged
  // shape selected after every drag, and the CARD's PointingShape workaround
  // (see MtgCardShapeUtil.onTranslateEnd) only reselects the pointed-at shape
  // when nothing is selected. A stale counter selection would make the next
  // card drag silently translate this counter instead of the card. Every
  // drag-settle clears selection — unconditionally, no early return above it.
  override onTranslateEnd(): TLShapePartial<MtgCounterShape> | undefined {
    this.editor.setSelectedShapes([]);
    return undefined;
  }
}
