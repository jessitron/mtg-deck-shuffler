import { useEffect, useRef } from "react";
import type { RemoteTLStoreWithStatus } from "@tldraw/sync";
import { inSpan } from "./observability";

type ShapeRecord = { typeName?: string; type?: string };

/**
 * cards-jump-to-entry-position (see apps/tabletop/notes/RESEARCH-cards-jump-to-entry-position.md):
 * `TLSyncClient.didReconnect()` silently reverts any shape with an in-flight unconfirmed edit
 * back to its last server-confirmed value on every socket reconnect, with `{ runCallbacks: false }`
 * — invisible to `store.listen`, including useCardArrivalSpans.ts's "card moved by remote change"
 * instrumentation. A reconnect is therefore a real candidate trigger that currently leaves no
 * trace at all. `useSync`'s returned store exposes `connectionStatus: "offline" | "online"` only
 * while `status === "synced-remote"` (there is no separate "reconnecting" state at this level —
 * see useSync.js) so a transition to "offline" and back to "online" is the closest observable
 * proxy for a disconnect/reconnect cycle.
 *
 * This does not explain the bug — it's here so the *next* occurrence can be checked against
 * "did a reconnect happen around this time," the way "card moved by remote change" already
 * lets an occurrence be checked against "did a remote store update happen around this time."
 */
export function useReconnectSpans(store: RemoteTLStoreWithStatus): void {
  const previousStatus = useRef<"offline" | "online" | undefined>(undefined);
  const offlineSince = useRef<number | undefined>(undefined);
  const connectionStatus = store.status === "synced-remote" ? store.connectionStatus : undefined;

  useEffect(() => {
    const previous = previousStatus.current;
    previousStatus.current = connectionStatus;

    // First observation just establishes a baseline — not a transition worth a span.
    if (connectionStatus === undefined || previous === undefined || previous === connectionStatus) {
      return;
    }

    if (connectionStatus === "offline") {
      offlineSince.current = Date.now();
      void inSpan("sync connection lost", () => {});
      return;
    }

    // previous === "offline" && connectionStatus === "online": the reconnect this ship
    // couldn't previously see completing. Snapshot how many mtg-card shapes exist right now —
    // a cheap summary (not per-shape) to correlate against a reported card reset. This is a
    // one-shot read, not a guaranteed-complete one: there's no confirmed guarantee the store
    // has finished catching up on missed updates the instant connectionStatus flips to "online".
    const offlineDurationMs = offlineSince.current ? Date.now() - offlineSince.current : -1;
    offlineSince.current = undefined;
    const cardCount =
      store.status === "synced-remote"
        ? store.store.allRecords().filter((r) => {
            const shape = r as ShapeRecord;
            return shape.typeName === "shape" && shape.type === "mtg-card";
          }).length
        : -1;
    void inSpan("sync connection reconnected", () => {}, {
      "reconnect.offline_duration_ms": offlineDurationMs,
      "reconnect.card_count": cardCount,
    });
  }, [connectionStatus, store]);
}
