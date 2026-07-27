/**
 * Arrival layout — regions, v0-minimal. The tabletop stays meaning-free: the
 * Shuffler picks the zoneHint; these are just coordinates.
 *
 * Geography:
 * - a fixed STACK area (top left) where non-land plays arrive
 * - a battlefield row per player, keyed by seatId, allocated in first-play
 *   order; at the end of each row a Graveyard spot and a smaller Exile spot.
 */

// Card render size on the canvas (Scryfall "normal" is 488x680; ~0.35 scale)
export const CARD_W = 170;
export const CARD_H = 238;

export const STACK_AREA = { x: 80, y: 80, label: "The Stack" };

const ROW_X = 80;
const ROW_START_Y = 480;
const ROW_HEIGHT = CARD_H + 90;
const CARD_SPACING = CARD_W + 20;

/** Where a player's graveyard spot sits (end of the battlefield row). */
export const GRAVEYARD_X = ROW_X + 7 * CARD_SPACING;
/** The smaller exile spot, past the graveyard. */
export const EXILE_X = GRAVEYARD_X + CARD_SPACING + 20;
export const EXILE_SCALE = 0.6;

export function rowOrigin(rowIndex: number): { x: number; y: number } {
  return { x: ROW_X, y: ROW_START_Y + rowIndex * ROW_HEIGHT };
}

/** Cards on the stack cascade so earlier arrivals stay visible. */
export function stackPosition(stackCount: number): { x: number; y: number } {
  return { x: STACK_AREA.x + stackCount * 36, y: STACK_AREA.y + stackCount * 14 };
}

export function battlefieldPosition(rowIndex: number, cardCount: number): { x: number; y: number } {
  const origin = rowOrigin(rowIndex);
  return { x: origin.x + cardCount * CARD_SPACING, y: origin.y };
}

/** Graveyard cards pile with a small offset so the count is visible. */
export function graveyardPosition(rowIndex: number, graveyardCount: number): { x: number; y: number } {
  const origin = rowOrigin(rowIndex);
  return { x: GRAVEYARD_X + graveyardCount * 6, y: origin.y + graveyardCount * 6 };
}
