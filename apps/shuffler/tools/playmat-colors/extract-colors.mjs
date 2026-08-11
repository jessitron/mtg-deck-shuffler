// Pure color-extraction logic, operating on raw RGB pixel data.
// No image decoding here — that's index.mjs's job (via sharp) — so this stays
// unit-testable with synthetic pixel buffers.

export function hexify([r, g, b]) {
  return "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");
}

export function rgbToHsv(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let hue = 0;
  if (delta !== 0) {
    if (max === rn) hue = 60 * (((gn - bn) / delta) % 6);
    else if (max === gn) hue = 60 * ((bn - rn) / delta + 2);
    else hue = 60 * ((rn - gn) / delta + 4);
  }
  if (hue < 0) hue += 360;

  const sat = max === 0 ? 0 : delta / max;
  const val = max;
  return { hue, sat, val };
}

function circularHueDistance(a, b) {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

// Buckets pixels into a coarse RGB grid, scores each bucket by
// count * saturation, and keeps at most one bucket per hue slice so the
// candidate list spans distinct colors instead of a dozen near-duplicate reds.
export function extractCandidates(
  pixels,
  {
    bucketSize = 16,
    minSaturation = 0.25,
    minValue = 0.15,
    maxValue = 0.95,
    hueSliceDegrees = 20,
    maxCandidates = 14,
  } = {}
) {
  const counts = new Map();

  for (let i = 0; i + 2 < pixels.length; i += 3) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const key =
      Math.round(r / bucketSize) * bucketSize +
      "," +
      Math.round(g / bucketSize) * bucketSize +
      "," +
      Math.round(b / bucketSize) * bucketSize;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const scored = [];
  for (const [key, count] of counts) {
    const [r, g, b] = key.split(",").map(Number);
    const { hue, sat, val } = rgbToHsv(r, g, b);
    if (sat < minSaturation || val < minValue || val > maxValue) continue;
    scored.push({ rgb: [r, g, b], hue, sat, val, count, score: count * sat });
  }
  scored.sort((a, b) => b.score - a.score);

  const bySlice = new Map();
  for (const candidate of scored) {
    const slice = Math.floor(candidate.hue / hueSliceDegrees);
    if (!bySlice.has(slice)) bySlice.set(slice, candidate);
  }

  return [...bySlice.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, maxCandidates)
    .map((c) => ({ hex: hexify(c.rgb), ...c }));
}

function* combinations(items, size, start = 0, combo = []) {
  if (combo.length === size) {
    yield combo;
    return;
  }
  for (let i = start; i < items.length; i++) {
    yield* combinations(items, size, i + 1, [...combo, items[i]]);
  }
}

// Picks the `size` candidates maximizing the smallest pairwise hue gap (so no
// two sit close together), weighted by average saturation. Brute-force over
// combinations — fine at the candidate-list sizes this tool works with.
export function pickBestSet(candidates, size) {
  if (candidates.length <= size) return candidates.map((c) => c.hex);

  let best = null;
  for (const combo of combinations(candidates, size)) {
    let minGap = Infinity;
    let satSum = 0;
    for (let i = 0; i < combo.length; i++) {
      satSum += combo[i].sat;
      for (let j = i + 1; j < combo.length; j++) {
        minGap = Math.min(minGap, circularHueDistance(combo[i].hue, combo[j].hue));
      }
    }
    const score = minGap * (satSum / combo.length);
    if (!best || score > best.score) best = { score, combo };
  }
  return best.combo.map((c) => c.hex);
}

export function pickBestPair(candidates) {
  return pickBestSet(candidates, 2);
}

export function pickBestTriple(candidates) {
  return pickBestSet(candidates, 3);
}

export function pickBestQuintet(candidates) {
  return pickBestSet(candidates, 5);
}
