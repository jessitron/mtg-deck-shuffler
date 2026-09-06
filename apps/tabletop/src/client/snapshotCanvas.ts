import { Editor } from "tldraw";
import { TableState } from "../shared/tableState";

/** Reads card shape records off a live tldraw editor into the same TableState shape projectEvents produces. */
export function snapshotCanvas(editor: Editor): TableState {
  const instanceIds = editor
    .getCurrentPageShapes()
    .filter((shape) => shape.type === "mtg-card")
    .map((shape) => (shape.props as { instanceId: string }).instanceId);
  return { cardInstanceIds: instanceIds.sort() };
}
