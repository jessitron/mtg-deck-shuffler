import { describe, expect, it } from "vitest";
import { fitCounterFont } from "../src/client/shapes/counterTextFit";


const W = 44;
const H = 44;
const BASE = H * 0.32;

describe("fitCounterFont", () => {
  it("keeps the base size for blank and short text", () => {
    expect(fitCounterFont("", W, H).fontSize).toBe(BASE);
    expect(fitCounterFont("3", W, H).fontSize).toBe(BASE);
  });

  it("shrinks 'lifelink' below the base size, but not below the floor", () => {
    const { fontSize } = fitCounterFont("lifelink", W, H);
    expect(fontSize).toBeLessThan(BASE);
    expect(fontSize).toBeGreaterThanOrEqual(4);
  });

  it("never gives longer text a larger font", () => {
    const short = fitCounterFont("abc", W, H).fontSize;
    const medium = fitCounterFont("abcdefgh", W, H).fontSize;
    const long = fitCounterFont("abcdefgh abcdefgh abcdefgh", W, H).fontSize;
    expect(medium).toBeLessThanOrEqual(short);
    expect(long).toBeLessThanOrEqual(medium);
  });

  it("never shrinks below the floor, even for absurd text", () => {
    expect(fitCounterFont("x".repeat(500), W, H).fontSize).toBe(4);
  });

  it("scales with the disc: a resized-up counter fits the same text at a larger size", () => {
    expect(fitCounterFont("lifelink", 88, 88).fontSize).toBeGreaterThan(fitCounterFont("lifelink", 44, 44).fontSize);
  });
});
