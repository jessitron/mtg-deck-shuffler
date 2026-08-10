import { Computed, computed, Editor, TLShapeId, useValue, VecLike } from "tldraw";
import { MtgZoneShapeProps } from "../../shared/mtgZoneShape";
import { MtgCardShape } from "../../shared/mtgCardShape";

export interface ZoneHit {
  id: TLShapeId;
  zone: MtgZoneShapeProps["zone"];
  seatId: MtgZoneShapeProps["seatId"];
}

/**
 * The topmost (highest-index) `mtg-zone` shape whose bounds contain `center`,
 * if any. Shared by the card's zone-entry detection (MtgCardShapeUtil) and
 * the zone's own armed-state check (MtgZoneShapeUtil), so the topmost-wins
 * tie-break lives in one place.
 *
 * Tie-break is index order (fractional-indexing `IndexKey`, plain string
 * comparison), not distance to the zone's own center — see
 * tabletop-shape-mechanics watch point 8 for the known limitation once zones
 * can overlap near their corners (not a problem either current caller hits).
 */
export function topmostZoneAt(editor: Editor, center: VecLike): ZoneHit | undefined {
  let winner: (ZoneHit & { index: string }) | undefined;
  for (const candidate of editor.getCurrentPageShapes()) {
    if (candidate.type !== "mtg-zone") continue;
    const bounds = editor.getShapePageBounds(candidate);
    if (!bounds?.containsPoint(center)) continue;
    if (!winner || candidate.index > winner.index) {
      const props = candidate.props as MtgZoneShapeProps;
      winner = { id: candidate.id, zone: props.zone, seatId: props.seatId, index: candidate.index };
    }
  }
  return winner;
}

/**
 * The id of the single zone currently "armed", if any — the zone under the
 * pointer while a drag is in progress. Deliberately keyed on the *pointer*,
 * not on each individually-selected shape's own bounds: selecting several
 * cards and dragging one moves the whole group together as a single rigid
 * unit, to a single destination ("select six cards, drag one to the
 * graveyard — I want all of them to go to the graveyard," not six
 * independently-lit zones). One `computed` per editor (not one per zone
 * shape) — during a drag, tldraw's `Translating` state updates on every raw
 * pointer-move (not throttled), so N zones each independently rescanning all
 * zones would be O(zones²) work per tick; sharing one signal drops that to
 * O(zones).
 */
const armedZoneIdByEditor = new WeakMap<Editor, Computed<TLShapeId | undefined>>();
function armedZoneIdSignal(editor: Editor) {
  let signal = armedZoneIdByEditor.get(editor);
  if (!signal) {
    signal = computed("armedZoneId", () => {
      if (!editor.isIn("select.translating")) return undefined;
      const hit = topmostZoneAt(editor, editor.inputs.currentPagePoint);
      if (!hit) return undefined;
      // A command zone is only for its owner's commanders — any other card,
      // or another seat's commander, passing over it shouldn't light it up.
      // Every other zone type stays card-agnostic, as before. "Every
      // selected card must qualify" mirrors the existing rigid-group rule
      // just below (a whole selection arms one destination, or none) rather
      // than arming on a partial match that wouldn't hold for the rest of
      // the drag.
      if (hit.zone === "command" && !allDraggedCardsAreOwnersCommander(editor, hit.seatId)) {
        return undefined;
      }
      return hit.id;
    });
    armedZoneIdByEditor.set(editor, signal);
  }
  return signal;
}

function allDraggedCardsAreOwnersCommander(editor: Editor, seatId: string | null): boolean {
  const draggedCards = editor
    .getSelectedShapes()
    .filter((shape): shape is MtgCardShape => shape.type === "mtg-card");
  if (draggedCards.length === 0) return false;
  return draggedCards.every((card) => card.props.owner === seatId && card.props.isCommander);
}

/**
 * Is `zoneId` the currently-armed zone? A pure reactive read — never written
 * to the store, so it produces no synced document write and no undo entry,
 * and (since it's derived purely from this browser's own editor instance) is
 * never visible on another client's copy of the same zone shape.
 */
export function useIsZoneArmed(editor: Editor, zoneId: TLShapeId): boolean {
  return useValue("isZoneArmed", () => armedZoneIdSignal(editor).get() === zoneId, [editor, zoneId]);
}
