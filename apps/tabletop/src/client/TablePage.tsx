import React, { useEffect, useMemo } from "react";
import { defaultShapeUtils, Tldraw, TLAssetStore } from "tldraw";
import "tldraw/tldraw.css";
import { useSync } from "@tldraw/sync";
import { setGlobalAttrs, currentTraceparent, inSpan } from "./observability";
import { useCardArrivalSpans } from "./useCardArrivalSpans";
import { MtgCardShapeUtil } from "./shapes/MtgCardShapeUtil";

// useSync (unlike <Tldraw>) builds its store schema from exactly the
// shapeUtils it's given — it does NOT fold in tldraw's own defaults the way
// <Tldraw> does — so the stock shapes furniture and name labels still use
// (geo, image, text, ...) have to be listed here explicitly alongside
// mtg-card, or the client store rejects them outright.
const shapeUtils = [...defaultShapeUtils, MtgCardShapeUtil];

/**
 * The table: a synced tldraw canvas. Anyone with the URL joins — spectators
 * come free (v0 has no seat concept on the canvas; full access).
 * The "made with tldraw" watermark stays, worn happily.
 */

// tldraw >= 4 HIDES THE WHOLE EDITOR 5 SECONDS AFTER LOAD when it decides it's
// an unlicensed production deployment — the canvas is replaced by a hidden
// <div data-testid="tl-license-expired">, i.e. a blank white page. "Production"
// is decided by URL alone: any HTTPS non-loopback hostname. So localhost is
// always fine and table.jessitron.honeydemo.io always needs a key. See
// @tldraw/editor/src/lib/license/LicenseProvider.tsx.
//
// Baked into the bundle at build time from the shell's TLDRAW_LICENSE_KEY (see
// vite.config.ts `define`). Empty string => undefined, which is what tldraw
// wants when there is no key. The key is domain-bound and ships to browsers by
// design, so it is not a secret — but it still lives in the repo-root .be
// (untracked), NOT in apps/tabletop/.env, which is committed to a public repo.
const licenseKey = import.meta.env.VITE_TLDRAW_LICENSE_KEY || undefined;

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

  const store = useSync({ uri, assets: inlineAssets, shapeUtils });

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
        <Tldraw store={store.store} deepLinks licenseKey={licenseKey} shapeUtils={shapeUtils} />
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
