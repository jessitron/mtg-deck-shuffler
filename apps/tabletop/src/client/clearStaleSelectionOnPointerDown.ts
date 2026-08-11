import { Editor, getHitShapeOnCanvasPointerDown, TLEventInfo } from "tldraw";

export function clearStaleSelectionOnPointerDown(editor: Editor): void {
  editor.on("event", (info: TLEventInfo) => {
    if (info.type !== "pointer" || info.name !== "pointer_down" || info.target !== "canvas") return;
    const hitShape = getHitShapeOnCanvasPointerDown(editor);
    if (!hitShape) return;
    if (editor.getSelectedShapeIds().includes(hitShape.id)) return;
    editor.setSelectedShapes([]);
  });
}
