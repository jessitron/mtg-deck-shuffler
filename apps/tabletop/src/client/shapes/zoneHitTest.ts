import { Computed, computed, Editor, TLShapeId, useValue, VecLike } from "tldraw";
import { MtgZoneShapeProps } from "../../shared/mtgZoneShape";

export interface ZoneHit {
  id: TLShapeId;
  zone: MtgZoneShapeProps["zone"];
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
      winner = { id: candidate.id, zone: (candidate.props as MtgZoneShapeProps).zone, index: candidate.index };
    }
  }
  return winner;
}

/**
 * The ids of every zone currently "armed": the topmost zone under the center
 * of each shape mid-drag, if any. tldraw's default multi-select lets several
 * cards be dragged together, each potentially over a different zone, so this
 * is a set rather than a single id. One `computed` per editor (not one per
 * zone shape) — during a drag, tldraw's `Translating` state updates shape
 * position on every raw pointer-move (not throttled), so N zones each
 * independently rescanning all zones would be O(zones²) work per tick;
 * sharing one signal drops that to O(zones).
 */
const EMPTY_ARMED_SET: ReadonlySet<TLShapeId> = new Set();
const armedZoneIdsByEditor = new WeakMap<Editor, Computed<ReadonlySet<TLShapeId>>>();
function armedZoneIdsSignal(editor: Editor) {
  let signal = armedZoneIdsByEditor.get(editor);
  if (!signal) {
    signal = computed(
      "armedZoneIds",
      () => {
        if (!editor.isIn("select.translating")) return EMPTY_ARMED_SET;
        const armed = new Set<TLShapeId>();
        for (const id of editor.getSelectedShapeIds()) {
          const shape = editor.getShape(id);
          const bounds = shape && editor.getShapePageBounds(shape);
          const hit = bounds && topmostZoneAt(editor, bounds.center);
          if (hit) armed.add(hit.id);
        }
        return armed.size > 0 ? armed : EMPTY_ARMED_SET;
      },
      { isEqual: setsEqual }
    );
    armedZoneIdsByEditor.set(editor, signal);
  }
  return signal;
}

function setsEqual<T>(a: ReadonlySet<T>, b: ReadonlySet<T>): boolean {
  if (a.size !== b.size) return false;
  for (const item of a) if (!b.has(item)) return false;
  return true;
}

/**
 * Is `zoneId` one of the currently-armed zones? A pure reactive read — never
 * written to the store, so it produces no synced document write and no undo
 * entry, and (since it's derived purely from this browser's own editor
 * instance) is never visible on another client's copy of the same zone shape.
 */
export function useIsZoneArmed(editor: Editor, zoneId: TLShapeId): boolean {
  return useValue("isZoneArmed", () => armedZoneIdsSignal(editor).get().has(zoneId), [editor, zoneId]);
}
