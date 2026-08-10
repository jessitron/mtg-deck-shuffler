import { NoteShapeUtil, TLNoteShape, TLShapePartial } from "tldraw";

// Ticket 19 (notes ride along like counters): mtg-card defines `onClick`
// (the tap toggle), which makes tldraw defer selecting a clicked card until
// pointer-up — and if a drag threshold is crossed while some OTHER shape is
// still selected from its own prior drag, tldraw keeps translating that
// stale selection instead of the shape under the pointer (the same
// drag-identity bug ticket 16/18 hit with counters). MtgCounterShapeUtil
// dodges it by clearing selection on its own onTranslateEnd; a note is a
// STOCK tldraw shape we can't add a hook to directly, so this subclass
// exists purely to carry that same cleanup. Registered in place of the
// stock NoteShapeUtil in TablePage.tsx — same `type: "note"`, same schema,
// so sync and persistence are unaffected.
export class SelectionClearingNoteShapeUtil extends NoteShapeUtil {
  override onTranslateEnd(): TLShapePartial<TLNoteShape> | undefined {
    this.editor.setSelectedShapes([]);
    return undefined;
  }
}
