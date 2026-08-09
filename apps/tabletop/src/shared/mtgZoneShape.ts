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

/**
 * Headroom reserved at the top of every card-holding zone box so the zone's
 * label (fontSize 24, drawn inside the box's top-left) stays readable with a
 * card or pile in the zone (zone-label-band, 2026-08-09). Pure headroom, not
 * chrome — nothing draws the band itself. Matches NAME_LABEL_HEIGHT's 40 so
 * label headroom keeps one rhythm across the player area. Shared for the same
 * reason as LIBRARY_PILE_INSET: the server's geometry (cardLayout.ts,
 * tableFurniture.ts) and the client's sleeve pile (MtgZoneShapeUtil) must
 * agree on where content starts.
 */
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
};
