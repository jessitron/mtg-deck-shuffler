import { BaseBoxShapeUtil, TLDragShapesOutInfo, TLShape, TLShapePartial } from "tldraw";
import { MtgCardShape, mtgCardShapeProps } from "../../shared/mtgCardShape";
import { CardFace, cardIndicatorPath } from "./cardRender";
import { handleCardClick } from "./cardTapClick";
import { canReceivePassenger, canRemovePassenger, handleDragShapesIn, handleDragShapesOut } from "./cardPassengers";
import { handleTranslateEnd } from "./cardZoneEntry";

/**
 * JES-144, tabletop-physics ticket 12: `mtg-card`, a genuine custom shape
 * (see MtgCardShapeProps) rather than a stock `image` shape borrowed for
 * cards, furniture, and stray drops alike. Tap state lives in `props.tapped`
 * — never read back out of rotation — so free rotation and tap compose
 * independently instead of one clobbering the other's read of "is this
 * tapped".
 *
 * Ticket 01 (organizational split): this class is a thin tldraw-`ShapeUtil`
 * shell — every hook's actual body lives in a sibling file (`cardRender.tsx`,
 * `cardTapClick.ts`, `cardPassengers.ts`, `cardZoneEntry.ts`), split by hook
 * rather than by a physics/interop seam. Grilling on the ticket found no
 * clean seam of that kind here: every hook mixes a tldraw quirk with a card
 * rule inseparably (see the ticket for the specifics). This split is
 * organizational — for navigability of a 400-line, 21-commit file — not an
 * attempt to hide `Editor` behind a domain-only interface.
 */
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
