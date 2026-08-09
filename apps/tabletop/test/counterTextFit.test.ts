import { describe, expect, it } from "vitest";
import { estimateMeasure, fitCounterText, MeasureText } from "../src/client/shapes/counterTextFit";

// Jess (2026-08-08): "if I type something like 'lifelink' on the counter,
// then I can't see the word... make the font shrink to fit." The disc keeps
// its comfortable base size for short labels ("3") and shrinks — wrapping
// onto more lines where that helps — until the text fits. The fit is
// circle-aware: each line is packed against the chord width the disc
// actually offers at that line's height, so top/bottom lines never poke
// into the round clip.

const W = 44;
const H = 44;
const BASE = H * 0.32;
const RADIUS = W / 2 - H * (3 / 44); // content radius: half size minus border

function bandWidth(fontSize: number, lineCount: number, lineIndex: number): number {
  const lineHeight = fontSize * 1.1;
  const yTop = -(lineCount * lineHeight) / 2 + lineIndex * lineHeight;
  const d = Math.max(Math.abs(yTop), Math.abs(yTop + lineHeight));
  return d >= RADIUS ? 0 : 2 * Math.sqrt(RADIUS * RADIUS - d * d);
}

describe("fitCounterText", () => {
  it("keeps the base size for blank and short text", () => {
    expect(fitCounterText("", W, H).fontSize).toBe(BASE);
    const three = fitCounterText("3", W, H);
    expect(three.fontSize).toBe(BASE);
    expect(three.lines).toEqual(["3"]);
  });

  it("shrinks 'lifelink' below the base size, but keeps it legible", () => {
    const fit = fitCounterText("lifelink", W, H);
    expect(fit.fontSize).toBeLessThan(BASE);
    expect(fit.fontSize).toBeGreaterThanOrEqual(4);
    expect(fit.lines.join("")).toBe("lifelink");
  });

  it("every packed line fits its own circle chord", () => {
    for (const text of ["lifelink", "+1/+1", "deathtouch", "first strike"]) {
      const { fontSize, lines } = fitCounterText(text, W, H);
      for (let i = 0; i < lines.length; i++) {
        expect(estimateMeasure(lines[i], fontSize)).toBeLessThanOrEqual(bandWidth(fontSize, lines.length, i) + 1e-9);
      }
      expect(lines.length * 1.1 * fontSize).toBeLessThanOrEqual(2 * RADIUS + 1e-9);
    }
  });

  it("wraps at spaces when it can: 'first strike' keeps its words whole", () => {
    const { lines } = fitCounterText("first strike", W, H);
    expect(lines.join(" ")).toBe("first strike");
    for (const line of lines) {
      expect(["first", "strike", "first strike"]).toContain(line);
    }
  });

  it("never gives longer text a larger font than a prefix of it", () => {
    // Same-shape comparisons: the word-preference tradeoff means a wrappable
    // phrase can out-size an unbreakable token, but growing the SAME text
    // never grows the font.
    const short = fitCounterText("abc", W, H).fontSize;
    const medium = fitCounterText("abcdefgh", W, H).fontSize;
    const long = fitCounterText("abcdefgh abcdefgh abcdefgh", W, H).fontSize;
    expect(short).toBe(BASE);
    expect(medium).toBeLessThanOrEqual(short);
    expect(long).toBeLessThanOrEqual(medium);
  });

  it("never shrinks below the floor, even for absurd text, and never loses the text", () => {
    const fit = fitCounterText("x".repeat(500), W, H);
    expect(fit.fontSize).toBeGreaterThanOrEqual(4);
    expect(fit.lines.join("").length).toBeGreaterThan(0);
  });

  it("scales with the disc: a resized-up counter fits the same text at a larger size", () => {
    expect(fitCounterText("lifelink", 88, 88).fontSize).toBeGreaterThan(fitCounterText("lifelink", 44, 44).fontSize);
  });

  it("uses the injected measure function", () => {
    // A measure that claims everything is one pixel wide: nothing ever wraps.
    const skinny: MeasureText = () => 1;
    const fit = fitCounterText("a very long label indeed", W, H, skinny);
    expect(fit.fontSize).toBe(BASE);
    expect(fit.lines).toEqual(["a very long label indeed"]);
  });
});
