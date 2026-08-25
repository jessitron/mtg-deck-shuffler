import { useEffect, useRef } from "react";
import type { RemoteTLStoreWithStatus } from "@tldraw/sync";
import { inSpan } from "./observability";

type CardShapeRecord = { typeName?: string; type?: string; id?: string; x?: number; y?: number; props?: Record<string, unknown> };

// Matches usePhysicsAnnouncements' generic-settle debounce: Translating.ts writes to the
// store on every pointer-move during a drag, not just on drop, and a remote drag replicates
// that same per-frame volume over sync-core — without debouncing, this listener would fire
// once per animation frame of every remote drag on the table, not once per completed move.
const SETTLE_MS = 300;

export function useCardArrivalSpans(store: RemoteTLStoreWithStatus): void {
  const pending = useRef(new Map<string, { before: CardShapeRecord; after: CardShapeRecord; timer: ReturnType<typeof setTimeout> }>());

  useEffect(() => {
    const pendingMoves = pending.current;
    if (store.status !== "synced-remote") return;

    const unlisten = store.store.listen(
      (change) => {
        for (const record of Object.values(change.changes.added)) {
          const asAny = record as CardShapeRecord;
          if (asAny.typeName === "shape" && asAny.type === "mtg-card" && typeof asAny.props?.instanceId === "string") {
            void inSpan("card arrived on canvas", () => {}, {
              "card.instance_id": asAny.props.instanceId as string,
              "card.scryfall_id": (asAny.props.scryfallId as string) ?? "",
              "card.name": (asAny.props.cardName as string) ?? "",
            });
          }
        }

        // Nothing else in this ship watches for an EXISTING card shape moving as a result of a
        // remote-sourced change (the sync server, or another client's tab) — cardArrival.ts's
        // "place arrived card" span only fires for a brand-new shape via placeArrivedCard, and
        // usePhysicsAnnouncements only listens with {source: "user"}, so it only ever sees moves
        // this tab itself made. A card resetting to its stack/entry position with no local drag
        // and no new-arrival span (cards-jump-to-entry-position, TODO.md) would be exactly this:
        // an existing shape's x/y overwritten by a remote-sourced update. This is the only place
        // that would currently catch it.
        for (const [from, to] of Object.values(change.changes.updated)) {
          const before = from as CardShapeRecord;
          const after = to as CardShapeRecord;
          if (after.typeName !== "shape" || after.type !== "mtg-card" || !after.id) continue;
          if (before.x === after.x && before.y === after.y) continue;

          const existing = pendingMoves.get(after.id);
          if (existing) clearTimeout(existing.timer);
          // Keep the earliest "before" seen in this settle window so the eventual span
          // reports the real start/end of the move, not two adjacent animation frames.
          const windowBefore = existing?.before ?? before;
          const timer = setTimeout(() => {
            pendingMoves.delete(after.id!);
            void inSpan("card moved by remote change", () => {}, {
              "card.instance_id": (after.props?.instanceId as string) ?? "",
              "card.scryfall_id": (after.props?.scryfallId as string) ?? "",
              "card.name": (after.props?.cardName as string) ?? "",
              "shape.id": after.id ?? "",
              "position.before.x": windowBefore.x ?? -1,
              "position.before.y": windowBefore.y ?? -1,
              "position.after.x": after.x ?? -1,
              "position.after.y": after.y ?? -1,
            });
          }, SETTLE_MS);
          pendingMoves.set(after.id, { before: windowBefore, after, timer });
        }
      },
      { source: "remote", scope: "document" }
    );
    return () => {
      unlisten();
      for (const { timer } of pendingMoves.values()) clearTimeout(timer);
      pendingMoves.clear();
    };
  }, [store]);
}
