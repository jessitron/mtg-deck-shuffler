import { RecordProps, TLShape } from "@tldraw/tlschema";
import { T } from "@tldraw/validate";

export interface MtgCounterShapeProps {
  w: number;
  h: number;
  text: string;
}

declare module "@tldraw/tlschema" {
  interface TLGlobalShapePropsMap {
    "mtg-counter": MtgCounterShapeProps;
  }
}

export type MtgCounterShape = TLShape<"mtg-counter">;

export const mtgCounterShapeProps: RecordProps<MtgCounterShape> = {
  w: T.nonZeroNumber,
  h: T.nonZeroNumber,
  text: T.string,
};
