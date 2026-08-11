
const LINE_HEIGHT = 1.1;
const BASE_FRACTION = 0.32;
const BORDER_FRACTION = 3 / 44; // --narrow-border at the default 44px disc, proportional
const MIN_FONT_PX = 4;
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
