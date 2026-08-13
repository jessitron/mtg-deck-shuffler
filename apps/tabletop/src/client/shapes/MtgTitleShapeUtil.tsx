import { BaseBoxShapeUtil, HTMLContainer } from "tldraw";
import { MtgTitleShape, mtgTitleShapeProps } from "../../shared/mtgTitleShape";
import { useState, type CSSProperties, type PointerEventHandler } from "react";

export class MtgTitleShapeUtil extends BaseBoxShapeUtil<MtgTitleShape> {
  static override type = "mtg-title" as const;
  static override props = mtgTitleShapeProps;

  override getDefaultProps(): MtgTitleShape["props"] {
    return { w: 1482, h: 40, text: "", color: "var(--deep-space)" };
  }

  override isAspectRatioLocked(): boolean {
    return false;
  }

  component(shape: MtgTitleShape) {
    const { w, h, text, color } = shape.props;
    const [draft, setDraft] = useState<string | null>(null);

    // A locked shape's updateShape is a silent no-op unless wrapped in editor.run
    // with ignoreShapeLock — the same guard the life counter uses to stay locked
    // (no drag/delete) while its input still writes to props.
    const setText = (next: string) =>
      this.editor.run(
        () =>
          this.editor.updateShape<MtgTitleShape>({
            id: shape.id,
            type: shape.type,
            props: { ...shape.props, text: next },
          }),
        { ignoreShapeLock: true }
      );

    const commitDraft = () => {
      if (draft !== null) setText(draft);
      setDraft(null);
    };

    const markHandled: PointerEventHandler = (e) => this.editor.markEventAsHandled(e);

    // On-brand chrome: Orbitron (var(--font-chrome)), colored with the deck's own darker
    // identity color (passed as a prop). Transparent/borderless at rest — input chrome is
    // still an open design choice, so nothing here paints a background or border.
    const inputStyle: CSSProperties = {
      pointerEvents: "all",
      width: w,
      height: h,
      boxSizing: "border-box",
      minWidth: 0,
      background: "transparent",
      border: "none",
      padding: 0,
      color,
      fontFamily: "var(--font-chrome)",
      fontWeight: 400,
      fontSize: 28,
      lineHeight: `${h}px`,
    };

    return (
      <HTMLContainer id={shape.id}>
        {/* The fleet's one decided focus-visible treatment (shuffler-design-choices
            choice 5) never reaches this canvas surface — no ship-local stylesheet —
            so it is reproduced verbatim, the same as the life counter does. */}
        <style>{`
          .mtg-title-input:focus-visible {
            outline: 3px solid var(--light-pink);
            outline-offset: 3px;
          }
        `}</style>
        <input
          data-testid="mtg-title-input"
          className="mtg-title-input"
          type="text"
          aria-label="deck title"
          value={draft ?? text}
          style={inputStyle}
          onPointerDown={markHandled}
          onFocus={() => setDraft(text)}
          onChange={(e) => setDraft(e.currentTarget.value)}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            // Shield keystrokes from tldraw's tool hotkeys (r, t, v, d, s…): without
            // this, typing an ordinary letter switches tools mid-word.
            e.stopPropagation();
            if (e.key === "Enter") {
              e.preventDefault();
              commitDraft();
              e.currentTarget.blur();
            } else if (e.key === "Escape") {
              e.preventDefault();
              setDraft(null);
              e.currentTarget.blur();
            }
          }}
        />
      </HTMLContainer>
    );
  }

  override getIndicatorPath(shape: MtgTitleShape) {
    const path = new Path2D();
    path.rect(0, 0, shape.props.w, shape.props.h);
    return path;
  }
}
