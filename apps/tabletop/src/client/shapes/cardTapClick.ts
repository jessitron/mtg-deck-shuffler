import { Editor, TLShapePartial } from "tldraw";
import { MtgCardShape } from "../../shared/mtgCardShape";
import { tapPartial } from "./cardTap";


export function handleCardClick(editor: Editor, shape: MtgCardShape): TLShapePartial<MtgCardShape> | undefined {
  const tapped = !shape.props.tapped;

  const selectedIds = editor.getSelectedShapeIds();
  const otherIds = selectedIds.includes(shape.id) ? selectedIds.filter((id) => id !== shape.id) : [];
  if (otherIds.length > 0) {
    queueMicrotask(() => {
      const partials: TLShapePartial<MtgCardShape>[] = [];
      for (const id of otherIds) {
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
