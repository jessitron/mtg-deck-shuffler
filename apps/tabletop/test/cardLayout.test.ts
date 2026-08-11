import { describe, it, expect } from "vitest";
import {
  GAP,
  CARD_W,
  CARD_H,
  PLAYMAT_W,
  PLAYMAT_H,
  COLUMN_W,
  COMMAND_ZONE_W,
  GRAVEYARD_H,
  EXILE_H,
  PLAYER_AREA_W,
  STACK_SIZE,
  type Bounds,
  playmatBounds,
  libraryBounds,
  commandZoneBounds,
  exileBounds,
  graveyardBounds,
  stackBounds,
  stackCardPosition,
  landPosition,
  playerAreaOrigin,
  LIBRARY_H,
  COMMAND_ZONE_H,
  graveyardCardPosition,
  commandZoneCardPosition,
  lifeCounterPosition,
  nameLabelPosition,
  LIFE_COUNTER_W,
  LIFE_COUNTER_H,
} from "../src/server/cardLayout";
import { ZONE_LABEL_BAND } from "../src/shared/mtgZoneShape";

/** Smallest empty band between two AABBs on either axis; negative means overlap. */
function separation(a: Bounds, b: Bounds): number {
  const dx = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w));
  const dy = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h));
  return Math.max(dx, dy);
}

function seatZones(seatIndex: number): Record<string, Bounds> {
  return {
    playmat: playmatBounds(seatIndex),
    library: libraryBounds(seatIndex),
    command: commandZoneBounds(seatIndex),
    graveyard: graveyardBounds(seatIndex),
    exile: exileBounds(seatIndex),
  };
}

/**
 * JES-140 geometry — apps/tabletop/DESIGN.md's numbers, checked exactly so a
 * future tweak to CARD_W/CARD_H can't silently drift the playmat proportions.
 * Command Zone redraw: .scratch/tabletop-table-layout/issues/13.
 * The square (compass seats): .scratch/tabletop-table-layout/issues/14.
 */
describe("cardLayout — player area geometry", () => {
  it("derives the playmat at 9.6 x 4 cards (1632 x 952)", () => {
    expect(PLAYMAT_W).toBe(1632);
    expect(PLAYMAT_H).toBe(952);
  });

  it("derives the column as library + gap + two-card command zone (550)", () => {
    expect(COMMAND_ZONE_W).toBe(360);
    expect(COLUMN_W).toBe(550);
  });

  it("gives exile a card plus label band; the graveyard fills the rest and stays the bigger box", () => {
    expect(EXILE_H).toBe(278);
    expect(GRAVEYARD_H).toBe(356);
    expect(GRAVEYARD_H).toBeGreaterThan(EXILE_H);
  });

  // The label band (zone-label-band, 2026-08-09): every card-holding zone is
  // tall enough for a card AND its label — the bug this fixed was zone titles
  // covered by the card/pile (library, command zone) or a zone shorter than a
  // card outright (exile, formerly 225 < 238).
  it("makes every card-holding zone at least a card plus the label band tall", () => {
    for (const h of [LIBRARY_H, COMMAND_ZONE_H, GRAVEYARD_H, EXILE_H]) {
      expect(h).toBeGreaterThanOrEqual(CARD_H + ZONE_LABEL_BAND);
    }
  });

  // graveyardBounds places the graveyard at column.y + LIBRARY_H + GAP under
  // the column's FULL width, so its gap from the command zone exists only
  // while the two top boxes match heights.
  it("keeps the library and command zone the same height", () => {
    expect(COMMAND_ZONE_H).toBe(LIBRARY_H);
  });

  it("starts the graveyard card pile below the label band", () => {
    const box = graveyardBounds(0);
    const first = graveyardCardPosition(0, 0);
    expect(first.y).toBeGreaterThanOrEqual(box.y + ZONE_LABEL_BAND);
  });

  // Zone detection is center-based (owners/tabletop-shape-mechanics): once a
  // cascading card's center leaves the graveyard's AABB, topmostZoneAt sees
  // "undefined zone" or a neighboring zone (e.g. exile) instead. The +6/card
  // diagonal cascade used to march a card's center out of the box past
  // graveyardCount ~31 (JES bug, 2026-08-10) — this pins that it can't
  // recur for arbitrarily large piles by wrapping the cascade back to the
  // start (stacking back over earlier cards) once it would exit the box.
  it("keeps every card's center inside the graveyard AABB, no matter how large the pile", () => {
    const box = graveyardBounds(0);
    for (const count of [0, 1, 30, 31, 32, 33, 50, 100, 500]) {
      const pos = graveyardCardPosition(0, count);
      const centerX = pos.x + CARD_W / 2;
      const centerY = pos.y + CARD_H / 2;
      expect(centerX, `count ${count} center.x`).toBeGreaterThanOrEqual(box.x);
      expect(centerX, `count ${count} center.x`).toBeLessThan(box.x + box.w);
      expect(centerY, `count ${count} center.y`).toBeGreaterThanOrEqual(box.y);
      expect(centerY, `count ${count} center.y`).toBeLessThan(box.y + box.h);
    }
  });

  it("wraps the graveyard cascade back to the start, restacking over earlier cards", () => {
    const first = graveyardCardPosition(0, 0);
    const wrapped = graveyardCardPosition(0, 32); // one past the ~31-card threshold
    expect(wrapped).toEqual(first);
  });

  it("places the library at the top-left of the column, beside the playmat", () => {
    const mat = playmatBounds(0);
    const library = libraryBounds(0);
    expect(library.x).toBe(mat.x + mat.w + GAP);
    expect(library.y).toBe(mat.y);
  });

  it("places the command zone beside the library, sized for two cards", () => {
    const library = libraryBounds(0);
    const command = commandZoneBounds(0);
    expect(command.x).toBe(library.x + library.w + GAP);
    expect(command.y).toBe(library.y);
    expect(command.w).toBe(360);
    expect(command.h).toBe(library.h);
  });

  it("places the graveyard below the library, spanning the column's full width", () => {
    const library = libraryBounds(0);
    const graveyard = graveyardBounds(0);
    expect(graveyard.y).toBe(library.y + library.h + GAP);
    expect(graveyard.w).toBe(COLUMN_W);
  });

  it("places the exile box below the graveyard, flush with the playmat's bottom edge", () => {
    const mat = playmatBounds(0);
    const graveyard = graveyardBounds(0);
    const exile = exileBounds(0);
    expect(exile.x).toBe(graveyard.x);
    expect(exile.y).toBe(graveyard.y + graveyard.h + GAP);
    expect(exile.w).toBe(COLUMN_W);
    expect(exile.y + exile.h).toBe(mat.y + mat.h);
  });

  // Ticket 18: commanders land below the zone's label band, side by side if
  // two, horizontally centered if one.
  it("centers a single commander in the command zone, below the label band", () => {
    const box = commandZoneBounds(0);
    const pos = commandZoneCardPosition(0, 0, 1);
    expect(pos.x).toBe(box.x + (COMMAND_ZONE_W - CARD_W) / 2);
    expect(pos.y).toBe(box.y + ZONE_LABEL_BAND);
  });

  it("places two commanders side by side, below the label band", () => {
    const box = commandZoneBounds(0);
    const first = commandZoneCardPosition(0, 0, 2);
    const second = commandZoneCardPosition(0, 1, 2);
    expect(first.x).toBe(box.x);
    expect(first.y).toBe(box.y + ZONE_LABEL_BAND);
    expect(second.x).toBe(box.x + CARD_W + GAP);
    expect(second.y).toBe(first.y);
  });

  it("keeps both commander slots within the command zone's width", () => {
    const box = commandZoneBounds(0);
    const second = commandZoneCardPosition(0, 1, 2);
    expect(second.x + CARD_W).toBeLessThanOrEqual(box.x + box.w);
  });
});

/** Ticket 20: the life counter sits far right on the name row, bigger than that row. */
describe("cardLayout — life counter position", () => {
  it("right-aligns to the player area's right edge, for every seat", () => {
    for (const seatIndex of [0, 1, 2, 3]) {
      const origin = playerAreaOrigin(seatIndex);
      const pos = lifeCounterPosition(seatIndex);
      expect(pos.x).toBe(origin.x + PLAYER_AREA_W - LIFE_COUNTER_W);
    }
  });

  it("vertically centers on the name label's band", () => {
    const namePos = nameLabelPosition(0);
    const pos = lifeCounterPosition(0);
    const NAME_LABEL_HEIGHT = 40;
    expect(pos.y).toBe(namePos.y - (LIFE_COUNTER_H - NAME_LABEL_HEIGHT) / 2);
  });
});

describe("cardLayout — the square (compass seats around a centered Stack)", () => {
  const stack = stackBounds();

  it("fixes the Stack as a square centered on the origin, independent of seat count", () => {
    expect(stack.w).toBe(STACK_SIZE);
    expect(stack.h).toBe(STACK_SIZE);
    expect(stack.x + stack.w / 2).toBe(0);
    expect(stack.y + stack.h / 2).toBe(0);
  });

  it("seats seat 0 South: horizontally centered, below the Stack", () => {
    const origin = playerAreaOrigin(0);
    expect(origin.x + PLAYER_AREA_W / 2).toBe(0);
    expect(origin.y).toBeGreaterThan(stack.y + stack.h);
  });

  it("seats seat 1 North: horizontally centered, above the Stack", () => {
    const origin = playerAreaOrigin(1);
    expect(origin.x + PLAYER_AREA_W / 2).toBe(0);
    expect(origin.y + PLAYMAT_H).toBeLessThan(stack.y);
  });

  it("seats seat 2 East: vertically centered, right of the Stack", () => {
    const origin = playerAreaOrigin(2);
    expect(origin.y + PLAYMAT_H / 2).toBe(0);
    expect(origin.x).toBeGreaterThan(stack.x + stack.w);
  });

  it("seats seat 3 West: vertically centered, left of the Stack", () => {
    const origin = playerAreaOrigin(3);
    expect(origin.y + PLAYMAT_H / 2).toBe(0);
    expect(origin.x + PLAYER_AREA_W).toBeLessThan(stack.x);
  });

  // Zone detection (topmostZoneAt) is first-match-by-z-order, not
  // closest-match, and furniture z-order is chronological draw order —
  // meaningless as a semantic tiebreak. So every zone AABB keeps at least a
  // GAP-wide empty band from every other, across all four seats AND the
  // Stack (owners/tabletop-shape-mechanics, watch point 8).
  it("keeps every zone AABB at least a GAP apart, across all four seats and the Stack", () => {
    const zones: Array<readonly [string, Bounds]> = [["stack", stack]];
    for (let seat = 0; seat < 4; seat++) {
      zones.push(...Object.entries(seatZones(seat)).map(([name, b]) => [`seat${seat}.${name}`, b] as const));
    }
    for (let i = 0; i < zones.length; i++) {
      for (let j = i + 1; j < zones.length; j++) {
        expect(
          separation(zones[i][1], zones[j][1]),
          `${zones[i][0]} is within a GAP of ${zones[j][0]}`
        ).toBeGreaterThanOrEqual(GAP);
      }
    }
  });

  // A stack card lands on the Stack's side facing its player's mat, centered
  // on that side, so everyone can see at a glance who played it.
  it("puts the S seat's stack card centered on the Stack's bottom edge", () => {
    const card = stackCardPosition(0, 0);
    expect(card.x + CARD_W / 2).toBe(0); // horizontally centered
    expect(card.y + CARD_H).toBe(stack.y + stack.h - GAP); // flush with the bottom edge, inside
  });

  it("puts the N seat's stack card centered on the Stack's top edge", () => {
    const card = stackCardPosition(1, 0);
    expect(card.x + CARD_W / 2).toBe(0);
    expect(card.y).toBe(stack.y + GAP);
  });

  it("puts the E seat's stack card centered on the Stack's right edge", () => {
    const card = stackCardPosition(2, 0);
    expect(card.y + CARD_H / 2).toBe(0); // vertically centered
    expect(card.x + CARD_W).toBe(stack.x + stack.w - GAP);
  });

  it("puts the W seat's stack card centered on the Stack's left edge", () => {
    const card = stackCardPosition(3, 0);
    expect(card.y + CARD_H / 2).toBe(0);
    expect(card.x).toBe(stack.x + GAP);
  });

  it("cascades a seat's stack cards away from its edge, keeping earlier arrivals visible", () => {
    // Per seat: which coordinate moves inward (off the seat's edge) as the cascade grows.
    const inward: Array<(first: { x: number; y: number }, later: { x: number; y: number }) => boolean> = [
      (first, later) => later.y < first.y, // S: up, off the bottom edge
      (first, later) => later.y > first.y, // N: down, off the top edge
      (first, later) => later.x < first.x, // E: left, off the right edge
      (first, later) => later.x > first.x, // W: right, off the left edge
    ];
    for (let seat = 0; seat < 4; seat++) {
      const first = stackCardPosition(seat, 0);
      const later = stackCardPosition(seat, 3);
      expect(first).not.toEqual(later); // earlier arrivals stay visible
      expect(inward[seat](first, later), `seat ${seat} cascade hugs its edge`).toBe(true);
      // And stays inside the square.
      expect(later.x).toBeGreaterThanOrEqual(stack.x);
      expect(later.y).toBeGreaterThanOrEqual(stack.y);
      expect(later.x + CARD_W).toBeLessThanOrEqual(stack.x + stack.w);
      expect(later.y + CARD_H).toBeLessThanOrEqual(stack.y + stack.h);
    }
  });

  it("fills lands left to right on the playmat's bottom half, wrapping to a new row", () => {
    const mat = playmatBounds(0);
    const first = landPosition(0, 0);
    const second = landPosition(0, 1);
    expect(first.y).toBeGreaterThanOrEqual(mat.y + mat.h / 2); // bottom half
    expect(second.x).toBeGreaterThan(first.x); // left to right
    expect(second.y).toBe(first.y); // same row

    const wrapped = landPosition(0, 9); // past 9 columns
    expect(wrapped.x).toBe(first.x);
    expect(wrapped.y).toBeGreaterThan(first.y); // wrapped to the next row
  });
});
