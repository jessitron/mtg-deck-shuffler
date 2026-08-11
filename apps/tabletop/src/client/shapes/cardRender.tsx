import { useLayoutEffect, useRef } from "react";
import { HTMLContainer } from "tldraw";
import type { CSSProperties } from "react";
import { MtgCardShape } from "../../shared/mtgCardShape";


export function CardFace({ shape }: { shape: MtgCardShape }) {
  const { frontImageUrl, backImageUrl, face, cardName, faceDown, sleeveColor, cardBackImageUrl, w } = shape.props;
  const src = (face === "back" ? backImageUrl : frontImageUrl) ?? frontImageUrl;
  const sleeve: CSSProperties | undefined = sleeveColor
    ? { width: "100%", height: "100%", background: sleeveColor, boxSizing: "border-box" }
    : undefined;

  const containerRef = useRef<HTMLDivElement>(null);
  const prevTappedRef = useRef(shape.props.tapped);
  const tapped = shape.props.tapped;
  useLayoutEffect(() => {
    if (prevTappedRef.current === tapped) return;
    prevTappedRef.current = tapped;
    const el = containerRef.current;
    if (!el) return;
    el.getAnimations().forEach((a) => a.cancel());
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
          <div style={sleeve} />
        ) : sleeve ? (
          <div style={{ ...sleeve, padding: w * 0.03 }}>
            <img style={{ display: "block", width: "100%", height: "100%", borderRadius: w * 0.05 }} src={src} alt={cardName} draggable={false} />
          </div>
        ) : faceDown ? (
          cardBackImageUrl ? (
            <img className="tl-image" style={{ borderRadius: w * 0.05 }} src={cardBackImageUrl} alt="face-down card" draggable={false} />
          ) : (
            <div style={{ width: "100%", height: "100%", background: "#3a3a3a", borderRadius: w * 0.05 }} />
          )
        ) : (
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
