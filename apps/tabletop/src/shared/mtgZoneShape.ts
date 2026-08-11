import { RecordProps, TLShape } from "@tldraw/tlschema";
import { T } from "@tldraw/validate";

export interface MtgZoneShapeProps {
  w: number;
  h: number;
  zone: "playmat" | "library" | "graveyard" | "exile" | "stack" | "command";
  seatId: string | null;
  label: string;
  sleeveColor: string | null;
  imageUrl: string | null;
}

export const LIBRARY_PILE_INSET = 12;

export const ZONE_LABEL_BAND = 40;

declare module "@tldraw/tlschema" {
  interface TLGlobalShapePropsMap {
    "mtg-zone": MtgZoneShapeProps;
  }
}

export type MtgZoneShape = TLShape<"mtg-zone">;

export const mtgZoneShapeProps: RecordProps<MtgZoneShape> = {
  w: T.nonZeroNumber,
  h: T.nonZeroNumber,
  zone: T.literalEnum("playmat", "library", "graveyard", "exile", "stack", "command"),
  seatId: T.string.nullable(),
  label: T.string,
  sleeveColor: T.string.nullable(),
  imageUrl: T.string.nullable(),
};
