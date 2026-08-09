import { RecordProps, TLShape } from "@tldraw/tlschema";
import { T } from "@tldraw/validate";

/**
 * The `mtg-zone` custom shape (tabletop-physics ticket 13): furniture
 * (playmat, library, command zone, graveyard, exile, the Stack) as a genuine
 * shape type instead of stock locked `geo`/`image` shapes tagged with a
 * freeform `meta.zone` string.
 */
export interface MtgZoneShapeProps {
  w: number;
  h: number;
  zone: "playmat" | "library" | "graveyard" | "exile" | "stack" | "command";
  seatId: string | null;
  label: string;
  /**
   * The seat's sleeve color (table-layout ticket 17), set only on a sleeved
   * seat's library zone: the pile renders as the bare sleeve rectangle
   * instead of a card-back image. null everywhere else.
   */
  sleeveColor: string | null;
}

/**
 * How far the library pile (card-back image, or the sleeve rectangle) insets
 * from its zone box, so the box's border and "Library" label peek out as a
 * frame around it. Shared between the server (image geometry,
 * tableFurniture.ts) and the client (sleeve geometry, MtgZoneShapeUtil).
 */
export const LIBRARY_PILE_INSET = 12;

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
};
