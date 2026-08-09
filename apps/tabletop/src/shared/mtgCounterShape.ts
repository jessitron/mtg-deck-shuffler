import { RecordProps, TLShape } from "@tldraw/tlschema";
import { T } from "@tldraw/validate";

/**
 * The `mtg-counter` custom shape (tabletop-physics ticket 18): the thing a
 * player drops onto a card — a +1/+1 counter, a charge counter, whatever the
 * text says. Free editable text, blank by default (not a numeric field); no
 * domain identity beyond its text. Attachment to a card is tldraw parenting
 * (the counter's `parentId`), never a prop on either shape.
 *
 * Note: table-layout ticket 12 used "mtg-counter" as the *working name* for
 * a different, not-yet-built shape (locked life/commander-damage furniture).
 * This shape claims the type string per the tabletop-physics spec; the life
 * counter needs its own name when it's built (see TODO.md).
 */
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
