/**
 * Shrink-to-fit for the counter disc's text (Jess, 2026-08-08: typing
 * "lifelink" overflowed the disc invisibly). Deliberately minimal: shrink
 * the font until the text's estimated wrapped block fits the SQUARE content
 * box, and let the browser do the actual wrapping. The round clip nibbling
 * the corners of long labels is accepted — close enough, per Jess; proper
 * circle-aware typesetting belongs in a library, not this app.
 *
 * Width is estimated, not measured: canvas `measureText` looked more
 * accurate but lies when the webfont hasn't loaded yet (an empty table
 * renders no Orbitron, so the font isn't even fetched), and a conservative
 * per-character coefficient is close enough for a 44px chip.
 */

const LINE_HEIGHT = 1.1;
const BASE_FRACTION = 0.32;
const BORDER_FRACTION = 3 / 44; // --narrow-border at the default 44px disc, proportional
const MIN_FONT_PX = 4;
// Bold Orbitron runs wide — call it 0.8em per character — and real wrapping
// wastes some of each line (breaks fall at words, not exactly at the edge).
const CHAR_WIDTH_EM = 0.8;
const WRAP_SLACK = 0.85;

export interface FitFont {
  fontSize: number;
  lineCount: number;
}

export function fitCounterFont(text: string, w: number, h: number): FitFont {
  const base = h * BASE_FRACTION;
  const trimmed = text.trim();
  if (trimmed.length === 0) return { fontSize: base, lineCount: 0 };

  const usableWidth = (w - 2 * h * BORDER_FRACTION) * WRAP_SLACK;
  const usableHeight = h - 2 * h * BORDER_FRACTION;
  const step = h / 88; // 0.5px at the default 44px disc, proportional above it
  let lineCount = 1;
  for (let fontSize = base; fontSize > MIN_FONT_PX; fontSize -= step) {
    lineCount = Math.ceil((trimmed.length * CHAR_WIDTH_EM * fontSize) / usableWidth);
    if (lineCount * LINE_HEIGHT * fontSize <= usableHeight) return { fontSize, lineCount };
  }
  return { fontSize: MIN_FONT_PX, lineCount };
}
