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

export function useIsZoneArmed(editor: Editor, zoneId: TLShapeId): boolean {
  return useValue("isZoneArmed", () => armedZoneIdSignal(editor).get() === zoneId, [editor, zoneId]);
}
