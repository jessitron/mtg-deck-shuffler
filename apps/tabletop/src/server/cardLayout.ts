
import { ZONE_LABEL_BAND } from "../shared/mtgZoneShape.js";

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

export const NAME_LABEL_HEIGHT = 40;

/** Playmat: 9.6 cards wide x 4 cards tall. */
export const PLAYMAT_W = Math.round(9.6 * CARD_W); // 1632
export const PLAYMAT_H = 4 * CARD_H; // 952

export const LIBRARY_W = CARD_W;
export const LIBRARY_H = CARD_H + ZONE_LABEL_BAND;

/** Sized for two cards side by side — some commanders have partner. */
export const COMMAND_ZONE_W = 2 * CARD_W + GAP; // 360
export const COMMAND_ZONE_H = LIBRARY_H;

/** The library/command-zone/graveyard/exile column beside the playmat. */
export const COLUMN_W = LIBRARY_W + GAP + COMMAND_ZONE_W; // 550

export const PLAYER_AREA_W = PLAYMAT_W + GAP + COLUMN_W; // 2202

const BELOW_LIBRARY_H = PLAYMAT_H - LIBRARY_H - GAP; // 654
export const EXILE_W = COLUMN_W;
export const EXILE_H = CARD_H + ZONE_LABEL_BAND; // 278
export const GRAVEYARD_W = COLUMN_W;
export const GRAVEYARD_H = BELOW_LIBRARY_H - GAP - EXILE_H; // 356

export const STACK_SIZE = 1000;

export function stackBounds(): Bounds {
  return { x: -STACK_SIZE / 2, y: -STACK_SIZE / 2, w: STACK_SIZE, h: STACK_SIZE };
}

const SLOT_MARGIN = GAP + NAME_LABEL_HEIGHT + GAP; // 100

/** Compass slots by join order: 1 player → S; 2 → S, N; 3 → S, N, E; 4 → S, N, E, W. */
const SLOT_ORDER = ["S", "N", "E", "W"] as const;

/** The table has exactly as many places as compass slots — four, Commander's max. */
export const MAX_SEATS = SLOT_ORDER.length;

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

/**
 * Baseline of the name+deck-title text, in page units below the text shape's top
 * (= nameLabelPosition().y). Measured from the live tldraw render (serif, size "m",
 * scale 2): glyph box 0→64, baseline at 50, descenders to 64. Counters rest their
 * bottom edge on this baseline. tldraw owns the text metrics — canvas text can't use
 * the fleet fonts — so this is library-dependent: a font/size/scale change remeasures it.
 */
export const NAME_TEXT_BASELINE = 50;

/** Life counter: bigger than the name-row band, right-aligned to the playmat, bottom on the name baseline (ticket 20). */
export const LIFE_COUNTER_W = 130;
export const LIFE_COUNTER_H = 48;

export function lifeCounterPosition(seatIndex: number): { x: number; y: number } {
  const origin = playerAreaOrigin(seatIndex);
  const namePos = nameLabelPosition(seatIndex);
  return {
    x: origin.x + PLAYMAT_W - LIFE_COUNTER_W,
    y: namePos.y + NAME_TEXT_BASELINE - LIFE_COUNTER_H,
  };
}

/** Commander-damage counter (ticket 21): smaller than the life counter, one per opposing commander. */
export const COMMANDER_DAMAGE_COUNTER_W = 90;
export const COMMANDER_DAMAGE_COUNTER_H = 40;

export function commanderDamageCounterPosition(seatIndex: number, indexFromRight: number): { x: number; y: number } {
  const life = lifeCounterPosition(seatIndex);
  const namePos = nameLabelPosition(seatIndex);
  const x = life.x - GAP - (indexFromRight + 1) * COMMANDER_DAMAGE_COUNTER_W - indexFromRight * GAP;
  return {
    x,
    y: namePos.y + NAME_TEXT_BASELINE - COMMANDER_DAMAGE_COUNTER_H,
  };
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

export function stackCardPosition(seatIndex: number, stackCount: number): { x: number; y: number } {
  const stack = stackBounds();
  const along = stackCount * 36;
  const inset = GAP + stackCount * 14;
  switch (SLOT_ORDER[seatIndex]) {
    case "S":
      return { x: -CARD_W / 2 + along, y: stack.y + stack.h - inset - CARD_H };
    case "N":
      return { x: -CARD_W / 2 + along, y: stack.y + inset };
    case "E":
      return { x: stack.x + stack.w - inset - CARD_W, y: -CARD_H / 2 + along };
    case "W":
      return { x: stack.x + inset, y: -CARD_H / 2 + along };
    default:
      throw new Error(`no compass slot for seat ${seatIndex}: the table seats ${MAX_SEATS}`);
  }
}

const LAND_COLS = Math.floor(PLAYMAT_W / CARD_W); // 9
/** Small gap so adjacent land cards don't touch; smaller than GAP since lands pack densely. */
const LAND_GAP = 6;
/**
 * Inset from the playmat's left edge and the bottom-half boundary, so the
 * first land doesn't arrive flush against them. Matches GRAVEYARD_PILE_INSET's
 * value for the same reason: a card touching a zone's edge reads as clipped.
 */
const LAND_INSET = 10;

export function landPosition(seatIndex: number, landCount: number): { x: number; y: number } {
  const mat = playmatBounds(seatIndex);
  const col = landCount % LAND_COLS;
  const row = Math.floor(landCount / LAND_COLS);
  return {
    x: mat.x + LAND_INSET + col * (CARD_W + LAND_GAP),
    y: mat.y + mat.h / 2 + LAND_INSET + row * (CARD_H + LAND_GAP),
  };
}

export function commandZoneCardPosition(seatIndex: number, slot: number, count: 1 | 2): { x: number; y: number } {
  const box = commandZoneBounds(seatIndex);
  const y = box.y + ZONE_LABEL_BAND;
  if (count === 1) {
    return { x: box.x + (COMMAND_ZONE_W - CARD_W) / 2, y };
  }
  return { x: box.x + slot * (CARD_W + GAP), y };
}

/** Smallest empty band between two AABBs on either axis; negative means overlap. */
function separation(a: Bounds, b: Bounds): number {
  const dx = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w));
  const dy = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h));
  return Math.max(dx, dy);
}

export function checkZonesDisjoint(zones: Record<string, Bounds>, minGap: number): void {
  const entries = Object.entries(zones);
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const [nameA, boundsA] = entries[i];
      const [nameB, boundsB] = entries[j];
      const gap = separation(boundsA, boundsB);
      if (gap < minGap) {
        throw new Error(
          `cardLayout disjointness invariant violated: "${nameA}" and "${nameB}" are only ${gap} apart ` +
            `(need >= ${minGap}). Zone AABBs must stay disjoint or zone detection (first-match by z-order) breaks.`
        );
      }
    }
  }
}

/** Fixed inset and per-card step of the graveyard cascade — shared by the position and its wrap bound below. */
const GRAVEYARD_PILE_INSET = 10;
const GRAVEYARD_PILE_STEP = 6;

export function graveyardCardPosition(seatIndex: number, graveyardCount: number): { x: number; y: number } {
  const box = graveyardBounds(seatIndex);
  const maxStepsX = Math.floor((box.w - GRAVEYARD_PILE_INSET - CARD_W / 2) / GRAVEYARD_PILE_STEP);
  const maxStepsY = Math.floor(
    (box.h - ZONE_LABEL_BAND - GRAVEYARD_PILE_INSET - CARD_H / 2) / GRAVEYARD_PILE_STEP
  );
  const maxSteps = Math.min(maxStepsX, maxStepsY);
  const step = graveyardCount % (maxSteps + 1);
  return {
    x: box.x + GRAVEYARD_PILE_INSET + step * GRAVEYARD_PILE_STEP,
    y: box.y + ZONE_LABEL_BAND + GRAVEYARD_PILE_INSET + step * GRAVEYARD_PILE_STEP,
  };
}

function assertLayoutInvariants(): void {
  const zones: Record<string, Bounds> = { stack: stackBounds() };
  for (let seat = 0; seat < MAX_SEATS; seat++) {
    zones[`seat${seat}.playmat`] = playmatBounds(seat);
    zones[`seat${seat}.library`] = libraryBounds(seat);
    zones[`seat${seat}.command`] = commandZoneBounds(seat);
    zones[`seat${seat}.graveyard`] = graveyardBounds(seat);
    zones[`seat${seat}.exile`] = exileBounds(seat);
  }
  checkZonesDisjoint(zones, GAP);
}

assertLayoutInvariants();
