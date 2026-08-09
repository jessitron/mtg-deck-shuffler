/**
 * Shrink-to-fit for the counter disc's text (Jess, 2026-08-08: typing
 * "lifelink" overflowed the disc invisibly). Short labels keep the
 * comfortable base size (0.32 × height); longer text shrinks — wrapping onto
 * more lines where that helps — until it fits.
 *
 * The disc is a CIRCLE, so this owns the line-breaking rather than letting
 * CSS do it: the browser wraps text to the square content box and the round
 * clip eats the corners of top and bottom lines (seen live with "first
 * strike"). Here each candidate line is packed against the chord width the
 * circle actually offers at that line's height, and the caller renders the
 * returned lines explicitly.
 *
 * Text measurement is injectable: the browser passes a real canvas
 * `measureText` (see `makeCanvasMeasure`); tests use the built-in estimate.
 */

export type MeasureText = (text: string, fontSizePx: number) => number;

const LINE_HEIGHT = 1.1;
const BASE_FRACTION = 0.32;
const BORDER_FRACTION = 3 / 44; // --narrow-border at the default 44px disc, proportional
const MIN_FONT_PX = 4;
const MAX_LINES = 6;
// Estimate fallback: bold Orbitron averages very roughly 0.8em per character.
const CHAR_WIDTH_EM = 0.8;

export const estimateMeasure: MeasureText = (text, fontSizePx) => text.length * fontSizePx * CHAR_WIDTH_EM;

export interface FitText {
  fontSize: number;
  lines: string[];
}

/** The circle's usable width for a horizontal band spanning [yTop, yTop+bandHeight], offsets from center. */
function chordWidth(radius: number, yTop: number, bandHeight: number): number {
  const d = Math.max(Math.abs(yTop), Math.abs(yTop + bandHeight));
  if (d >= radius) return 0;
  return 2 * Math.sqrt(radius * radius - d * d);
}

/**
 * Greedy word-aware packing into lines of the given widths: fill each line
 * with whole words while they fit; a word too wide for a whole line splits
 * at characters (the break-word fallback) — unless `allowSplit` is false, in
 * which case the layout fails instead. Returns the packed lines, or
 * undefined if the text doesn't fit.
 */
function pack(
  text: string,
  fontSize: number,
  widths: number[],
  measure: MeasureText,
  allowSplit: boolean,
): string[] | undefined {
  const words = text.split(/\s+/).filter((word) => word.length > 0);
  const lines: string[] = [];
  let lineIndex = 0;
  let line = "";
  const widthOf = (s: string) => measure(s, fontSize);

  const push = (): boolean => {
    lines.push(line);
    line = "";
    lineIndex++;
    return lineIndex < widths.length;
  };

  for (let wi = 0; wi < words.length; wi++) {
    let word = words[wi];
    const withWord = line === "" ? word : `${line} ${word}`;
    if (widthOf(withWord) <= widths[lineIndex]) {
      line = withWord;
      continue;
    }
    // Doesn't fit appended. Start a fresh line for it, unless this line is empty.
    if (line !== "" && !push()) return undefined;
    if (!allowSplit && widthOf(word) > widths[lineIndex]) return undefined;
    // Break the word at characters across as many lines as it needs.
    while (widthOf(word) > widths[lineIndex]) {
      let cut = 0;
      while (cut < word.length && widthOf(word.slice(0, cut + 1)) <= widths[lineIndex]) cut++;
      if (cut === 0) return undefined; // not even one character fits this band
      line = word.slice(0, cut);
      word = word.slice(cut);
      if (!push()) return undefined;
    }
    line = word;
  }
  if (line !== "") lines.push(line);
  return lines;
}

function tryLayout(
  text: string,
  fontSize: number,
  radius: number,
  measure: MeasureText,
  allowSplit: boolean,
): string[] | undefined {
  const lineHeightPx = fontSize * LINE_HEIGHT;
  const maxLines = Math.min(MAX_LINES, Math.floor((2 * radius) / lineHeightPx));
  for (let k = 1; k <= maxLines; k++) {
    const widths: number[] = [];
    for (let i = 0; i < k; i++) {
      widths.push(chordWidth(radius, -(k * lineHeightPx) / 2 + i * lineHeightPx, lineHeightPx));
    }
    if (widths.some((width) => width <= 0)) continue;
    const lines = pack(text, fontSize, widths, measure, allowSplit);
    if (lines && lines.length <= k) return lines;
  }
  return undefined;
}

// A whole-words layout is preferred over one that breaks words at characters,
// unless keeping words whole costs more than this fraction of the font size —
// "first strike" should wrap as first/strike a touch smaller, while a single
// long word ("lifelink") is still worth breaking to stay big.
const WORD_PREFERENCE = 0.7;

export function fitCounterText(text: string, w: number, h: number, measure: MeasureText = estimateMeasure): FitText {
  const base = h * BASE_FRACTION;
  const trimmed = text.trim();
  if (trimmed.length === 0) return { fontSize: base, lines: [] };

  const radius = Math.min(w, h) / 2 - h * BORDER_FRACTION;
  const step = h / 88; // 0.5px at the default 44px disc, proportional above it
  let best: FitText | undefined;
  for (let fontSize = base; fontSize > MIN_FONT_PX; fontSize -= step) {
    if (best && fontSize < WORD_PREFERENCE * best.fontSize) return best;
    const wordLines = tryLayout(trimmed, fontSize, radius, measure, false);
    if (wordLines) return { fontSize, lines: wordLines };
    if (!best) {
      const lines = tryLayout(trimmed, fontSize, radius, measure, true);
      if (lines) best = { fontSize, lines };
    }
  }
  if (best) return best;

  // Overflow beats disappearing: at the floor size, pack what fits and cram
  // the rest onto the last line (the disc clips it, but most text shows).
  const lineHeightPx = MIN_FONT_PX * LINE_HEIGHT;
  const k = Math.max(1, Math.min(MAX_LINES, Math.floor((2 * radius) / lineHeightPx)));
  const widths = Array.from({ length: k }, (_, i) =>
    Math.max(1, chordWidth(radius, -(k * lineHeightPx) / 2 + i * lineHeightPx, lineHeightPx)),
  );
  const lines = pack(trimmed, MIN_FONT_PX, widths, measure, true) ?? [trimmed];
  return { fontSize: MIN_FONT_PX, lines };
}

/**
 * A MeasureText backed by a real canvas 2D context, measuring with the given
 * resolved font family (e.g. the value of --font-chrome) at weight 700.
 * Returns undefined where canvas isn't available (tests, SSR).
 */
export function makeCanvasMeasure(fontFamily: string): MeasureText | undefined {
  if (typeof document === "undefined") return undefined;
  const context = document.createElement("canvas").getContext("2d");
  if (!context) return undefined;
  return (text, fontSizePx) => {
    context.font = `700 ${fontSizePx}px ${fontFamily}`;
    return context.measureText(text).width;
  };
}
