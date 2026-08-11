import { RecordProps, TLShape } from "@tldraw/tlschema";
import { T } from "@tldraw/validate";

export interface MtgCardShapeProps {
  w: number;
  h: number;
  instanceId: string;
  scryfallId: string;
  cardName: string;
  frontImageUrl: string;
  backImageUrl: string | null;
  face: "front" | "back";
  faceDown: boolean;
  tapped: boolean;
  sleeveColor: string | null;
  cardBackImageUrl: string | null;
  owner: string;
  /** Whether this card is one of its owner's commanders (table-layout ticket 18). */
  isCommander: boolean;
}

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
  face: T.literalEnum("front", "back"),
  faceDown: T.boolean,
  tapped: T.boolean,
  sleeveColor: T.string.nullable(),
  cardBackImageUrl: T.string.nullable(),
  owner: T.string,
  isCommander: T.boolean,
};
