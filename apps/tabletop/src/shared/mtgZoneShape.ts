import { RecordProps, TLShape } from "@tldraw/tlschema";
import { T } from "@tldraw/validate";

/**
 * The `mtg-zone` custom shape (tabletop-physics ticket 13): furniture
 * (playmat, library, graveyard, exile, the Stack) as a genuine shape type
 * instead of stock locked `geo`/`image` shapes tagged with a freeform
 * `meta.zone` string. `command` is included even though no server code
 * places a command zone yet — same posture as `mtg-card`'s validated props.
 */
export interface MtgZoneShapeProps {
  w: number;
  h: number;
  zone: "playmat" | "library" | "graveyard" | "exile" | "stack" | "command";
  seatId: string | null;
  label: string;
}

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
};
