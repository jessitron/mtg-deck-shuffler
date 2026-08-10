import { BaseBoxShapeUtil, HTMLContainer, TLShapePartial, useValue } from "tldraw";
import { MtgCounterShape, mtgCounterShapeProps } from "../../shared/mtgCounterShape";
import { fitCounterFont } from "./counterTextFit";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";

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

    // Ride-along tap catch-up (fixes: "the counter didn't participate in the
    // tap animation, when the counter was on the card" — TODO.md). A counter
    // has no `props.tapped` of its own; tldraw already composes the host
    // card's rotation into this shape's page transform for free (ticket 18's
    // "tilt along" visual), so the *position* is never wrong. What was
    // missing is the card's ticket-15 catch-up illusion: MtgCardShapeUtil
    // eases its OWN content back from a counter-rotation on every tap, but a
    // hosted counter is a separate DOM node with no equivalent, so it just
    // snapped to the new angle a frame before the card's div started easing
    // — visually disconnected mid-swing.
    //
    // Fix: watch the host's `props.tapped` (not our own props, which never
    // change here) and replay the identical WAAPI catch-up on this shape's
    // own container. Since this counter's LOCAL rotation is 0 while
    // attached, its page-rotation delta from one tap equals the host's own
    // delta — so the same counter-rotate-then-ease-to-0 recipe lines up
    // exactly with the card's.
    //
    // Read this shape's OWN record back out of the editor inside the
    // selector — rather than trusting the `shape` argument's `parentId` —
    // and the host's `props.tapped` off of that. Both are genuine signal
    // reads on the reactive store, so `useValue` re-runs this whenever
    // EITHER changes. Reading `shape.parentId` directly would NOT do that:
    // tldraw only re-invokes `component()` with a fresh `shape` when this
    // shape's OWN `props` change, not on a bare `parentId`/x/y/rotation
    // write (those are applied to the wrapping transform without
    // re-rendering the React content) — so a captured `shape.parentId`
    // would stay frozen at whatever it was on the last props-triggered
    // render, silently missing every later attach/detach/tap.
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
    // Seed with the mount-time value (like the card's own prevTappedRef) so
    // neither arriving already attached to a tapped card, nor being dragged
    // onto/off a card (a defined <-> undefined transition, not a tap), swings
    // this counter — only an actual tapped-value flip on an already-attached
    // host should.
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

    // Focus the input once editing starts — but a tick late (setTimeout 0):
    // the double-click that starts editing hasn't finished when React's
    // effects run, and tldraw's own end-of-gesture focus handling would
    // otherwise reclaim focus right after a synchronous focus() here
    // (verified empirically: autoFocus, ref-callback focus, and a bare
    // effect focus all end with document.activeElement === body).
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

    // Vertical centering for the editing textarea, MEASURED rather than
    // estimated. fitCounterFont's lineCount is a conservative guess (it has
    // to be — real width measurement is unreliable before the webfont
    // loads), so near a wrap boundary it sometimes predicts one more line
    // than the browser actually renders (e.g. "why", "+1/+1" at the default
    // 44px disc). Padding sized for the guessed (taller) block then leaves
    // the actually-shorter text sitting high with empty space below it —
    // exactly the bug Jess reported. Fix: after layout, zero the padding,
    // read the textarea's real scrollHeight (which reports full content
    // height regardless of the fixed visible height), and center against
    // that. Stored in state (not written straight to the DOM node) so it
    // survives re-renders this effect doesn't rerun for — a drag or
    // unrelated shape-record churn re-runs component() and would otherwise
    // stamp the JSX's own paddingTop back over a direct DOM write.
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

    // The .hand-count recipe (apps/shuffler/public/game.css), proportional to
    // the shape's own height rather than fixed px so a resized counter keeps
    // its proportions (the playmat-radius lesson: fixed px drifts as the
    // shape scales). Border width is --narrow-border (3px) at the default
    // 44px size, scaled with the disc. Font size shrinks to fit long labels
    // like "lifelink" (Jess, 2026-08-08); the browser wraps within the
    // square content box, and the round clip nibbling the corners of long
    // labels is accepted — close enough. See counterTextFit.ts.
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
            // A textarea (not an input) so long labels wrap while editing,
            // roughly as they will display. It can't flex-center its own
            // text, so vertical centering is measured padding — see the
            // useLayoutEffect above.
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
              // The focused input swallows keys before tldraw's document-level
              // handlers see them, so Enter/Escape must end editing here.
              // Enter commits (no newlines in a counter label).
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
