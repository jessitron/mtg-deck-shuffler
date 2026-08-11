import { StateNode } from "tldraw";
import { MtgCounterShape } from "../../shared/mtgCounterShape";
import { COUNTER_SIZE } from "./MtgCounterShapeUtil";

export class MtgCounterTool extends StateNode {
  static override id = "mtg-counter";

  override onEnter() {
    this.editor.setCursor({ type: "cross", rotation: 0 });
  }

  override onExit() {
    this.editor.setCursor({ type: "default", rotation: 0 });
  }

  override onPointerDown() {
    const point = this.editor.inputs.getCurrentPagePoint();
    this.editor.createShape<MtgCounterShape>({
      type: "mtg-counter",
      x: point.x - COUNTER_SIZE / 2,
      y: point.y - COUNTER_SIZE / 2,
    });
    this.editor.setCurrentTool("select");
  }
}
