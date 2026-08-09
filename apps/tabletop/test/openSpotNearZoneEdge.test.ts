import { describe, expect, it } from "vitest";
import { findOpenSpotsNearZoneEdge, Rect } from "../src/client/shapes/openSpotNearZoneEdge";

// Ticket 18 (counters): when a host card leaves the battlefield, its counters
// detach and land at an open spot near the destination zone's edge — outside
// the zone, on the table, not overlapping whatever already sits there.

const zone: Rect = { x: 100, y: 100, w: 200, h: 300 };
const SPOT = 44;

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function asRect(spot: { x: number; y: number }): Rect {
  return { ...spot, w: SPOT, h: SPOT };
}

describe("findOpenSpotsNearZoneEdge", () => {
  it("places a single counter outside the zone, near the edge closest to the entry point", () => {
    // Entry point near the zone's left edge, vertically centered.
    const entry = { x: 110, y: 250 };
    const [spot] = findOpenSpotsNearZoneEdge({ zone, entry, spotSize: SPOT, occupied: [], count: 1 });

    expect(overlaps(asRect(spot), zone)).toBe(false);
    // Near the left edge: fully left of the zone, within a couple of
    // spot-widths of it, and roughly level with the entry point.
    expect(spot.x + SPOT).toBeLessThanOrEqual(zone.x);
    expect(spot.x + SPOT).toBeGreaterThan(zone.x - 3 * SPOT);
    expect(Math.abs(spot.y + SPOT / 2 - entry.y)).toBeLessThanOrEqual(2 * SPOT);
  });

  it("chooses the top edge when the entry point is nearest the top", () => {
    const entry = { x: 200, y: 105 };
    const [spot] = findOpenSpotsNearZoneEdge({ zone, entry, spotSize: SPOT, occupied: [], count: 1 });

    expect(overlaps(asRect(spot), zone)).toBe(false);
    expect(spot.y + SPOT).toBeLessThanOrEqual(zone.y);
  });

  it("gives multiple counters non-overlapping spots", () => {
    const entry = { x: 110, y: 250 };
    const spots = findOpenSpotsNearZoneEdge({ zone, entry, spotSize: SPOT, occupied: [], count: 3 });

    expect(spots).toHaveLength(3);
    for (const spot of spots) {
      expect(overlaps(asRect(spot), zone)).toBe(false);
    }
    for (let i = 0; i < spots.length; i++) {
      for (let j = i + 1; j < spots.length; j++) {
        expect(overlaps(asRect(spots[i]), asRect(spots[j]))).toBe(false);
      }
    }
  });

  it("skips spots already occupied by other shapes", () => {
    const entry = { x: 110, y: 250 };
    // Learn where the first spot would land, then occupy it.
    const [firstChoice] = findOpenSpotsNearZoneEdge({ zone, entry, spotSize: SPOT, occupied: [], count: 1 });
    const occupied = [asRect(firstChoice)];
    const [spot] = findOpenSpotsNearZoneEdge({ zone, entry, spotSize: SPOT, occupied, count: 1 });

    expect(overlaps(asRect(spot), occupied[0])).toBe(false);
    expect(overlaps(asRect(spot), zone)).toBe(false);
  });

  it("still returns spots when the table is hopelessly crowded (overlap beats failure)", () => {
    const entry = { x: 110, y: 250 };
    // One giant occupied rect covering everything near the zone.
    const occupied: Rect[] = [{ x: zone.x - 2000, y: zone.y - 2000, w: 4000 + zone.w, h: 4000 + zone.h }];
    const spots = findOpenSpotsNearZoneEdge({ zone, entry, spotSize: SPOT, occupied, count: 2 });

    expect(spots).toHaveLength(2);
    // Even the fallback stays out of the zone itself.
    for (const spot of spots) {
      expect(overlaps(asRect(spot), zone)).toBe(false);
    }
  });
});
