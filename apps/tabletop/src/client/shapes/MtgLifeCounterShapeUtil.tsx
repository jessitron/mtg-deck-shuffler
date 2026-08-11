import { BaseBoxShapeUtil, HTMLContainer } from "tldraw";
import { MtgLifeCounterShape, mtgLifeCounterShapeProps } from "../../shared/mtgLifeCounterShape";
import { useState, type CSSProperties, type PointerEventHandler } from "react";

function isDarkHex(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b < 128;
}

export class MtgLifeCounterShapeUtil extends BaseBoxShapeUtil<MtgLifeCounterShape> {
  static override type = "mtg-life-counter" as const;
  static override props = mtgLifeCounterShapeProps;

  override getDefaultProps(): MtgLifeCounterShape["props"] {
    return { w: 130, h: 48, value: 40, label: null, sleeveColor: null };
  }

  override isAspectRatioLocked(): boolean {
    return false;
  }

  component(shape: MtgLifeCounterShape) {
    const { w, h, value, label, sleeveColor } = shape.props;
    const identityBandH = label ? h * 0.3 : 0;
    const counterH = h - identityBandH;
    const [draft, setDraft] = useState<string | null>(null);

    const setValue = (next: number) =>
      this.editor.run(
        () =>
          this.editor.updateShape<MtgLifeCounterShape>({
            id: shape.id,
            type: shape.type,
            props: { ...shape.props, value: next },
          }),
        { ignoreShapeLock: true }
      );

    const commitDraft = () => {
      if (draft !== null) {
        const parsed = Number.parseInt(draft, 10);
        if (Number.isFinite(parsed)) setValue(parsed);
      }
      setDraft(null);
    };

    const markHandled: PointerEventHandler = (e) => this.editor.markEventAsHandled(e);

    const buttonStyle: CSSProperties = {
      pointerEvents: "all",
      width: counterH * (24 / 48),
      height: counterH * (24 / 48),
      borderRadius: "50%",
      border: "none",
      background: "var(--dark-pink)",
      color: "var(--light-pink)",
      fontFamily: "var(--font-chrome)",
      fontWeight: 700,
      fontSize: counterH * (18 / 48),
      lineHeight: 1,
      cursor: "pointer",
      flexShrink: 0,
    };

    return (
      <HTMLContainer id={shape.id}>
        {/* The fleet's one decided focus-visible treatment (shuffler-design-choices
            choice 5, styles.css) never reaches here — the Tabletop has no
            ship-local stylesheet and doesn't load styles.css. Reproduced
            verbatim (3px solid --light-pink, 3px offset) rather than
            suppressed: these are the first persistent, always-live controls
            on this canvas, not tldraw's own ephemeral editing state. */}
        <style>{`
          .mtg-life-counter-btn:focus-visible, .mtg-life-counter-input:focus-visible {
            outline: 3px solid var(--light-pink);
            outline-offset: 3px;
          }
        `}</style>
        <div
          data-testid="mtg-life-counter"
          style={{ pointerEvents: "all", width: w, height: h, display: "flex", flexDirection: "column" }}
        >
          {label ? (
            <div
              data-testid="mtg-life-counter-label"
              style={{
                height: identityBandH,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                padding: `0 ${identityBandH * 0.2}px`,
                background: sleeveColor ?? "var(--dark-pink)",
                color: sleeveColor && isDarkHex(sleeveColor) ? "white" : "var(--deep-space)",
                fontFamily: "var(--font-chrome)",
                fontWeight: 700,
                fontSize: identityBandH * 0.55,
              }}
            >
              {label}
            </div>
          ) : null}
          <div
            style={{
              pointerEvents: "all",
              width: w,
              height: counterH,
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: counterH * (4 / 48),
              background: "var(--deep-space)",
              border: `${counterH * (3 / 48)}px solid ${sleeveColor ?? "var(--dark-pink)"}`,
              borderRadius: label ? `0 0 ${counterH * 0.15}px ${counterH * 0.15}px` : counterH * 0.15,
              borderTop: label ? "none" : undefined,
            }}
          >
            <button
              type="button"
              className="mtg-life-counter-btn"
              aria-label="decrease life"
              style={buttonStyle}
              onPointerDown={markHandled}
              onPointerUp={markHandled}
              onClick={() => setValue(value - 1)}
            >
              −
            </button>
            <input
              data-testid="mtg-life-counter-input"
              className="mtg-life-counter-input"
              type="text"
              inputMode="numeric"
              value={draft ?? String(value)}
              onPointerDown={markHandled}
              onFocus={() => setDraft(String(value))}
              onChange={(e) => setDraft(e.currentTarget.value)}
              onBlur={commitDraft}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitDraft();
                  e.currentTarget.blur();
                }
              }}
              style={{
                pointerEvents: "all",
                width: counterH * (48 / 48),
                minWidth: 0,
                flex: "1 1 auto",
                textAlign: "center",
                background: "transparent",
                border: "none",
                color: "var(--light-pink)",
                fontFamily: "var(--font-chrome)",
                fontWeight: 700,
                fontSize: counterH * (22 / 48),
              }}
            />
            <button
              type="button"
              className="mtg-life-counter-btn"
              aria-label="increase life"
              style={buttonStyle}
              onPointerDown={markHandled}
              onPointerUp={markHandled}
              onClick={() => setValue(value + 1)}
            >
              +
            </button>
          </div>
        </div>
      </HTMLContainer>
    );
  }

  override getIndicatorPath(shape: MtgLifeCounterShape) {
    const path = new Path2D();
    path.rect(0, 0, shape.props.w, shape.props.h);
    return path;
  }
}
