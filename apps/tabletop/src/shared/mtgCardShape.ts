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
  face: "front" | "back";
  faceDown: boolean;
  tapped: boolean;
  /**
   * The owning seat's sleeve, baked in at mint time (table-layout ticket 17).
   * Legal to bake because sleeve color is a game constant — chosen before the
   * game, never changed mid-game. null ⇔ unsleeved (today's bare look).
   */
  sleeveColor: string | null;
  /**
   * The table's generic Magic card back, baked in at mint time from the
   * owning seat (tabletop-physics ticket 17) — same "game constant, never
   * changes mid-game" argument that made `sleeveColor` legal to bake here.
   * Used only when unsleeved and `faceDown`; a sleeved card conceals with its
   * sleeve rectangle instead, and `seat.joined` never carries both. null when
   * the seat had none (or predates this prop) — the render falls back to a
   * flat rectangle rather than leaking the face.
   */
  cardBackImageUrl: string | null;
  /**
   * The seatId of the player this card belongs to (table-layout ticket 18).
   * First-class, real domain state — but grants no capability: any player
   * can still move any card. It just makes "whose card is this" a fact the
   * shape carries, the same way face/faceDown are facts rather than gates.
   */
  owner: string;
  /** Whether this card is one of its owner's commanders (table-layout ticket 18). */
  isCommander: boolean;
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
  face: T.literalEnum("front", "back"),
  faceDown: T.boolean,
  tapped: T.boolean,
  sleeveColor: T.string.nullable(),
  cardBackImageUrl: T.string.nullable(),
  owner: T.string,
  isCommander: T.boolean,
};
