import React, { useEffect, useMemo } from "react";
import { Tldraw, TLAssetStore } from "tldraw";
import "tldraw/tldraw.css";
import { useSync } from "@tldraw/sync";
import { setGlobalAttrs, currentTraceparent, inSpan } from "./observability";
import { useCardArrivalSpans } from "./useCardArrivalSpans";

/**
 * The table: a synced tldraw canvas. Anyone with the URL joins — spectators
 * come free (v0 has no seat concept on the canvas; full access).
 * The "made with tldraw" watermark stays, worn happily.
 */

// v0 asset store: no upload service, so pasted/dropped images are inlined as
// data URLs (they sync as part of the document). Server-injected card shapes
// carry their own Scryfall URLs and never touch this path.
const inlineAssets: TLAssetStore = {
  upload: async (_asset, file) => {
    const src = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    return { src };
  },
  resolve: (asset) => asset.props.src,
};

export function TablePage({ tableSlug }: { tableSlug: string }) {
  useEffect(() => {
    setGlobalAttrs({ "table.name": tableSlug });
    void inSpan("table page opened", () => {}, { "table.name": tableSlug });
  }, [tableSlug]);

  const uri = useMemo(() => {
    const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
    let connectionUri = `${wsProtocol}://${window.location.host}/connect/${encodeURIComponent(tableSlug)}`;
    // Propagation belongs to the connection REQUEST only: the traceparent rides
    // the URL, parents the server's "ws connect" span, and that's the end of it.
    const traceparent = currentTraceparent();
    if (traceparent) {
      connectionUri += `?traceparent=${encodeURIComponent(traceparent)}`;
    }
    return connectionUri;
  }, [tableSlug]);

  const store = useSync({ uri, assets: inlineAssets });

  useCardArrivalSpans(store);

  if (store.status === "error") {
    return (
      <div data-testid="table-error" style={centered}>
        Could not reach the table &ldquo;{tableSlug}&rdquo;: {store.error.message}
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0 }} data-testid="table-canvas">
      {store.status === "loading" ? (
        <div style={centered}>Joining table &ldquo;{tableSlug}&rdquo;…</div>
      ) : (
        <Tldraw store={store.store} deepLinks />
      )}
    </div>
  );
}

const centered: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "Georgia, serif",
  fontSize: "1.25rem",
};
