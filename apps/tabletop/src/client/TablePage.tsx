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
  useEditor,
  useIsToolSelected,
  useToasts,
  useTools,
} from "tldraw";
import "tldraw/tldraw.css";
import { useSync } from "@tldraw/sync";
import { setGlobalAttrs, currentTraceparent, inSpan } from "./observability";
import { tableNameFromSlug } from "../shared/slugify";
import { chooseLicenseKey } from "./chooseLicenseKey";
import { useCardArrivalSpans } from "./useCardArrivalSpans";
import { usePhysicsAnnouncements } from "./usePhysicsAnnouncements";
import { MtgCardShapeUtil } from "./shapes/MtgCardShapeUtil";
import { MtgCounterShapeUtil } from "./shapes/MtgCounterShapeUtil";
import { MtgCounterTool } from "./shapes/MtgCounterTool";
import { MtgLifeCounterShapeUtil } from "./shapes/MtgLifeCounterShapeUtil";
import { MtgTitleShapeUtil } from "./shapes/MtgTitleShapeUtil";
import { MtgZoneShapeUtil } from "./shapes/MtgZoneShapeUtil";
import { TableContextMenu } from "./CardContextMenu";
import { clearStaleSelectionOnPointerDown } from "./clearStaleSelectionOnPointerDown";
import { closeContextMenuBeforeOutsideClick } from "./closeContextMenuBeforeOutsideClick";

const shapeUtils = [
  ...defaultShapeUtils,
  MtgCardShapeUtil,
  MtgZoneShapeUtil,
  MtgCounterShapeUtil,
  MtgLifeCounterShapeUtil,
  MtgTitleShapeUtil,
];

const tools = [MtgCounterTool];

const COPY_DISABLED_TOAST: Parameters<ReturnType<typeof useToasts>["addToast"]>[0] = {
  id: "copy-disabled-hint",
  title: "Copy doesn't work here",
  description: "Use duplicate (ctrl-d) instead.",
  severity: "info",
};

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
  actions(_editor, actions, { addToast }) {
    actions.copy = {
      ...actions.copy,
      onSelect: () => {
        addToast(COPY_DISABLED_TOAST);
      },
    };
    return actions;
  },
};

/**
 * tldraw handles ctrl+c/cmd+c itself, via the browser's native "copy" event
 * rather than the `overrides.actions` map — `copy`/`cut`/`paste` are
 * explicitly skipped from the action-keyboard dispatcher (see tldraw's
 * `useKeyboardShortcuts` `SKIP_KBDS`). So the only way to intercept the
 * keyboard shortcut is to out-race tldraw's own "copy" listener with a
 * capturing one on `window`, which fires before it.
 */
function useCopyHint() {
  const editor = useEditor();
  const { addToast } = useToasts();
  useEffect(() => {
    const handleCopy = (event: ClipboardEvent) => {
      if (editor.getSelectedShapeIds().length === 0 || editor.getEditingShapeId() !== null) {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      addToast(COPY_DISABLED_TOAST);
    };
    window.addEventListener("copy", handleCopy, { capture: true });
    return () => window.removeEventListener("copy", handleCopy, { capture: true });
  }, [editor, addToast]);
}

function ToolbarWithCounter(props: React.ComponentProps<typeof DefaultToolbar>) {
  useCopyHint();
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
  ContextMenu: TableContextMenu,
};


const bakedLicenseKey = import.meta.env.VITE_TLDRAW_LICENSE_KEY || undefined;
const licenseKey = chooseLicenseKey(
  window.location.protocol,
  window.location.hostname,
  bakedLicenseKey,
);

const TABLE_EXTENT = new Box(-2802, -1612, 5604, 3164);

function onTldrawMount(editor: Editor) {
  editor.zoomToBounds(TABLE_EXTENT, { inset: 24 });
  clearStaleSelectionOnPointerDown(editor);
  return closeContextMenuBeforeOutsideClick();
}

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
    const tableName = tableNameFromSlug(tableSlug);
    setGlobalAttrs({ "table.name": tableName, "table.slug": tableSlug });
    void inSpan("table page opened", () => {}, { "table.name": tableName, "table.slug": tableSlug });
  }, [tableSlug]);

  const uri = useMemo(() => {
    const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
    let connectionUri = `${wsProtocol}://${window.location.host}/connect/${encodeURIComponent(tableSlug)}`;
    const traceparent = currentTraceparent();
    if (traceparent) {
      connectionUri += `?traceparent=${encodeURIComponent(traceparent)}`;
    }
    return connectionUri;
  }, [tableSlug]);

  const store = useSync({ uri, assets: inlineAssets, shapeUtils });

  useCardArrivalSpans(store);
  usePhysicsAnnouncements(store);

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
          licenseKey={licenseKey}
          shapeUtils={shapeUtils}
          tools={tools}
          overrides={uiOverrides}
          components={components}
          onMount={onTldrawMount}
        />
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
