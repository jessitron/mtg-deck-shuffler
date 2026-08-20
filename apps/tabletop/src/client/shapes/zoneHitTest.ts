import { Computed, computed, Editor, TLShapeId, useValue, VecLike } from "tldraw";
import { MtgZoneShapeProps } from "../../shared/mtgZoneShape";
import { MtgCardShape } from "../../shared/mtgCardShape";

export interface ZoneHit {
  id: TLShapeId;
  zone: MtgZoneShapeProps["zone"];
  seatId: MtgZoneShapeProps["seatId"];
}

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

const armedZoneIdByEditor = new WeakMap<Editor, Computed<TLShapeId | undefined>>();
function armedZoneIdSignal(editor: Editor) {
  let signal = armedZoneIdByEditor.get(editor);
  if (!signal) {
    signal = computed("armedZoneId", () => {
      if (!editor.isIn("select.translating")) return undefined;
      const hit = topmostZoneAt(editor, editor.inputs.currentPagePoint);
      if (!hit) return undefined;
      if (hit.zone === "command" && !allDraggedCardsAreOwnersCommander(editor, hit.seatId)) {
        return undefined;
      }
      if (hit.zone === "library" && !allDraggedCardsBelongToOwner(editor, hit.seatId)) {
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
 * The library portal's gate (ticket 12): only the player's own library swallows a card,
 * and only cards — a dragged counter (or any non-card selection) must not arm it. A card
 * with no `gameCardIndex` can never be sent as `card.returned.v1`, so it's excluded too.
 * A mixed-ownership multi-select doesn't arm at all — one destination for the whole group,
 * or none, same posture as the command-zone gate above.
 */
export function allDraggedCardsBelongToOwner(editor: Editor, seatId: string | null): boolean {
  const selected = editor.getSelectedShapes();
  const draggedCards = selected.filter((shape): shape is MtgCardShape => shape.type === "mtg-card");
  if (draggedCards.length === 0 || draggedCards.length !== selected.length) return false;
  return draggedCards.every((card) => card.props.owner === seatId && card.props.gameCardIndex !== null);
}

export function useIsZoneArmed(editor: Editor, zoneId: TLShapeId): boolean {
  return useValue("isZoneArmed", () => armedZoneIdSignal(editor).get() === zoneId, [editor, zoneId]);
}

/** The armed zone's id, but only when it's a library — for the swirl overlay (ticket 12). */
export function useArmedLibraryZoneId(editor: Editor): TLShapeId | undefined {
  return useValue(
    "armedLibraryZoneId",
    () => {
      const id = armedZoneIdSignal(editor).get();
      if (!id) return undefined;
      const shape = editor.getShape(id);
      if (!shape || shape.type !== "mtg-zone") return undefined;
      return (shape.props as MtgZoneShapeProps).zone === "library" ? id : undefined;
    },
    [editor]
  );
}
