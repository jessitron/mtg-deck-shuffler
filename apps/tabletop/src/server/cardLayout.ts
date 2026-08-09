/**
 * Player-area layout (JES-140, apps/tabletop/DESIGN.md) — the table as a
 * table: a playmat (battlefield), library, command zone, graveyard, exile,
 * and name label per seat. Seats take compass slots (S, N, E, W by join
 * order) around a fixed-size Stack square centered on the board origin —
 * "the square", .scratch/tabletop-table-layout/issues/14. Every area stays
 * upright and unrotated; E/W look sideways and that's accepted (DESIGN.md).
 *
 * Real proportions: a standard 24"x14" playmat at 68 canvas units/inch (a
 * card is 170x238 — Scryfall "normal" 488x680 at ~0.35 scale — i.e. 2.5"x3.5").
 * The tabletop stays meaning-free: the Shuffler picks the zoneHint; these are
 * just coordinates.
 */

export const CARD_W = 170;
export const CARD_H = 238;

/** Reused for: playmat↔column gap, every gap between zone boxes, minimum clearance between areas. */
export const GAP = 20;

export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

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

/**
 * The Stack: a fixed-size square centered on the origin, same footprint at
 * every player count. Must exceed PLAYMAT_H so the E/W areas — vertically
 * centered on the origin — stay inside the Stack's vertical band and never
 * overlap the N/S areas (the zone-AABB disjointness constraint; zone
 * detection is first-match by z-order, not closest-match).
 */
export const STACK_SIZE = 1000;

export function stackBounds(): Bounds {
  return { x: -STACK_SIZE / 2, y: -STACK_SIZE / 2, w: STACK_SIZE, h: STACK_SIZE };
}

/**
 * Clearance between the Stack's edge and each player area, sized so the S
 * seat's name label (drawn above its playmat) fits between the Stack and the
 * mat. Used on all four sides for symmetry.
 */
const SLOT_MARGIN = GAP + NAME_LABEL_HEIGHT + GAP; // 100

/** Compass slots by join order: 1 player → S; 2 → S, N; 3 → S, N, E; 4 → S, N, E, W. */
const SLOT_ORDER = ["S", "N", "E", "W"] as const;

/** The table has exactly as many places as compass slots — four, Commander's max. */
export const MAX_SEATS = SLOT_ORDER.length;

/**
 * Top-left of a seat's player area (the playmat + column rectangle).
 * N/S center horizontally on the Stack; E/W center vertically. Throws past
 * MAX_SEATS: a fifth area would land exactly on an existing one, silently
 * breaking the zone-AABB disjointness that zone detection relies on —
 * callers must refuse the seat instead (seatJoined.ts does).
 */
export function playerAreaOrigin(seatIndex: number): { x: number; y: number } {
  const slot = SLOT_ORDER[seatIndex];
  if (!slot) throw new Error(`no compass slot for seat ${seatIndex}: the table seats ${MAX_SEATS}`);
  const slotEdge = STACK_SIZE / 2 + SLOT_MARGIN; // distance from the origin to each slot's near edge
  switch (slot) {
    case "S":
      return { x: -PLAYER_AREA_W / 2, y: slotEdge };
    case "N":
      return { x: -PLAYER_AREA_W / 2, y: -(slotEdge + PLAYMAT_H) };
    case "E":
      return { x: slotEdge, y: -PLAYMAT_H / 2 };
    case "W":
      return { x: -(slotEdge + PLAYER_AREA_W), y: -PLAYMAT_H / 2 };
  }
}

export function nameLabelPosition(seatIndex: number): { x: number; y: number } {
  const origin = playerAreaOrigin(seatIndex);
  return { x: origin.x, y: origin.y - GAP - NAME_LABEL_HEIGHT };
}

export function playmatBounds(seatIndex: number): Bounds {
  const origin = playerAreaOrigin(seatIndex);
  return { x: origin.x, y: origin.y, w: PLAYMAT_W, h: PLAYMAT_H };
}

function columnOrigin(seatIndex: number): { x: number; y: number } {
  const origin = playerAreaOrigin(seatIndex);
  return { x: origin.x + PLAYMAT_W + GAP, y: origin.y };
}

/** Top-left of the column, beside the playmat. */
export function libraryBounds(seatIndex: number): Bounds {
  const column = columnOrigin(seatIndex);
  return { x: column.x, y: column.y, w: LIBRARY_W, h: LIBRARY_H };
}

/** Top-right of the column, beside the library; room for two commanders. */
export function commandZoneBounds(seatIndex: number): Bounds {
  const column = columnOrigin(seatIndex);
  return { x: column.x + LIBRARY_W + GAP, y: column.y, w: COMMAND_ZONE_W, h: COMMAND_ZONE_H };
}

/** Below the library, the top two-thirds of the space above the playmat's bottom edge. */
export function graveyardBounds(seatIndex: number): Bounds {
  const column = columnOrigin(seatIndex);
  return { x: column.x, y: column.y + LIBRARY_H + GAP, w: GRAVEYARD_W, h: GRAVEYARD_H };
}

/** The bottom third of that same space, below the graveyard, flush with the playmat's bottom edge. */
export function exileBounds(seatIndex: number): Bounds {
  const graveyard = graveyardBounds(seatIndex);
  return { x: graveyard.x, y: graveyard.y + graveyard.h + GAP, w: EXILE_W, h: EXILE_H };
}

/** Cards on the stack cascade from the square's top-left so earlier arrivals stay visible. */
export function stackCardPosition(stackCount: number): { x: number; y: number } {
  const stack = stackBounds();
  return { x: stack.x + GAP + stackCount * 36, y: stack.y + GAP + stackCount * 14 };
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
