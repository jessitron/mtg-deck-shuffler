import fs from "node:fs";
import path from "node:path";
import { log } from "./log.js";


export interface PlaymatChoice {
  slug: string;
  name: string;
  /** Relative to the Shuffler's public root; made absolute at seat.joined send time. */
  path: string;
}

const PLAYMATS_DIR = path.join(process.cwd(), "public", "images", "playmats");
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

const LOWERCASE_MID_WORDS = new Set(["of", "the", "a", "an", "and", "in", "on"]);

function slugFromFilename(stem: string): string {
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
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    log.warn("playmat-colors.json failed to parse; falling back to mana-pie sleeve quick-picks for every playmat", {
      "playmat.colors.path": PLAYMAT_COLORS_PATH,
    }, error instanceof Error ? error : undefined);
    return {};
  }
}

const PLAYMAT_COLORS: Record<string, PlaymatColorEntry> = loadPlaymatColors();

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
