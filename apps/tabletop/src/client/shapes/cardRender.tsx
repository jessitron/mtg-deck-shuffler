import { useLayoutEffect, useRef } from "react";
import { HTMLContainer } from "tldraw";
import type { CSSProperties } from "react";
import { MtgCardShape } from "../../shared/mtgCardShape";

// Ticket 01 (organizational split): rendering concerns pulled out of
// MtgCardShapeUtil.tsx verbatim — component() body, the tap catch-up
// animation, and getIndicatorPath. Still tldraw-dependent (HTMLContainer,
// React hooks) — this is a file split for navigability, not a
// tldraw-free domain module; see the ticket for why no such boundary
// exists cleanly here.

export function CardFace({ shape }: { shape: MtgCardShape }) {
  const { frontImageUrl, backImageUrl, face, cardName, faceDown, sleeveColor, cardBackImageUrl, w } = shape.props;
  // `face` and `faceDown` are independent axes (two-faced-cards owner):
  // face picks which PRINTED side shows — a DFC's back is a normal face
  // image — while faceDown is concealment. Only faceDown hides the image.
  const src = (face === "back" ? backImageUrl : frontImageUrl) ?? frontImageUrl;
  // Sleeve geometry is a proportion of the shape's own width — cards are
  // aspect-locked resizable, so a fixed px would drift out of proportion.
  // Square corners: sleeves are rectangular (Jess, 2026-08-09). w * 0.03
  // mirrors a real sleeve's ~1-2mm overhang. Flat solid color, no border
  // or sheen.
  const sleeve: CSSProperties | undefined = sleeveColor
    ? { width: "100%", height: "100%", background: sleeveColor, boxSizing: "border-box" }
    : undefined;

  // Ticket 15: tap reads as a quick rotation, not a snap. onClick writes
  // the new rotation in one synced record update, which tldraw renders
  // instantly; the motion is a local catch-up — counter-rotate the content
  // by the just-applied delta and ease it back to 0. Keyed off
  // `props.tapped` changing, never off a rotation delta, so free-rotating
  // through 90° can't fire it — and remote peers animate identically for
  // free when the prop syncs in. The ref starts at the first-seen value so
  // a card arriving already-tapped doesn't swing on mount or reconnect.
  //
  // 0.5s ease-out matches the Shuffler's card-motion timing (game.css
  // slides), deliberately snappier than its 0.8s flip.
  const containerRef = useRef<HTMLDivElement>(null);
  const prevTappedRef = useRef(shape.props.tapped);
  const tapped = shape.props.tapped;
  useLayoutEffect(() => {
    if (prevTappedRef.current === tapped) return;
    prevTappedRef.current = tapped;
    const el = containerRef.current;
    if (!el) return;
    // A re-tap mid-swing would stack a second catch-up on the first;
    // cancel so the worst case is one clean jump. (Smooth reversal on a
    // fast double-tap is an accepted gap — WAAPI starts from the fixed
    // keyframe, not the current rendered angle.)
    el.getAnimations().forEach((a) => a.cancel());
    // The default transform-origin (this div's center) is load-bearing:
    // onClick holds the card's CENTER fixed across the rotation write, so
    // frame 0 here is pixel-identical to the pre-tap render only if the
    // counter-rotation pivots on that same center.
    el.animate([{ transform: `rotate(${tapped ? -90 : 90}deg)` }, { transform: "rotate(0deg)" }], {
      duration: 500,
      easing: "ease-out",
    });
  }, [tapped]);

  return (
    <HTMLContainer id={shape.id}>
      {/* tl-html-container is `pointer-events: none` by default (tldraw.css)
          so hover/click reach whatever's behind it; tldraw's own image/video
          shapes re-enable hit-testing via .tl-image-container's `pointer-
          events: all` — reusing that class here rather than reinventing it. */}
      <div className="tl-image-container" ref={containerRef}>
        {sleeve && faceDown ? (
          // Concealed in a sleeve: the bare sleeve rectangle. Identity and
          // both URLs stay in props — concealment is depicted, not enforced.
          <div style={sleeve} />
        ) : sleeve ? (
          // Face image centered in the sleeve, a ring of color on every
          // side — the IRL sleeve-border look. Not `className="tl-image"`:
          // that rule is `position: absolute; inset: 0`, which anchors to
          // .tl-image-container and escapes this div's padding entirely.
          // The IMAGE keeps rounded corners — the printed card inside the
          // sleeve is still a rounded card (Jess, 2026-08-09); only the
          // sleeve itself is square. w * 0.05 is the Shuffler card's own
          // corner ratio (10/200).
          <div style={{ ...sleeve, padding: w * 0.03 }}>
            <img style={{ display: "block", width: "100%", height: "100%", borderRadius: w * 0.05 }} src={src} alt={cardName} draggable={false} />
          </div>
        ) : faceDown ? (
          // Unsleeved and concealed: the table's generic Magic card back, a
          // plain image swap (ticket 06 decision 3 — no border/dim/badge).
          // cardBackImageUrl is null only for shapes minted before this
          // prop existed; fall back to a flat rectangle rather than leaking
          // the face underneath.
          cardBackImageUrl ? (
            <img className="tl-image" style={{ borderRadius: w * 0.05 }} src={cardBackImageUrl} alt="face-down card" draggable={false} />
          ) : (
            <div style={{ width: "100%", height: "100%", background: "#3a3a3a", borderRadius: w * 0.05 }} />
          )
        ) : (
          // Unsleeved, face-up: a real card keeps its rounded corners —
          // only a sleeve (above) is square (Jess, 2026-08-09).
          <img className="tl-image" style={{ borderRadius: w * 0.05 }} src={src} alt={cardName} draggable={false} />
        )}
      </div>
    </HTMLContainer>
  );
}

export function cardIndicatorPath(shape: MtgCardShape): Path2D {
  const path = new Path2D();
  path.rect(0, 0, shape.props.w, shape.props.h);
  return path;
}
