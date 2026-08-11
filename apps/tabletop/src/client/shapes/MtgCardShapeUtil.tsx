import { BaseBoxShapeUtil, TLDragShapesOutInfo, TLShape, TLShapePartial } from "tldraw";
import { MtgCardShape, mtgCardShapeProps } from "../../shared/mtgCardShape";
import { CardFace, cardIndicatorPath } from "./cardRender";
import { handleCardClick } from "./cardTapClick";
import { canReceivePassenger, canRemovePassenger, handleDragShapesIn, handleDragShapesOut } from "./cardPassengers";
import { handleTranslateEnd } from "./cardZoneEntry";

export class MtgCardShapeUtil extends BaseBoxShapeUtil<MtgCardShape> {
  static override type = "mtg-card" as const;
  static override props = mtgCardShapeProps;

  override getDefaultProps(): MtgCardShape["props"] {
    return {
      w: 170,
      h: 238,
      instanceId: "",
      scryfallId: "",
      cardName: "",
      frontImageUrl: "",
      backImageUrl: null,
      face: "front",
      faceDown: false,
      tapped: false,
      sleeveColor: null,
      cardBackImageUrl: null,
      owner: "",
      isCommander: false,
    };
  }

  override isAspectRatioLocked(): boolean {
    return true;
  }

  component(shape: MtgCardShape) {
    return <CardFace shape={shape} />;
  }

  override getIndicatorPath(shape: MtgCardShape) {
    return cardIndicatorPath(shape);
  }

  override onClick(shape: MtgCardShape): TLShapePartial<MtgCardShape> | undefined {
    return handleCardClick(this.editor, shape);
  }

  override canReceiveNewChildrenOfType(shape: MtgCardShape, type: TLShape["type"]): boolean {
    return canReceivePassenger(shape, type);
  }

  override canRemoveChildrenOfType(_shape: MtgCardShape, type: TLShape["type"]): boolean {
    return canRemovePassenger(type);
  }

  override onDragShapesIn(card: MtgCardShape, shapes: TLShape[]): void {
    handleDragShapesIn(this.editor, card, shapes);
  }

  override onDragShapesOut(card: MtgCardShape, shapes: TLShape[], info: TLDragShapesOutInfo): void {
    handleDragShapesOut(this.editor, card, shapes, info);
  }

  override onTranslateEnd(_initial: MtgCardShape, current: MtgCardShape): TLShapePartial<MtgCardShape> | undefined {
    return handleTranslateEnd(this.editor, current);
  }
}
