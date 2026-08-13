import { RecordProps, TLShape } from "@tldraw/tlschema";
import { T } from "@tldraw/validate";

export interface MtgTitleShapeProps {
  w: number;
  h: number;
  text: string;
  /** Text color: the darker of the deck's identity colors (raw hex), or a token fallback. */
  color: string;
}

declare module "@tldraw/tlschema" {
  interface TLGlobalShapePropsMap {
    "mtg-title": MtgTitleShapeProps;
  }
}

export type MtgTitleShape = TLShape<"mtg-title">;

export const mtgTitleShapeProps: RecordProps<MtgTitleShape> = {
  w: T.nonZeroNumber,
  h: T.nonZeroNumber,
  text: T.string,
  color: T.string,
};
