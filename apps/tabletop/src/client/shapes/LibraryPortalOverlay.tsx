import { useEditor, useValue } from "tldraw";
import { useArmedLibraryZoneId } from "./zoneHitTest";

/**
 * The library portal's arming visual (ticket 12) — a rotating pink/amber conic-gradient
 * swirl with a faint dark veil, rendered over the library while a card drags over it.
 * Local to the dragger (each browser computes its own armed state). Rendered via
 * `TLComponents.InFrontOfTheCanvas` (viewport space, in front of the canvas layer)
 * because the library's own opaque card-back picture sits on top of the zone shape
 * itself — a look this fleet's `--armed-glow` ring can't reach through, and a
 * deliberately distinct treatment from that ring (ticket 04's resolved design choice).
 */
export function LibraryPortalOverlay() {
  const editor = useEditor();
  const zoneId = useArmedLibraryZoneId(editor);

  const rect = useValue(
    "libraryPortalViewportRect",
    () => {
      if (!zoneId) return undefined;
      const bounds = editor.getShapePageBounds(zoneId);
      if (!bounds) return undefined;
      const topLeft = editor.pageToViewport({ x: bounds.x, y: bounds.y });
      const zoom = editor.getZoomLevel();
      return { left: topLeft.x, top: topLeft.y, width: bounds.w * zoom, height: bounds.h * zoom };
    },
    [editor, zoneId]
  );

  if (!rect) return null;

  return (
    <div
      data-testid="portal-arming"
      style={{
        position: "absolute",
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
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
