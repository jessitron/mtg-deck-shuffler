import { ImageShapeUtil, TLImageShape, TLShapePartial } from "tldraw";

// Same hazard as SelectionClearingNoteShapeUtil (Ticket 19): mtg-card
// defines `onClick`, which makes tldraw defer selecting a clicked card
// until pointer-up — if a drag threshold is crossed while some OTHER
// shape is still selected from its own prior drag, tldraw keeps
// translating that stale selection instead of the shape under the
// pointer. A pasted/dropped image is tldraw's STOCK `image` shape, which
// (like stock `note`) has no onTranslateEnd of its own to clear selection
// on drag-settle (confirmed by reading tldraw's ImageShapeUtil source) —
// this subclass supplies one. Registered in place of the stock
// ImageShapeUtil in TablePage.tsx — same `type: "image"`, same schema, so
// sync and persistence are unaffected.
export class SelectionClearingImageShapeUtil extends ImageShapeUtil {
  override onTranslateEnd(): TLShapePartial<TLImageShape> | undefined {
    this.editor.setSelectedShapes([]);
    return undefined;
  }
}
