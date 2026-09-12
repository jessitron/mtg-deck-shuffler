import { useState } from "react";
import { inSpan } from "../observability";

/**
 * Floating diagnostic trigger (tabletop-persists-physical-events ticket 01) — a player's
 * "something looks wrong" button. Rendered via `TLComponents.InFrontOfTheCanvas` (same
 * slot as `LibraryPortalOverlay`), viewport-space, unconditional for any player — the whole
 * app is dev/admin-facing today, so this gets no gating either. Ticket 01 posts to the
 * server and proves the trace connects end-to-end (a client span with a server span
 * nested under it); the real projectEvents/snapshotCanvas diff lands in a later ticket in
 * the same spec. Clicking opens a small popover so the player can describe what's wrong
 * before it's sent — that text rides along as `diagnostic.message` on the span, since
 * there's nowhere durable for it to go yet (see `diagnostic.ts`).
 *
 * The browser tracer registers fetch auto-instrumentation (`observability/index.ts`),
 * which injects the `traceparent` header into this `fetch()` call automatically — no
 * manual header attachment needed.
 *
 * tldraw's `.tl-canvas__in-front` wrapper sets `pointer-events: none` (so the overlay
 * layer doesn't block canvas interactions by default) and that's an inherited CSS
 * property, so this button (and the popover, a sibling rather than a DOM child) must both
 * opt back in explicitly or clicks fall straight through to the canvas beneath them.
 *
 * The fleet's one decided focus-visible treatment (styles.css) never reaches this canvas
 * surface — the Tabletop has no ship-local stylesheet — so it's reproduced verbatim here,
 * same as `MtgLifeCounterShapeUtil`.
 */
export function DiagnosticButton({ tableSlug }: { tableSlug: string }) {
  const [spinning, setSpinning] = useState(false);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  const send = () => {
    const trimmed = message.trim();
    setOpen(false);
    setMessage("");
    setSpinning(true);
    void inSpan(
      "diagnostic button clicked",
      async () => {
        await fetch(`/api/tables/${encodeURIComponent(tableSlug)}/diagnostic`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message: trimmed }),
        });
      },
      { "diagnostic.triggered": true, "table.slug": tableSlug, ...(trimmed ? { "diagnostic.message": trimmed } : {}) }
    );
  };

  return (
    <div style={{ position: "absolute", right: 12, bottom: 12, pointerEvents: "auto" }}>
      <style>{`
        @keyframes diagnostic-button-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .diagnostic-message-input:focus-visible, .diagnostic-send-btn:focus-visible {
          outline: 3px solid var(--light-pink);
          outline-offset: 3px;
        }
      `}</style>
      {open && (
        <div
          style={{
            position: "absolute",
            bottom: "100%",
            right: 0,
            marginBottom: 8,
            width: 220,
            padding: 8,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            background: "var(--deep-space)",
            border: "var(--narrow-border) solid var(--dark-pink)",
            pointerEvents: "auto",
          }}
        >
          <textarea
            autoFocus
            className="diagnostic-message-input"
            data-testid="diagnostic-message-input"
            placeholder="What's wrong?"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
              if (e.key === "Escape") setOpen(false);
            }}
            rows={3}
            style={{
              resize: "none",
              fontFamily: "var(--font-chrome)",
              background: "var(--deep-space)",
              color: "var(--light-pink)",
              border: "var(--narrow-border) solid var(--dark-pink)",
              padding: 4,
            }}
          />
          <button
            type="button"
            className="diagnostic-send-btn"
            data-testid="diagnostic-send-button"
            onClick={send}
            style={{
              fontFamily: "var(--font-chrome)",
              borderRadius: "var(--radius-soft)",
              border: "var(--narrow-border) solid var(--dark-pink)",
              background: "var(--deep-space)",
              color: "var(--light-pink)",
              cursor: "pointer",
              padding: "4px 8px",
            }}
          >
            Send
          </button>
        </div>
      )}
      <button
        type="button"
        aria-label="Report something wrong with this table"
        data-testid="diagnostic-button"
        onClick={() => setOpen((prev) => !prev)}
        onAnimationEnd={() => setSpinning(false)}
        style={{
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
      </button>
    </div>
  );
}
