import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hexify,
  rgbToHsv,
  extractCandidates,
  pickBestPair,
  pickBestTriple,
  pickBestQuintet,
  pickBestSet,
} from "./extract-colors.mjs";

test("hexify formats RGB as lowercase hex", () => {
  assert.equal(hexify([255, 0, 128]), "#ff0080");
  assert.equal(hexify([0, 0, 0]), "#000000");
});

test("rgbToHsv finds saturated red at hue 0", () => {
  const { hue, sat, val } = rgbToHsv(200, 40, 40);
  assert.ok(hue < 10 || hue > 350);
  assert.ok(sat > 0.7);
  assert.ok(val > 0.7);
});

test("rgbToHsv finds gray as unsaturated", () => {
  const { sat } = rgbToHsv(128, 128, 128);
  assert.equal(sat, 0);
});

function solidFill(rgb, count) {
  const pixels = new Uint8Array(count * 3);
  for (let i = 0; i < count; i++) {
    pixels[i * 3] = rgb[0];
    pixels[i * 3 + 1] = rgb[1];
    pixels[i * 3 + 2] = rgb[2];
  }
  return pixels;
}

function concatPixels(...buffers) {
  const total = buffers.reduce((sum, b) => sum + b.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const b of buffers) {
    out.set(b, offset);
    offset += b.length;
  }
  return out;
}

test("extractCandidates ignores gray background and finds a saturated color", () => {
  const pixels = concatPixels(
    solidFill([40, 40, 40], 1000), // desaturated background, dominant by count
    solidFill([200, 50, 50], 50) // saturated red, minority
  );
  const candidates = extractCandidates(pixels);
  assert.ok(candidates.length >= 1);
  assert.ok(candidates.every((c) => c.sat >= 0.25));
});

test("extractCandidates keeps only one candidate per hue slice", () => {
  const pixels = concatPixels(
    solidFill([200, 40, 40], 100), // red
    solidFill([205, 45, 45], 90) // near-identical red, same hue slice
  );
  const candidates = extractCandidates(pixels, { hueSliceDegrees: 20 });
  assert.equal(candidates.length, 1);
});

test("pickBestPair prefers two distinct, saturated hues over two similar ones", () => {
  const pixels = concatPixels(
    solidFill([200, 40, 40], 100), // red, hue ~0
    solidFill([40, 80, 200], 100), // blue, hue ~220
    solidFill([210, 60, 60], 90) // another red, close to the first
  );
  const candidates = extractCandidates(pixels, { hueSliceDegrees: 5 });
  const pair = pickBestPair(candidates);
  assert.equal(pair.length, 2);
  const hues = candidates
    .filter((c) => pair.includes(c.hex))
    .map((c) => c.hue);
  const dist = Math.abs(hues[0] - hues[1]);
  assert.ok(Math.min(dist, 360 - dist) > 100);
});

test("pickBestTriple returns three well-spread hues", () => {
  const pixels = concatPixels(
    solidFill([200, 40, 40], 100), // red
    solidFill([40, 180, 40], 100), // green
    solidFill([40, 80, 200], 100) // blue
  );
  const candidates = extractCandidates(pixels, { hueSliceDegrees: 10 });
  const triple = pickBestTriple(candidates);
  assert.equal(triple.length, 3);
});

test("pickBestPair and pickBestTriple degrade gracefully with too few candidates", () => {
  const pixels = solidFill([200, 40, 40], 10);
  const candidates = extractCandidates(pixels);
  assert.equal(pickBestPair(candidates).length, candidates.length);
  assert.equal(pickBestTriple(candidates).length, candidates.length);
});

test("pickBestQuintet returns five distinct hexes when enough candidates exist", () => {
  const pixels = concatPixels(
    solidFill([200, 40, 40], 100), // red
    solidFill([200, 140, 40], 100), // orange
    solidFill([40, 180, 40], 100), // green
    solidFill([40, 80, 200], 100), // blue
    solidFill([160, 40, 200], 100) // purple
  );
  const candidates = extractCandidates(pixels, { hueSliceDegrees: 10 });
  const quintet = pickBestQuintet(candidates);
  assert.equal(quintet.length, 5);
  assert.equal(new Set(quintet).size, 5);
});

test("pickBestSet degrades gracefully with fewer candidates than requested", () => {
  const pixels = solidFill([200, 40, 40], 10);
  const candidates = extractCandidates(pixels);
  assert.equal(pickBestSet(candidates, 5).length, candidates.length);
});
