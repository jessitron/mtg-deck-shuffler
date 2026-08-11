import { useEffect } from "react";
import type { RemoteTLStoreWithStatus } from "@tldraw/sync";
import { inSpan } from "./observability";

export function useCardArrivalSpans(store: RemoteTLStoreWithStatus): void {
  useEffect(() => {
    if (store.status !== "synced-remote") return;

    const unlisten = store.store.listen(
      (change) => {
        for (const record of Object.values(change.changes.added)) {
          const asAny = record as { typeName?: string; type?: string; props?: Record<string, unknown> };
          if (asAny.typeName === "shape" && asAny.type === "mtg-card" && typeof asAny.props?.instanceId === "string") {
            void inSpan("card arrived on canvas", () => {}, {
              "card.instance_id": asAny.props.instanceId as string,
              "card.scryfall_id": (asAny.props.scryfallId as string) ?? "",
              "card.name": (asAny.props.cardName as string) ?? "",
            });
          }
        }
      },
      { source: "remote", scope: "document" }
    );
    return unlisten;
  }, [store]);
}
