import { useEditor, useValue } from "tldraw";
import { useArmedLibraryZoneId } from "./zoneHitTest";

/**
 * The library portal's arming visual (ticket 12) — a rotating pink/amber conic-gradient
 * swirl with a faint dark veil, rendered over the library while a card drags over it.
 * Clipped to a circle (diameter = the zone's shorter side) centered on the zone, rather
 * than the zone's own rectangle, so the swirl fits inside the zone and reads as a vortex
 * instead of a clipped box.
 * Local to the dragger (each browser computes its own armed state). Rendered via
 * `TLComponents.InFrontOfTheCanvas` (viewport space, in front of the canvas layer)
 * because the library's own opaque card-back picture sits on top of the zone shape
 * itself — a look this fleet's `--armed-glow` ring can't reach through, and a
 * deliberately distinct treatment from that ring (ticket 04's resolved design choice).
 */
export function LibraryPortalOverlay() {
  const editor = useEditor();
  const zoneId = useArmedLibraryZoneId(editor);

  const circle = useValue(
    "libraryPortalViewportCircle",
    () => {
      if (!zoneId) return undefined;
      const bounds = editor.getShapePageBounds(zoneId);
      if (!bounds) return undefined;
      const topLeft = editor.pageToViewport({ x: bounds.x, y: bounds.y });
      const zoom = editor.getZoomLevel();
      const width = bounds.w * zoom;
      const height = bounds.h * zoom;
      const diameter = Math.min(width, height);
      return {
        left: topLeft.x + width / 2 - diameter / 2,
        top: topLeft.y + height / 2 - diameter / 2,
        diameter,
      };
    },
    [editor, zoneId]
  );

  if (!circle) return null;

  return (
    <div
      data-testid="portal-arming"
      style={{
        position: "absolute",
        left: circle.left,
        top: circle.top,
        width: circle.diameter,
        height: circle.diameter,
        borderRadius: "50%",
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "-30%",
          background: "conic-gradient(from 0deg, var(--dark-pink), var(--armed-glow), var(--dark-pink))",
          animation: "library-portal-swirl-spin 1.6s linear infinite",
        }}
      />
      <div style={{ position: "absolute", inset: 0, background: "rgba(10, 6, 20, 0.4)" }} />
      <style>{`
        @keyframes library-portal-swirl-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
