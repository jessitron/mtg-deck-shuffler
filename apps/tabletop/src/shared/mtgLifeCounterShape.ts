import { RecordProps, TLShape } from "@tldraw/tlschema";
import { T } from "@tldraw/validate";

export interface MtgLifeCounterShapeProps {
  w: number;
  h: number;
  value: number;
  label: string | null;
  sleeveColor: string | null;
}

declare module "@tldraw/tlschema" {
  interface TLGlobalShapePropsMap {
    "mtg-life-counter": MtgLifeCounterShapeProps;
  }
}

export type MtgLifeCounterShape = TLShape<"mtg-life-counter">;

export const mtgLifeCounterShapeProps: RecordProps<MtgLifeCounterShape> = {
  w: T.nonZeroNumber,
  h: T.nonZeroNumber,
  value: T.number,
  label: T.string.nullable(),
  sleeveColor: T.string.nullable(),
};
