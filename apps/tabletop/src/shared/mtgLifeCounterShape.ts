import { RecordProps, TLShape } from "@tldraw/tlschema";
import { T } from "@tldraw/validate";

/**
 * `mtg-life-counter` (table-layout ticket 20): locked furniture on the name
 * row showing a player's life total, with +/- buttons and a directly
 * typeable number field. Everyone can change everyone's counter — no
 * ownership enforcement (fleet principle: players own the game experience).
 * Life-change events are Map 5's, parked at
 * .scratch/tabletop-replaces-mural/parked/life-change-events.md — this shape
 * carries only the current value, synced as an ordinary shape prop.
 *
 * Ticket 21 reuses this same shape for commander-damage counters: `label`
 * and `sleeveColor` identify whose commander the counter tracks (an opposing
 * seat's name + sleeve). Both null for an ordinary life counter, which has
 * no opponent identity to show.
 */
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
