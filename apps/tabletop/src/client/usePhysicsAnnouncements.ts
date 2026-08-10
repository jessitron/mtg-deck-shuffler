import { useEffect, useRef } from "react";
import type { RemoteTLStoreWithStatus } from "@tldraw/sync";
import { TAB_ID } from "tldraw";
import { inSpan } from "./observability";

/**
 * Ticket 21 (tabletop-physics): a fixed vocabulary for "a completed motion
 * happened" (map.md decision 10) — named words for gestures physics already
 * understands, a generic `shape.moved`/`created`/`changed` fallback for
 * everything else. Detection stays exactly where each gesture's own hook
 * already computes it (MtgCardShapeUtil's onClick/onTranslateEnd,
 * onDragShapesIn); this listener only watches the resulting store mutations
 * and translates them — it never re-implements gesture detection.
 *
 * Only this client's own actions are announced (`source: "user"`): a remote
 * peer runs this same hook locally and announces its own gestures with its
 * own TAB_ID, so cross-client attribution needs nothing here.
 */
type ShapeRecordLike = {
  typeName?: string;
  type?: string;
  props?: Record<string, unknown>;
  parentId?: string;
  meta?: Record<string, unknown>;
};

// tldraw writes fresh x/y to the document store on every pointer-move during
// a drag (Translating.ts calls updateShapes per move, no batching to
// settle) — confirmed by the tabletop-shape-mechanics owner. Named gestures
// are unaffected (they come from single-shot writes: onClick, onTranslateEnd,
// onDragShapesIn), but the GENERIC fallback would otherwise fire once per
// pointer-move. Debouncing per shape id is how this listener honors "never
// announce per-frame drag positions, only settled motions" without adding an
// onTranslateEnd to every stock tldraw shape type.
const GENERIC_SETTLE_MS = 300;

function announce(name: string, attrs: Record<string, unknown>): void {
  void inSpan(name, () => {}, { actor: TAB_ID, ...attrs });
}

function cardAttrs(shape: ShapeRecordLike): Record<string, unknown> {
  return { "card.instance_id": (shape.props?.instanceId as string) ?? "" };
}

// Rich text is a ProseMirror-shaped doc ({type, content: [...]}); tldraw's
// own renderPlaintextFromRichText needs a live Editor for its extension
// schema, which this store-level listener doesn't have. A note's text is
// only ever plain typed text here, so a bare recursive walk is enough — this
// is a telemetry attribute, not a rendered value.
function plainTextFrom(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const obj = node as { text?: unknown; content?: unknown };
  if (typeof obj.text === "string") return obj.text;
  if (Array.isArray(obj.content)) return obj.content.map(plainTextFrom).join("");
  return "";
}

export function usePhysicsAnnouncements(store: RemoteTLStoreWithStatus): void {
  const settleTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const timers = settleTimers.current;
    if (store.status !== "synced-remote") return;

    // Collapses rapid diffs on the same shape into one generic announcement
    // after a quiet period — see GENERIC_SETTLE_MS above.
    function announceGenericSettled(kind: "shape.moved" | "shape.changed", shape: ShapeRecordLike & { id: string }) {
      const existing = timers.get(shape.id);
      if (existing) clearTimeout(existing);
      timers.set(
        shape.id,
        setTimeout(() => {
          timers.delete(shape.id);
          announce(kind, { "shape.type": shape.type ?? "", "shape.id": shape.id });
        }, GENERIC_SETTLE_MS),
      );
    }

    const unlisten = store.store.listen(
      (change) => {
        for (const record of Object.values(change.changes.added)) {
          const shape = record as ShapeRecordLike & { id: string };
          if (shape.typeName !== "shape") continue;
          announce("shape.created", { "shape.type": shape.type ?? "", "shape.id": shape.id });
        }

        for (const [from, to] of Object.values(change.changes.updated)) {
          const before = from as ShapeRecordLike & { id: string };
          const after = to as ShapeRecordLike & { id: string };
          if (after.typeName !== "shape") continue;

          if (after.type === "mtg-card") {
            const beforeProps = before.props ?? {};
            const afterProps = after.props ?? {};
            let named = false;

            if (beforeProps.tapped !== afterProps.tapped) {
              announce(afterProps.tapped ? "card.tapped" : "card.untapped", cardAttrs(after));
              named = true;
            }
            if (beforeProps.face !== afterProps.face) {
              announce("card.flipped", { ...cardAttrs(after), "card.face": afterProps.face });
              named = true;
            }
            if (!beforeProps.faceDown && afterProps.faceDown) {
              announce("card.turnedFaceDown", cardAttrs(after));
              named = true;
            }
            const beforeZone = (before.meta?.zone as string | null | undefined) ?? null;
            const afterZone = (after.meta?.zone as string | null | undefined) ?? null;
            if (beforeZone !== afterZone) {
              announce("card.zoneMoved", { ...cardAttrs(after), "zone.to": afterZone ?? "" });
              named = true;
            }

            if (!named) {
              // Fallthrough for anything else about a card (plain
              // repositioning, resize, free rotation) — still worth a
              // generic settled announcement, same bar as any other shape.
              announceGenericSettled("shape.moved", after);
            }
            continue;
          }

          if (after.type === "mtg-counter" && before.parentId !== after.parentId && after.parentId) {
            announce("counter.attached", { "counter.text": (after.props?.text as string) ?? "" });
            continue;
          }

          if (after.type === "note" && before.parentId !== after.parentId && after.parentId) {
            announce("noteAttached", { "note.text": plainTextFrom(after.props?.richText) });
            continue;
          }

          // Generic fallback: everything else physics has no name for
          // (freeform doodles, plain furniture-less drags, unnamed custom
          // shapes) — "a completed motion happened" is the bar, not
          // "physics judges it interesting."
          announceGenericSettled("shape.changed", after);
        }
      },
      { source: "user", scope: "document" },
    );

    return () => {
      unlisten();
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, [store]);
}
