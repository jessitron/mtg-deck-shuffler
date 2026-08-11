import fs from "node:fs";
import path from "node:path";
import { log } from "./log.js";

/**
 * The table-look choices a player can make on the prep screen (ticket 16):
 * playmat swatches and sleeve quick-pick colors. This module is the
 * server-side truth the POST /prep-table-look route validates against —
 * nothing off these lists (plus any #rrggbb custom sleeve) gets persisted.
 *
 * v1 was a deliberately curated array (issue 09); PLAYMATS is now derived
 * from every image file in public/images/playmats/ instead — add or remove
 * a file there and the picker follows, no code change needed.
 *
 * Sleeve quick-picks are derived per playmat from
 * public/images/playmats/playmat-colors.json (the tool-chosen "for sleeves"
 * accents for that image), falling back to the mana pie (SLEEVE_QUICK_PICKS)
 * for a playmat with no entry there.
 */

export interface PlaymatChoice {
  slug: string;
  name: string;
  /** Relative to the Shuffler's public root; made absolute at seat.joined send time. */
  path: string;
}

// Relative to process.cwd(), not __dirname — the app is always run (and
// tested) from apps/shuffler/, same convention as decks/ and data.db.
const PLAYMATS_DIR = path.join(process.cwd(), "public", "images", "playmats");
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

// Minor words stay lowercase mid-name, matching how the original curated
// list capitalized "Winds of Abandon" / "Face of Divinity".
const LOWERCASE_MID_WORDS = new Set(["of", "the", "a", "an", "and", "in", "on"]);

function slugFromFilename(stem: string): string {
  // Strips a "playmat-" prefix (playmat-map.png -> "map") and a leading
  // set-code + collector-number prefix (aeoe-43-cascading-cataracts.png ->
  // "cascading-cataracts") when present; leaves other filenames untouched.
  return stem.replace(/^playmat-/, "").replace(/^[a-z0-9]+-\d+-/, "");
}

function nameFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word, i) => (i > 0 && LOWERCASE_MID_WORDS.has(word) ? word : word[0].toUpperCase() + word.slice(1)))
    .join(" ");
}

function loadPlaymats(): PlaymatChoice[] {
  const filenames = fs
    .readdirSync(PLAYMATS_DIR)
    .filter((filename) => IMAGE_EXTENSIONS.has(path.extname(filename).toLowerCase()))
    .sort();

  return filenames.map((filename) => {
    const stem = filename.slice(0, -path.extname(filename).length);
    const slug = slugFromFilename(stem);
    return { slug, name: nameFromSlug(slug), path: `/images/playmats/${filename}` };
  });
}

export const PLAYMATS: readonly PlaymatChoice[] = loadPlaymats();

/** Today's mat — what every seat got before the picker existed. */
export const DEFAULT_PLAYMAT_PATH = "/images/playmats/aeoe-43-cascading-cataracts.png";

if (!PLAYMATS.some((mat) => mat.path === DEFAULT_PLAYMAT_PATH)) {
  throw new Error(`DEFAULT_PLAYMAT_PATH ${DEFAULT_PLAYMAT_PATH} is not among the images in ${PLAYMATS_DIR}`);
}

export interface SleeveQuickPick {
  name: string;
  hex: string;
}

/**
 * The mana pie. Fallback sleeve quick-picks for a playmat with no entry in
 * playmat-colors.json (or none at all, in tests). Sleeve colors are domain
 * data — a player's choice, like card art — so raw hexes are the values
 * here, mirroring the --mana-* tokens in packages/design-tokens/tokens.css
 * (change a token there, visit here).
 */
export const SLEEVE_QUICK_PICKS: readonly SleeveQuickPick[] = [
  { name: "White", hex: "#f0e68c" },
  { name: "Blue", hex: "#3c99e5" },
  { name: "Black", hex: "#530aae" },
  { name: "Red", hex: "#bd0a0a" },
  { name: "Green", hex: "#2a8439" },
];

interface PlaymatColorEntry {
  chosenFive?: string[];
  chosenThree?: string[];
}

const PLAYMAT_COLORS_PATH = path.join(PLAYMATS_DIR, "playmat-colors.json");

function loadPlaymatColors(): Record<string, PlaymatColorEntry> {
  let raw: string;
  try {
    raw = fs.readFileSync(PLAYMAT_COLORS_PATH, "utf-8");
  } catch {
    // No file yet (tools/playmat-colors/ hasn't been run) — every playmat
    // falls back to the mana pie. Not an error.
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    // File exists but is corrupt/truncated — this is a real data problem,
    // unlike a missing file, so it shouldn't fail silently: every playmat
    // still falls back to the mana pie, but we want to know why.
    log.warn("playmat-colors.json failed to parse; falling back to mana-pie sleeve quick-picks for every playmat", {
      "playmat.colors.path": PLAYMAT_COLORS_PATH,
    }, error instanceof Error ? error : undefined);
    return {};
  }
}

// Loaded once at startup, same convention as PLAYMATS: add/edit an entry via
// tools/playmat-colors/ and restart the server to pick it up.
const PLAYMAT_COLORS: Record<string, PlaymatColorEntry> = loadPlaymatColors();

/**
 * Sleeve quick-picks tailored to a playmat: its tool-chosen "for sleeves"
 * accents (chosenFive, falling back to chosenThree) when
 * playmat-colors.json has an entry for it, else the mana-pie default.
 */
export function sleeveQuickPicksForPlaymat(playmatPath: string): readonly SleeveQuickPick[] {
  const filename = path.basename(playmatPath);
  const entry = PLAYMAT_COLORS[filename];
  const hexes = entry?.chosenFive?.length ? entry.chosenFive : entry?.chosenThree;
  if (!hexes?.length) return SLEEVE_QUICK_PICKS;
  return hexes.map((hex, i) => ({ name: `Playmat color ${i + 1}`, hex }));
}

export function isKnownPlaymatPath(path: string): boolean {
  return PLAYMATS.some((mat) => mat.path === path);
}

export function isValidSleeveColor(color: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(color);
}
