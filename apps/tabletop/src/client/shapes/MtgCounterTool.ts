import { StateNode } from "tldraw";
import { MtgCounterShape } from "../../shared/mtgCounterShape";
import { COUNTER_SIZE } from "./MtgCounterShapeUtil";

/**
 * Ticket 18: the minimal creation affordance for counters — pick the tool,
 * click the table, get one blank counter, back to the select tool. No drag-
 * to-size, no multi-place; a counter is always COUNTER_SIZE. (The spec never
 * says how a player obtains a counter; this is the smallest thing that makes
 * the feature usable, flagged as an assumption in the ticket outcome.)
 */
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
