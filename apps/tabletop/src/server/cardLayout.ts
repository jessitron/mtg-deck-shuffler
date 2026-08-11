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

const NAME_LABEL_HEIGHT = 40;

/** Playmat: 9.6 cards wide x 4 cards tall. */
export const PLAYMAT_W = Math.round(9.6 * CARD_W); // 1632
export const PLAYMAT_H = 4 * CARD_H; // 952

/**
 * Card-holding zones are a card plus ZONE_LABEL_BAND of headroom, so the
 * zone's label stays readable with a card in it. 238 + 40 = 278 — a
 * coincidence with the Shuffler's CSS card height (200x278), not a reference
 * to it; this ship's card unit is 170x238.
 */
export const LIBRARY_W = CARD_W;
export const LIBRARY_H = CARD_H + ZONE_LABEL_BAND;

/** Sized for two cards side by side — some commanders have partner. */
export const COMMAND_ZONE_W = 2 * CARD_W + GAP; // 360
/**
 * Must stay equal to LIBRARY_H: the graveyard spans the column's full width
 * at `column.y + LIBRARY_H + GAP`, so its GAP from the command zone's bottom
 * edge exists only while the two top boxes match heights (the disjointness
 * test catches a drift loudly).
 */
export const COMMAND_ZONE_H = LIBRARY_H;

/** The library/command-zone/graveyard/exile column beside the playmat. */
export const COLUMN_W = LIBRARY_W + GAP + COMMAND_ZONE_W; // 550

export const PLAYER_AREA_W = PLAYMAT_W + GAP + COLUMN_W; // 2202

/**
 * The space under the library row, down to the playmat's bottom edge (654):
 * exile gets exactly a card plus its label band, and the graveyard fills the
 * rest (still the biggest box — DESIGN.md's "exile is smaller" ordering
 * holds). Gaps keep every zone's bounding box strictly disjoint, since zone
 * detection resolves an overlap by draw order, which is meaningless as a
 * semantic tiebreak.
 */
const BELOW_LIBRARY_H = PLAYMAT_H - LIBRARY_H - GAP; // 654
export const EXILE_W = COLUMN_W;
export const EXILE_H = CARD_H + ZONE_LABEL_BAND; // 278
export const GRAVEYARD_W = COLUMN_W;
export const GRAVEYARD_H = BELOW_LIBRARY_H - GAP - EXILE_H; // 356

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

/** Life counter: bigger than the name-row band it sits on, right-aligned to the playmat (ticket 20). */
export const LIFE_COUNTER_W = 130;
export const LIFE_COUNTER_H = 48;

/**
 * Right-aligned to the playmat's own right edge (not the wider player area,
 * which also spans the library/command/graveyard/exile column) — the life
 * counter sits directly above the mat it tracks. Vertically centered on the
 * name label's band, since the counter is taller than that band.
 */
export function lifeCounterPosition(seatIndex: number): { x: number; y: number } {
  const origin = playerAreaOrigin(seatIndex);
  const namePos = nameLabelPosition(seatIndex);
  return {
    x: origin.x + PLAYMAT_W - LIFE_COUNTER_W,
    y: namePos.y - (LIFE_COUNTER_H - NAME_LABEL_HEIGHT) / 2,
  };
}

/** Commander-damage counter (ticket 21): smaller than the life counter, one per opposing commander. */
export const COMMANDER_DAMAGE_COUNTER_W = 90;
export const COMMANDER_DAMAGE_COUNTER_H = 40;

/**
 * Right-justified in the gap between the name and the life counter, growing
 * leftward as more opposing commanders arrive. `indexFromRight` 0 sits
 * nearest the life counter.
 */
export function commanderDamageCounterPosition(seatIndex: number, indexFromRight: number): { x: number; y: number } {
  const life = lifeCounterPosition(seatIndex);
  const namePos = nameLabelPosition(seatIndex);
  const x = life.x - GAP - (indexFromRight + 1) * COMMANDER_DAMAGE_COUNTER_W - indexFromRight * GAP;
  return {
    x,
    y: namePos.y - (COMMANDER_DAMAGE_COUNTER_H - NAME_LABEL_HEIGHT) / 2,
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

/**
 * A stack card lands on the Stack's side facing its player's mat — S bottom,
 * N top, E right, W left — centered on that side, so everyone can see at a
 * glance who played it. A seat's cascade walks along its side and inward,
 * keeping earlier arrivals visible.
 */
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

/**
 * Where a commander sits in its owner's Command Zone (ticket 18): below the
 * zone's label band, centered if it's the only commander, side by side (with
 * a GAP between) if there are two.
 */
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

/**
 * The disjointness invariant, runnable outside the test suite: zone detection
 * (topmostZoneAt, owners/tabletop-shape-mechanics) resolves an AABB overlap by
 * z-order, which is meaningless as a semantic tiebreak, so every zone must
 * keep at least `minGap` of empty space from every other. Throws naming the
 * two conflicting zones and the actual gap, so a constant edit that breaks
 * this fails at the point the layout is computed, not three files away in a
 * test run.
 */
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

/**
 * Graveyard cards pile with a small diagonal offset so the count is visible,
 * starting below the label band. Zone detection is center-based (a card
 * "is in the graveyard" only while its center sits inside `graveyardBounds`
 * — owners/tabletop-shape-mechanics), so the cascade can't just march on
 * forever: past the last step that still keeps the center inside the box,
 * it wraps back to step 0, restacking visually over the earliest cards
 * instead of walking out into the inter-zone gap or exile (JES bug,
 * 2026-08-10 — the un-wrapped cascade broke past ~32 cards).
 */
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

/**
 * Runs at import time (server boot, every test run) rather than waiting for
 * someone to run test/cardLayout.test.ts: if a constant edit ever breaks the
 * disjointness invariant — including the STACK_SIZE-vs-PLAYMAT_H "stay inside
 * the square" case noted on STACK_SIZE above — this throws immediately, at
 * the point the layout module is loaded, naming the two zones that collide.
 */
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
