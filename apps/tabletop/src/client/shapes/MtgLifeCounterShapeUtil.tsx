import { BaseBoxShapeUtil, HTMLContainer } from "tldraw";
import { MtgLifeCounterShape, mtgLifeCounterShapeProps } from "../../shared/mtgLifeCounterShape";
import { useState, type CSSProperties, type PointerEventHandler } from "react";

/**
 * BT.601 luminance threshold for picking readable text over a sleeve color —
 * ported from `isDarkHex` in apps/shuffler/src/view/common/shared-components.ts
 * (no shared package between ships). Keep the two in sync by hand.
 */
function isDarkHex(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b < 128;
}

/**
 * table-layout ticket 20: `mtg-life-counter`, locked furniture on the name
 * row. A number with +/- buttons plus a directly-typeable field — no
 * tldraw editing state involved (that's for double-click-to-edit shapes;
 * this one is always live, click and type).
 *
 * Locking gates tldraw's gesture state machine (SelectTool never lets a
 * locked shape reach PointingShape, so it never enters click/drag/selection)
 * but not DOM events inside component() — buttons and the input work via
 * the HyperlinkButton pattern: `pointer-events: all` plus
 * `editor.markEventAsHandled(e)` on pointer handlers, or the canvas
 * swallows the press before it reaches React. See
 * owners/tabletop-shape-mechanics/architecture.md's life-counter section.
 *
 * The typeable field is a plain, non-readOnly `<input>` — tldraw's own
 * `shouldSkipEvent` (useKeyboardShortcuts.ts) already exempts exactly that
 * from tool hotkeys by checking `e.target.tagName`, for free, with no
 * `stopPropagation` needed.
 */
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
    // Commander-damage counters (ticket 21) carry an opponent identity; a
    // plain life counter (label/sleeveColor both null) renders exactly as
    // ticket 20 shipped it.
    const identityBandH = label ? h * 0.3 : 0;
    const counterH = h - identityBandH;
    // Local buffer only while the field is focused — otherwise this shows
    // the live synced value, including changes from other players' presses.
    const [draft, setDraft] = useState<string | null>(null);

    // A locked shape's props are otherwise unreachable: `editor.updateShapes`
    // silently drops any partial for a locked shape unless the partial itself
    // unlocks it — `{ ignoreShapeLock: true }` is the documented escape
    // hatch (Editor.ts, `run`'s options) for furniture that must stay locked
    // (never draggable/selectable) while its own controls still work.
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
            // Identity band (ticket 21): opponent name over their sleeve
            // color — one of two redundant identity signals, the other
            // being the counter band's sleeve-colored border below.
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
              // Staged, not decided (shuffler-looks-like-itself owner review,
              // ticket 20): a rounded rectangle is none of the fleet's three
              // sanctioned round categories (cards, playmat, count discs).
              // Options staged on /design#life-counter; this is option B
              // (soft rectangle), the placeholder pending Jess's sign-off.
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
