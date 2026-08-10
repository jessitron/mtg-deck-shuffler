import { RecordProps, TLShape } from "@tldraw/tlschema";
import { T } from "@tldraw/validate";

/**
 * The `mtg-card` custom shape (tabletop-physics ticket 12): a genuine shape
 * type, not a stock `image` shape borrowed for cards. Both faces' URLs travel
 * with the card from arrival, so flip is a pure `props.face` write — no
 * re-fetch, no per-instance tldraw asset. `zone` deliberately isn't here:
 * zone membership stays tracked via `meta.zone` on the card (ticket 13 gave
 * zones their own `mtg-zone` shape type; the card's own debounce state
 * deliberately didn't move into `props`).
 */
export interface MtgCardShapeProps {
  w: number;
  h: number;
  instanceId: string;
  scryfallId: string;
  cardName: string;
  frontImageUrl: string;
  backImageUrl: string | null;
  cardBackImageUrl: string | null;
  face: "front" | "back";
  faceDown: boolean;
  tapped: boolean;
  /**
   * The owning seat's sleeve, baked in at mint time (table-layout ticket 17).
   * Legal to bake because sleeve color is a game constant — chosen before the
   * game, never changed mid-game. null ⇔ unsleeved (today's bare look).
   */
  sleeveColor: string | null;
}

// tldraw's documented mechanism for adding a custom shape to its `TLShape`
// union (TLShape.ts: "custom shapes should be defined by augmenting
// TLGlobalShapePropsMap") — without this, `BaseBoxShapeUtil<MtgCardShape>`
// fails to typecheck: `TLBaseBoxShape`'s constraint is `Extract<TLShape,
// {props: {w,h}}>`, which only ever sees tldraw's own stock shape types.
declare module "@tldraw/tlschema" {
  interface TLGlobalShapePropsMap {
    "mtg-card": MtgCardShapeProps;
  }
}

export type MtgCardShape = TLShape<"mtg-card">;

export const mtgCardShapeProps: RecordProps<MtgCardShape> = {
  w: T.nonZeroNumber,
  h: T.nonZeroNumber,
  instanceId: T.string,
  scryfallId: T.string,
  cardName: T.string,
  frontImageUrl: T.string,
  backImageUrl: T.string.nullable(),
  cardBackImageUrl: T.string.nullable(),
  face: T.literalEnum("front", "back"),
  faceDown: T.boolean,
  tapped: T.boolean,
  sleeveColor: T.string.nullable(),
};
