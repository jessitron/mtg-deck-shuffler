import { describe, it, expect } from "vitest";
import {
  PLAYMAT_W,
  PLAYMAT_H,
  COLUMN_W,
  COMMAND_ZONE_W,
  GRAVEYARD_H,
  EXILE_H,
  playmatBounds,
  libraryBounds,
  commandZoneBounds,
  exileBounds,
  graveyardBounds,
  stackStripBounds,
  landPosition,
  playerAreaX,
} from "../src/server/cardLayout";

type Bounds = { x: number; y: number; w: number; h: number };

function overlaps(a: Bounds, b: Bounds): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
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

  it("splits the space under the library two-thirds graveyard, one-third exile", () => {
    expect(GRAVEYARD_H).toBe(449);
    expect(EXILE_H).toBe(225);
  });

  it("places the library at the top-left of the column, beside the playmat", () => {
    const mat = playmatBounds(0);
    const library = libraryBounds(0);
    expect(library.x).toBe(mat.x + mat.w + 20);
    expect(library.y).toBe(mat.y);
  });

  it("places the command zone beside the library, sized for two cards", () => {
    const library = libraryBounds(0);
    const command = commandZoneBounds(0);
    expect(command.x).toBe(library.x + library.w + 20);
    expect(command.y).toBe(library.y);
    expect(command.w).toBe(360);
    expect(command.h).toBe(library.h);
  });

  it("places the graveyard below the library, spanning the column's full width", () => {
    const library = libraryBounds(0);
    const graveyard = graveyardBounds(0);
    expect(graveyard.y).toBe(library.y + library.h + 20);
    expect(graveyard.w).toBe(COLUMN_W);
  });

  it("places the exile box below the graveyard, flush with the playmat's bottom edge", () => {
    const mat = playmatBounds(0);
    const graveyard = graveyardBounds(0);
    const exile = exileBounds(0);
    expect(exile.x).toBe(graveyard.x);
    expect(exile.y).toBe(graveyard.y + graveyard.h + 20);
    expect(exile.w).toBe(COLUMN_W);
    expect(exile.y + exile.h).toBe(mat.y + mat.h);
  });

  // Zone detection resolves an overlapping point to the topmost zone by
  // z-order, and furniture z-order is chronological (draw order), not
  // semantic — so overlapping zones would resolve deterministically but
  // meaninglessly. Strict disjointness is the guarantee.
  it("keeps every zone bounding box disjoint, within and between player areas", () => {
    const zones = [
      ...Object.entries(seatZones(0)).map(([name, b]) => [`seat0.${name}`, b] as const),
      ...Object.entries(seatZones(1)).map(([name, b]) => [`seat1.${name}`, b] as const),
    ];
    for (let i = 0; i < zones.length; i++) {
      for (let j = i + 1; j < zones.length; j++) {
        expect(overlaps(zones[i][1], zones[j][1]), `${zones[i][0]} overlaps ${zones[j][0]}`).toBe(false);
      }
    }
  });

  it("places player areas in a row, left to right, in join order", () => {
    const first = playerAreaX(0);
    const second = playerAreaX(1);
    expect(second).toBeGreaterThan(first + PLAYMAT_W + COLUMN_W);
  });

  it("widens the Stack strip to span every player area joined so far", () => {
    const oneSeat = stackStripBounds(1);
    const twoSeats = stackStripBounds(2);
    const threeSeats = stackStripBounds(3);
    expect(twoSeats.w).toBeGreaterThan(oneSeat.w);
    expect(threeSeats.w).toBeGreaterThan(twoSeats.w);
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
