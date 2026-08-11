import { useEffect, useRef } from "react";
import type { RemoteTLStoreWithStatus } from "@tldraw/sync";
import { TAB_ID } from "tldraw";
import { inSpan } from "./observability";

type ShapeRecordLike = {
  typeName?: string;
  type?: string;
  props?: Record<string, unknown>;
  parentId?: string;
  meta?: Record<string, unknown>;
};

const GENERIC_SETTLE_MS = 300;

function announce(name: string, attrs: Record<string, unknown>): void {
  void inSpan(name, () => {}, { actor: TAB_ID, ...attrs });
}

function cardAttrs(shape: ShapeRecordLike): Record<string, unknown> {
  return { "card.instance_id": (shape.props?.instanceId as string) ?? "" };
}

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
              announceGenericSettled("shape.moved", after);
            }
            continue;
          }

          const attachedToShape = before.parentId !== after.parentId && typeof after.parentId === "string" && after.parentId.startsWith("shape:");

          if (after.type === "mtg-counter" && attachedToShape) {
            announce("counter.attached", { "counter.text": (after.props?.text as string) ?? "" });
            continue;
          }

          if (after.type === "note" && attachedToShape) {
            announce("noteAttached", { "note.text": plainTextFrom(after.props?.richText) });
            continue;
          }

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
