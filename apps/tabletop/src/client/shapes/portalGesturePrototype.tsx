/**
 * PROTOTYPE — THROWAWAY. Wayfinder ticket 04 (cards-come-and-go): the library
 * portal gesture. Three feel-variants on the existing /t/:tableName route,
 * switchable via ?variant= and the floating bottom bar:
 *
 *   A — "Ring · instant poof"   pointer-keyed arming, card vanishes on drop
 *   B — "Maw · slide under"     card-center-keyed, card shrinks into the portal
 *   C — "Vortex · inhale"       card-center-keyed, card spins and fades in
 *
 * Everything portal-prototype lives in this one file (plus two marked
 * hook-ins: MtgCardShapeUtil.onTranslateEnd calls swallowIntoLibraryPortal,
 * TablePage mounts the overlay + switcher). Nothing here is production code:
 * no send-to-Shuffler, no owner gating (cards have no owner prop yet), no
 * tests. Arming is a derived render (computed/useValue, no store writes) —
 * furniture is locked, so getDraggingOverShape can never hint it. The swallow
 * DOES write to the store (animate + delete): everyone at the table should
 * see the card go.
 */
import { atom, computed, Computed, Editor, TLShapeId, useEditor, useValue, VecLike } from "tldraw";
import { CSSProperties, useEffect } from "react";
import { MtgCardShape } from "../../shared/mtgCardShape";
import { topmostZoneAt, ZoneHit } from "./zoneHitTest";

const VARIANTS = ["A", "B", "C"] as const;
export type PortalVariant = (typeof VARIANTS)[number];

const VARIANT_LABELS: Record<PortalVariant, string> = {
  A: "Ring · instant poof",
  B: "Maw · slide under",
  C: "Vortex · inhale",
};

function initialVariant(): PortalVariant {
  const v = new URLSearchParams(window.location.search).get("variant")?.toUpperCase();
  return (VARIANTS as readonly string[]).includes(v ?? "") ? (v as PortalVariant) : "A";
}

// An atom (not a bare module variable) so the arming signal and the overlay
// both re-derive the moment the switcher flips variants mid-drag.
const portalVariantAtom = atom<PortalVariant>("portalVariant", initialVariant());

export function portalVariant(): PortalVariant {
  return portalVariantAtom.get();
}

function setPortalVariant(v: PortalVariant) {
  portalVariantAtom.set(v);
  const url = new URL(window.location.href);
  url.searchParams.set("variant", v);
  window.history.replaceState(null, "", url);
}

/**
 * The library zone about to swallow the dragged card, if any. Like
 * zoneHitTest's armedZoneIdSignal (one computed per editor) but portal-gated:
 * only while an mtg-card is what's being dragged — a counter dragged across
 * the library must not threaten a swallow — and only for zone === "library".
 * Pointer-keyed, decided (Jess 2026-08-09): the multi-select policy — the
 * pointer picks the one destination — holds for a single card too, so both
 * arming and the swallow key on the pointer in every variant.
 */
const portalSignalByEditor = new WeakMap<Editor, Computed<TLShapeId | undefined>>();
function portalArmedLibrarySignal(editor: Editor): Computed<TLShapeId | undefined> {
  let signal = portalSignalByEditor.get(editor);
  if (!signal) {
    signal = computed("portalArmedLibraryId", () => {
      if (!editor.isIn("select.translating")) return undefined;
      const card = editor.getSelectedShapes().find((s) => s.type === "mtg-card");
      if (!card) return undefined;
      const hit = topmostZoneAt(editor, editor.inputs.currentPagePoint);
      return hit?.zone === "library" ? hit.id : undefined;
    });
    portalSignalByEditor.set(editor, signal);
  }
  return signal;
}

/**
 * The swallow. Called from MtgCardShapeUtil.onTranslateEnd when the card
 * settles in a library zone — once per moving card, so it only ever deletes
 * `card` itself (never a sibling — deleting another moving shape inside the
 * hook crashes Translating.handleEnd's non-null getShape). Deletion is
 * deferred past the hook (setTimeout) so tldraw's settle updateShapes runs
 * against a shape that still exists.
 */
export function swallowIntoLibraryPortal(editor: Editor, card: MtgCardShape, zoneHit: ZoneHit): void {
  const variant = portalVariant();
  const zoneBounds = editor.getShapePageBounds(zoneHit.id);

  if (variant === "A" || !zoneBounds) {
    setTimeout(() => {
      if (editor.getShape(card.id)) editor.deleteShapes([card.id]);
    }, 0);
    return;
  }

  const duration = variant === "B" ? 280 : 500;
  const endW = card.props.w * 0.12;
  const endH = card.props.h * 0.12;
  setTimeout(() => {
    if (!editor.getShape(card.id)) return;
    editor.animateShapes(
      [
        {
          id: card.id,
          type: card.type,
          x: zoneBounds.center.x - endW / 2,
          y: zoneBounds.center.y - endH / 2,
          rotation: variant === "C" ? card.rotation + Math.PI * 4 : card.rotation,
          opacity: 0,
          props: { w: endW, h: endH },
        },
      ],
      { animation: { duration } },
    );
    setTimeout(() => {
      if (editor.getShape(card.id)) editor.deleteShapes([card.id]);
    }, duration + 30);
  }, 0);
}

const KEYFRAMES = `
@keyframes portal-pulse {
  0%, 100% { box-shadow: 0 0 0 4px var(--armed-glow), 0 0 18px 6px rgba(230, 163, 61, 0.7); }
  50%      { box-shadow: 0 0 0 9px var(--dark-pink), 0 0 34px 12px rgba(187, 82, 119, 0.8); }
}
@keyframes portal-maw {
  from { transform: scale(0.85); }
  to   { transform: scale(1.06); }
}
@keyframes portal-spin {
  to { transform: rotate(360deg); }
}
`;

/**
 * Arming visuals, drawn over everything (TLComponents.InFrontOfTheCanvas —
 * viewport space, outside the camera transform) because the library's zone
 * box is hidden under its opaque image overlay: only outward box-shadow or
 * an over-drawn layer can be seen. pointerEvents: none throughout so the
 * drag underneath is untouched.
 */
export function PortalArmingOverlay() {
  const editor = useEditor();
  const armed = useValue(
    "portalArmedLibraryRect",
    () => {
      const id = portalArmedLibrarySignal(editor).get();
      if (!id) return undefined;
      const bounds = editor.getShapePageBounds(id);
      if (!bounds) return undefined;
      // pageToViewport reads the camera, so this re-derives on pan/zoom too.
      const tl = editor.pageToViewport({ x: bounds.x, y: bounds.y });
      const br = editor.pageToViewport({ x: bounds.maxX, y: bounds.maxY });
      return { x: tl.x, y: tl.y, w: br.x - tl.x, h: br.y - tl.y };
    },
    [editor],
  );
  const variant = useValue("portalVariant", () => portalVariantAtom.get(), []);

  if (!armed) return null;

  const box: CSSProperties = {
    position: "absolute",
    left: armed.x,
    top: armed.y,
    width: armed.w,
    height: armed.h,
    pointerEvents: "none",
  };

  return (
    <>
      <style>{KEYFRAMES}</style>
      {variant === "A" && <div data-testid="portal-arming" style={{ ...box, animation: "portal-pulse 0.9s ease-in-out infinite" }} />}
      {variant === "B" && (
        <div
          data-testid="portal-arming"
          style={{ ...box, background: "rgba(26, 21, 37, 0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <div
            style={{
              width: "72%",
              height: "46%",
              border: "3px dashed var(--dark-pink)",
              borderRadius: "50%",
              background: "rgba(26, 21, 37, 0.75)",
              animation: "portal-maw 0.7s ease-in-out infinite alternate",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--armed-glow)",
              fontFamily: "var(--font-chrome)",
              fontSize: Math.max(12, armed.h * 0.09),
            }}
          >
            open
          </div>
        </div>
      )}
      {variant === "C" && (
        <div
          data-testid="portal-arming"
          style={{ ...box, background: "rgba(26, 21, 37, 0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <div
            style={{
              width: Math.min(armed.w, armed.h) * 1.05,
              height: Math.min(armed.w, armed.h) * 1.05,
              borderRadius: "50%",
              background:
                "conic-gradient(from 0deg, transparent 0%, rgba(187, 82, 119, 0.75) 12%, transparent 30%, rgba(230, 163, 61, 0.6) 55%, transparent 75%)",
              animation: "portal-spin 1.1s linear infinite",
            }}
          />
        </div>
      )}
    </>
  );
}

function cycle(delta: number) {
  const i = (VARIANTS.indexOf(portalVariant()) + delta + VARIANTS.length) % VARIANTS.length;
  setPortalVariant(VARIANTS[i]);
}

/**
 * Floating bottom-center variant switcher — deliberately NOT part of the
 * design being judged (high-contrast pill). Arrows or ←/→ cycle; the URL
 * search param keeps the choice shareable and reload-stable. Dev-only.
 */
export function PortalVariantSwitcher() {
  const variant = useValue("portalVariantBar", () => portalVariantAtom.get(), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.key === "ArrowLeft") cycle(-1);
      if (e.key === "ArrowRight") cycle(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!import.meta.env.DEV) return null;

  const arrow: CSSProperties = {
    background: "none",
    border: "none",
    color: "white",
    fontSize: 18,
    cursor: "pointer",
    padding: "2px 8px",
  };

  return (
    <div
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") cycle(-1);
        if (e.key === "ArrowRight") cycle(1);
      }}
      style={{
        position: "fixed",
        bottom: 56,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        background: "rgba(0, 0, 0, 0.85)",
        color: "white",
        borderRadius: 999,
        padding: "6px 10px",
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "monospace",
        fontSize: 13,
        boxShadow: "0 2px 12px rgba(0, 0, 0, 0.5)",
      }}
    >
      <button style={arrow} onClick={() => cycle(-1)} aria-label="previous variant">
        ←
      </button>
      <span>
        PROTOTYPE {variant} — {VARIANT_LABELS[variant]}
      </span>
      <button style={arrow} onClick={() => cycle(1)} aria-label="next variant">
        →
      </button>
    </div>
  );
}
