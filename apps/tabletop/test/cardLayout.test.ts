import { describe, it, expect } from "vitest";
import {
  PLAYMAT_W,
  PLAYMAT_H,
  COLUMN_W,
  GRAVEYARD_H,
  playmatBounds,
  libraryBounds,
  exileBounds,
  graveyardBounds,
  stackStripBounds,
  landPosition,
  playerAreaX,
} from "../src/server/cardLayout";

/**
 * JES-140 geometry — apps/tabletop/DESIGN.md's numbers, checked exactly so a
 * future tweak to CARD_W/CARD_H can't silently drift the playmat proportions.
 */
describe("cardLayout — player area geometry", () => {
  it("derives the playmat at 9.6 x 4 cards (1632 x 952)", () => {
    expect(PLAYMAT_W).toBe(1632);
    expect(PLAYMAT_H).toBe(952);
  });

  it("derives the column at 2.5 cards wide (425)", () => {
    expect(COLUMN_W).toBe(425);
  });

  it("derives the graveyard height as the remainder under the library (694)", () => {
    expect(GRAVEYARD_H).toBe(694);
  });

  it("places the library at the top-left of the column, beside the playmat", () => {
    const mat = playmatBounds(0);
    const library = libraryBounds(0);
    expect(library.x).toBe(mat.x + mat.w + 20);
    expect(library.y).toBe(mat.y);
  });

  it("places the exile box beside the library, at the top of the column", () => {
    const library = libraryBounds(0);
    const exile = exileBounds(0);
    expect(exile.x).toBe(library.x + library.w);
    expect(exile.y).toBe(library.y);
  });

  it("places the graveyard below the library, filling to the playmat's bottom edge", () => {
    const mat = playmatBounds(0);
    const graveyard = graveyardBounds(0);
    expect(graveyard.y + graveyard.h).toBe(mat.y + mat.h);
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
