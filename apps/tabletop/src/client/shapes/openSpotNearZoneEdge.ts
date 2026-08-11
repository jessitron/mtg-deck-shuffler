
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface OpenSpotRequest {
  zone: Rect;
  /** Where the card landed (page point); picks the nearest edge. */
  entry: { x: number; y: number };
  spotSize: number;
  /** Page bounds of shapes already on the table (counters must not cover them — best effort). */
  occupied: Rect[];
  count: number;
}

const GAP = 8;
const MAX_STEPS_PER_SPOT = 40;

function intersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function findOpenSpotsNearZoneEdge(request: OpenSpotRequest): Array<{ x: number; y: number }> {
  const { zone, entry, spotSize, count } = request;
  const occupied = [...request.occupied];
  const spots: Array<{ x: number; y: number }> = [];

  // Nearest edge: distance from the entry point to each of the zone's sides.
  const distances = {
    left: Math.abs(entry.x - zone.x),
    right: Math.abs(zone.x + zone.w - entry.x),
    top: Math.abs(entry.y - zone.y),
    bottom: Math.abs(zone.y + zone.h - entry.y),
  };
  const edge = (Object.keys(distances) as Array<keyof typeof distances>).reduce((best, candidate) =>
    distances[candidate] < distances[best] ? candidate : best,
  );

  const vertical = edge === "left" || edge === "right";
  const anchor =
    edge === "left"
      ? { x: zone.x - GAP - spotSize, y: entry.y - spotSize / 2 }
      : edge === "right"
        ? { x: zone.x + zone.w + GAP, y: entry.y - spotSize / 2 }
        : edge === "top"
          ? { x: entry.x - spotSize / 2, y: zone.y - GAP - spotSize }
          : { x: entry.x - spotSize / 2, y: zone.y + zone.h + GAP };

  const slotAt = (step: number) => {
    const offset = step * (spotSize + GAP);
    return vertical ? { x: anchor.x, y: anchor.y + offset } : { x: anchor.x + offset, y: anchor.y };
  };

  for (let n = 0; n < count; n++) {
    let placed: { x: number; y: number } | undefined;
    for (let attempt = 0; attempt < MAX_STEPS_PER_SPOT; attempt++) {
      // 0, +1, -1, +2, -2, …
      const step = attempt === 0 ? 0 : attempt % 2 === 1 ? Math.ceil(attempt / 2) : -attempt / 2;
      const candidate = slotAt(step);
      const rect: Rect = { ...candidate, w: spotSize, h: spotSize };
      if (intersects(rect, zone)) continue;
      if (occupied.some((o) => intersects(rect, o))) continue;
      placed = candidate;
      break;
    }
    placed ??= slotAt(0);
    occupied.push({ ...placed, w: spotSize, h: spotSize });
    spots.push(placed);
  }

  return spots;
}
