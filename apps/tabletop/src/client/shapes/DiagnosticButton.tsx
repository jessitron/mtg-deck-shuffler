import { useState } from "react";
import { inSpan, currentTraceparent } from "../observability";

/**
 * Floating diagnostic trigger (tabletop-persists-physical-events ticket 01) — a player's
 * "something looks wrong" button. Rendered via `TLComponents.InFrontOfTheCanvas` (same
 * slot as `LibraryPortalOverlay`), viewport-space, unconditional for any player — the whole
 * app is dev/admin-facing today, so this gets no gating either. Ticket 01 posts to the
 * server and proves the trace connects end-to-end (a client span with a server span
 * nested under it); the real projectEvents/snapshotCanvas diff lands in a later ticket in
 * the same spec.
 *
 * The browser tracer here has no fetch/XHR auto-instrumentation registered (see
 * `observability/index.ts`), so nothing injects a `traceparent` header automatically —
 * `currentTraceparent()` is called synchronously, before the `await fetch`, so it reads
 * off this span while it's still the active context, and the header is attached by hand.
 *
 * tldraw's `.tl-canvas__in-front` wrapper sets `pointer-events: none` (so the overlay
 * layer doesn't block canvas interactions by default) and that's an inherited CSS
 * property, so this button must opt back in explicitly or clicks fall straight through
 * to the canvas beneath it.
 */
export function DiagnosticButton({ tableSlug }: { tableSlug: string }) {
  const [spinning, setSpinning] = useState(false);

  const handleClick = () => {
    setSpinning(true);
    void inSpan(
      "diagnostic button clicked",
      async () => {
        const traceparent = currentTraceparent();
        await fetch(`/api/tables/${encodeURIComponent(tableSlug)}/diagnostic`, {
          method: "POST",
          headers: traceparent ? { traceparent } : {},
        });
      },
      { "diagnostic.triggered": true, "table.slug": tableSlug }
    );
  };

  return (
    <button
      type="button"
      aria-label="Report something wrong with this table"
      data-testid="diagnostic-button"
      onClick={handleClick}
      onAnimationEnd={() => setSpinning(false)}
      style={{
        position: "absolute",
        right: 12,
        bottom: 12,
        width: 40,
        height: 40,
        borderRadius: "var(--radius-soft)",
        border: "var(--narrow-border) solid var(--dark-pink)",
        background: "var(--deep-space)",
        fontSize: 20,
        lineHeight: 1,
        cursor: "pointer",
        pointerEvents: "auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: spinning ? "diagnostic-button-spin 0.5s linear" : undefined,
      }}
    >
      😠
      <style>{`
        @keyframes diagnostic-button-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
}
