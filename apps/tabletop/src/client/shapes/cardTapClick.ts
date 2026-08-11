import { Editor, TLShapePartial } from "tldraw";
import { MtgCardShape } from "../../shared/mtgCardShape";
import { tapPartial } from "./cardTap";

// Ticket 01 (organizational split): onClick's body, pulled out of
// MtgCardShapeUtil.tsx verbatim, `this.editor` passed explicitly as
// `editor` instead. Still tldraw-dependent (Editor, the queueMicrotask
// undo-coalescing timing below) — see the ticket for why no tldraw-free
// boundary exists cleanly here.

// JES-144: tap/untap a card by clicking it — a toggle, not a 4-way
// rotation cycle, so a second click always taps it back. `props.tapped` is
// the source of truth; rotation is purely visual and additive on top of it,
// applied as a delta so it composes with whatever free rotation left the
// card at, instead of snapping to an absolute angle.
//
// Ticket 16 (multi-untap): if the clicked card is part of the current
// selection (marquee), its NEW tapped state propagates to every other
// selected mtg-card — a state push, not a per-card toggle, so a mixed
// selection converges. The clicked card's own change must still be
// RETURNED synchronously: when onClick returns a change,
// PointingShape.onPointerUp early-returns and the multi-selection
// survives the click (returning undefined falls through to selection
// logic that collapses it to the clicked card).
export function handleCardClick(editor: Editor, shape: MtgCardShape): TLShapePartial<MtgCardShape> | undefined {
  const tapped = !shape.props.tapped;

  const selectedIds = editor.getSelectedShapeIds();
  const otherIds = selectedIds.includes(shape.id) ? selectedIds.filter((id) => id !== shape.id) : [];
  if (otherIds.length > 0) {
    // Deferred via queueMicrotask — undocumented-tldraw-ordering alert:
    // PointingShape.onPointerUp calls markHistoryStoppingPoint() and then
    // updateShapes([change]) AFTER onClick returns, so a synchronous write
    // here would land BEFORE the mark, fusing into the previous undo entry.
    // The microtask runs after the whole pointer-up handler — after the
    // mark — so the propagated writes coalesce into the same new undo
    // entry as the clicked card's own change, and one Ctrl+Z reverts the
    // whole gesture. Guarded by verify-multi-untap.spec.ts, which is the
    // tripwire for a tldraw upgrade reordering this. Never "upgrade" this
    // to setTimeout: a macrotask could interleave with other input events.
    queueMicrotask(() => {
      const partials: TLShapePartial<MtgCardShape>[] = [];
      for (const id of otherIds) {
        // Re-fetch fresh: the clicked card's update (and possibly remote
        // changes) applied between onClick and this microtask. A marquee
        // can also catch counters and other shapes — cards only. Cards
        // already at the target state are skipped entirely: rotation is a
        // delta, and applying ±90° to an already-correct card would
        // corrupt its free rotation.
        const fresh = editor.getShape(id);
        if (!fresh || fresh.type !== "mtg-card") continue;
        const card = fresh as MtgCardShape;
        if (card.props.tapped === tapped) continue;
        partials.push(tapPartial(card, tapped));
      }
      if (partials.length > 0) editor.updateShapes(partials);
    });
  }

  return tapPartial(shape, tapped);
}
