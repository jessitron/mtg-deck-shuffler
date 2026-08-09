import React, { useEffect, useMemo } from "react";
import {
  Box,
  DefaultToolbar,
  DefaultToolbarContent,
  defaultShapeUtils,
  Editor,
  Tldraw,
  TLAssetStore,
  TLComponents,
  TldrawUiMenuItem,
  TLUiOverrides,
  useIsToolSelected,
  useTools,
} from "tldraw";
import "tldraw/tldraw.css";
import { useSync } from "@tldraw/sync";
import { setGlobalAttrs, currentTraceparent, inSpan } from "./observability";
import { useCardArrivalSpans } from "./useCardArrivalSpans";
import { MtgCardShapeUtil } from "./shapes/MtgCardShapeUtil";
import { MtgCounterShapeUtil } from "./shapes/MtgCounterShapeUtil";
import { MtgCounterTool } from "./shapes/MtgCounterTool";
import { MtgZoneShapeUtil } from "./shapes/MtgZoneShapeUtil";
import { PortalArmingOverlay, PortalVariantSwitcher } from "./shapes/portalGesturePrototype";

// useSync (unlike <Tldraw>) builds its store schema from exactly the
// shapeUtils it's given — it does NOT fold in tldraw's own defaults the way
// <Tldraw> does — so the stock shapes the name label still uses (text, ...)
// have to be listed here explicitly alongside mtg-card/mtg-zone/mtg-counter,
// or the client store rejects them outright.
const shapeUtils = [...defaultShapeUtils, MtgCardShapeUtil, MtgZoneShapeUtil, MtgCounterShapeUtil];

const tools = [MtgCounterTool];

// Ticket 18: one toolbar item to create a counter — stock tldraw chrome and a
// stock icon on purpose (tldraw owns its toolbar; a bespoke styled button
// would fight it, and map 4 owns toolbar curation).
const uiOverrides: TLUiOverrides = {
  tools(editor, toolItems) {
    toolItems["mtg-counter"] = {
      id: "mtg-counter",
      label: "Counter",
      icon: "geo-ellipse",
      onSelect: () => editor.setCurrentTool("mtg-counter"),
    };
    return toolItems;
  },
};

function ToolbarWithCounter(props: React.ComponentProps<typeof DefaultToolbar>) {
  const toolItems = useTools();
  const isCounterSelected = useIsToolSelected(toolItems["mtg-counter"]);
  return (
    <DefaultToolbar {...props}>
      <TldrawUiMenuItem {...toolItems["mtg-counter"]} isSelected={isCounterSelected} />
      <DefaultToolbarContent />
    </DefaultToolbar>
  );
}

const components: TLComponents = {
  Toolbar: ToolbarWithCounter,
  // PROTOTYPE (portal gesture ticket 04): library-arming visuals, drawn in
  // viewport space over the canvas (the library's zone box is hidden under
  // its opaque image, so arming can't render inside the shape).
  InFrontOfTheCanvas: PortalArmingOverlay,
};

/**
 * The table: a synced tldraw canvas. Anyone with the URL joins — spectators
 * come free (v0 has no seat concept on the canvas; full access).
 * The "made with tldraw" watermark stays, worn happily.
 */

// tldraw >= 4 HIDES THE WHOLE EDITOR 5 SECONDS AFTER LOAD when it decides it's
// an unlicensed production deployment — the canvas is replaced by a hidden
// <div data-testid="tl-license-expired">, i.e. a blank white page. "Production"
// is decided by URL alone: any HTTPS non-loopback hostname. So
// table.jessitron.honeydemo.io always needs a key, and localhost never does —
// but see below: localhost must also never be GIVEN one. See
// @tldraw/editor/src/lib/license/LicenseProvider.tsx.
//
// Baked into the bundle at build time from the shell's TLDRAW_LICENSE_KEY (see
// vite.config.ts `define`). Empty string => undefined, which is what tldraw
// wants when there is no key. The key is domain-bound and ships to browsers by
// design, so it is not a secret — but it still lives in the repo-root .be
// (untracked), NOT in apps/tabletop/.env, which is committed to a public repo.
const bakedLicenseKey = import.meta.env.VITE_TLDRAW_LICENSE_KEY || undefined;

// The dev exemption above only covers MISSING or unparseable keys: a parseable
// but EXPIRED key returns 'expired' from getLicenseState unconditionally and
// blanks the canvas even at localhost. On a loopback host tldraw neither needs
// nor wants a key, so withhold it — then local dev works no matter what state
// the key in .be is in. Loopback test mirrors tldraw's own isLoopbackHost.
//
// Withholding means EMPTY STRING, not undefined: when the prop is undefined,
// LicenseProvider falls back to reading the key from the environment itself —
// including import.meta.env.VITE_TLDRAW_LICENSE_KEY, which vite's `define`
// rewrote to the key literal inside tldraw's own bundled code. "" defeats the
// fallback and still takes the no-key path in getLicenseFromKey.
function isLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return host === "localhost" || host === "::1" || /^127(?:\.\d{1,3}){3}$/.test(host);
}
const licenseKey = isLoopbackHost(window.location.hostname) ? "" : bakedLicenseKey;

// The table is laid out around the board origin (DESIGN.md "The square"), so
// most furniture sits at negative page coordinates — but tldraw's default
// camera opens with page (0,0) at the viewport's top-left, onto mostly empty
// canvas. Frame the table's full extent once at mount — a fixed region, not a
// fit to current content, so the camera is deterministic on an empty table
// and never moves on its own when furniture arrives later. A deep link (?d=)
// already says where to look, so it wins. The extent mirrors cardLayout.ts's
// four compass slots + Stack (provisional geometry — tweak alongside it).
const TABLE_EXTENT = new Box(-2802, -1612, 5604, 3164);

function aimCameraAtTheTable(editor: Editor) {
  if (new URLSearchParams(window.location.search).has("d")) return;
  editor.zoomToBounds(TABLE_EXTENT, { inset: 24 });
}

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
        <Tldraw
          store={store.store}
          deepLinks
          licenseKey={licenseKey}
          shapeUtils={shapeUtils}
          tools={tools}
          overrides={uiOverrides}
          components={components}
          onMount={aimCameraAtTheTable}
        />
      )}
      {/* PROTOTYPE (portal gesture ticket 04) */}
      <PortalVariantSwitcher />
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
