/**
 * Player-area layout (JES-140, apps/tabletop/DESIGN.md) — the table as a
 * table: a playmat (battlefield), library, graveyard, exile, and name label
 * per seat, in a row left to right in join order; a shared Stack strip above,
 * widening as each seat joins.
 *
 * Real proportions: a standard 24"x14" playmat at 68 canvas units/inch (a
 * card is 170x238 — Scryfall "normal" 488x680 at ~0.35 scale — i.e. 2.5"x3.5").
 * The tabletop stays meaning-free: the Shuffler picks the zoneHint; these are
 * just coordinates.
 */

export const CARD_W = 170;
export const CARD_H = 238;

/** Reused for: playmat↔column gap, every gap between zone boxes, inter-area gap. */
export const GAP = 20;

export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

const MARGIN_X = 80;
const STACK_Y = 80;
export const STACK_HEIGHT = 350;
const NAME_LABEL_HEIGHT = 40;

/** Playmat: 9.6 cards wide x 4 cards tall. */
export const PLAYMAT_W = Math.round(9.6 * CARD_W); // 1632
export const PLAYMAT_H = 4 * CARD_H; // 952

export const LIBRARY_W = CARD_W;
export const LIBRARY_H = CARD_H;

/** Sized for two cards side by side — some commanders have partner. */
export const COMMAND_ZONE_W = 2 * CARD_W + GAP; // 360
export const COMMAND_ZONE_H = CARD_H;

/** The library/command-zone/graveyard/exile column beside the playmat. */
export const COLUMN_W = LIBRARY_W + GAP + COMMAND_ZONE_W; // 550

export const PLAYER_AREA_W = PLAYMAT_W + GAP + COLUMN_W; // 2202

/**
 * The space under the library row, down to the playmat's bottom edge (694),
 * split two-thirds graveyard / one-third exile with a gap between — gaps keep
 * every zone's bounding box strictly disjoint, since zone detection resolves
 * an overlap by draw order, which is meaningless as a semantic tiebreak.
 */
const BELOW_LIBRARY_H = PLAYMAT_H - LIBRARY_H - GAP; // 694
export const GRAVEYARD_W = COLUMN_W;
export const GRAVEYARD_H = Math.round(((BELOW_LIBRARY_H - GAP) * 2) / 3); // 449
export const EXILE_W = COLUMN_W;
export const EXILE_H = BELOW_LIBRARY_H - GAP - GRAVEYARD_H; // 225

const PLAYMAT_Y = STACK_Y + STACK_HEIGHT + GAP + NAME_LABEL_HEIGHT + GAP;

export function playerAreaX(seatIndex: number): number {
  return MARGIN_X + seatIndex * (PLAYER_AREA_W + GAP);
}

export function nameLabelPosition(seatIndex: number): { x: number; y: number } {
  return { x: playerAreaX(seatIndex), y: PLAYMAT_Y - GAP - NAME_LABEL_HEIGHT };
}

export function playmatBounds(seatIndex: number): Bounds {
  return { x: playerAreaX(seatIndex), y: PLAYMAT_Y, w: PLAYMAT_W, h: PLAYMAT_H };
}

function columnX(seatIndex: number): number {
  return playerAreaX(seatIndex) + PLAYMAT_W + GAP;
}

/** Top-left of the column, beside the playmat. */
export function libraryBounds(seatIndex: number): Bounds {
  return { x: columnX(seatIndex), y: PLAYMAT_Y, w: LIBRARY_W, h: LIBRARY_H };
}

/** Top-right of the column, beside the library; room for two commanders. */
export function commandZoneBounds(seatIndex: number): Bounds {
  return { x: columnX(seatIndex) + LIBRARY_W + GAP, y: PLAYMAT_Y, w: COMMAND_ZONE_W, h: COMMAND_ZONE_H };
}

/** Below the library, the top two-thirds of the space above the playmat's bottom edge. */
export function graveyardBounds(seatIndex: number): Bounds {
  return { x: columnX(seatIndex), y: PLAYMAT_Y + LIBRARY_H + GAP, w: GRAVEYARD_W, h: GRAVEYARD_H };
}

/** The bottom third of that same space, below the graveyard, flush with the playmat's bottom edge. */
export function exileBounds(seatIndex: number): Bounds {
  const graveyard = graveyardBounds(seatIndex);
  return { x: graveyard.x, y: graveyard.y + graveyard.h + GAP, w: EXILE_W, h: EXILE_H };
}

/** The shared Stack strip, spanning every player area joined so far. */
export function stackStripBounds(seatCount: number): Bounds {
  const w = seatCount > 0 ? seatCount * PLAYER_AREA_W + (seatCount - 1) * GAP : PLAYER_AREA_W;
  return { x: MARGIN_X, y: STACK_Y, w, h: STACK_HEIGHT };
}

/** Cards on the stack cascade so earlier arrivals stay visible, centered over the owning seat's playmat. */
export function stackCardPosition(seatIndex: number, stackCount: number): { x: number; y: number } {
  const mat = playmatBounds(seatIndex);
  return { x: mat.x + mat.w / 2 - CARD_W / 2 + stackCount * 36, y: STACK_Y + GAP + stackCount * 14 };
}

const LAND_COLS = Math.floor(PLAYMAT_W / CARD_W); // 9
/** Small gap so adjacent land cards don't touch; smaller than GAP since lands pack densely. */
const LAND_GAP = 6;

/**
 * Lands fill the playmat's bottom half, left to right, wrapping to a new row
 * below. Deferred (JES-140 follow-up buoy): the playmat itself never grows
 * taller here, so enough lands overflow past the mat's visual bottom edge.
 */
export function landPosition(seatIndex: number, landCount: number): { x: number; y: number } {
  const mat = playmatBounds(seatIndex);
  const col = landCount % LAND_COLS;
  const row = Math.floor(landCount / LAND_COLS);
  return { x: mat.x + col * (CARD_W + LAND_GAP), y: mat.y + mat.h / 2 + row * (CARD_H + LAND_GAP) };
}

/** Graveyard cards pile with a small offset so the count is visible. */
export function graveyardCardPosition(seatIndex: number, graveyardCount: number): { x: number; y: number } {
  const box = graveyardBounds(seatIndex);
  return { x: box.x + 10 + graveyardCount * 6, y: box.y + 10 + graveyardCount * 6 };
}
