/**
 * The curated table-look choices a player can make on the prep screen
 * (ticket 16): playmat swatches and sleeve quick-pick colors. This module is
 * the server-side truth the POST /prep-table-look route validates against —
 * nothing off these lists (plus any #rrggbb custom sleeve) gets persisted.
 *
 * v1 is deliberately curated (issue 09): image swatches with custom URLs, and
 * image-based sleeves, are a later phase.
 */

export interface PlaymatChoice {
  slug: string;
  name: string;
  /** Relative to the Shuffler's public root; made absolute at seat.joined send time. */
  path: string;
}

/** The five aeoe-* art cards already serving as home-page hero backgrounds,
 * plus six lower-contrast art crops for players who find those too busy
 * against cards/text (Jess's sister, 2026-08-09). */
export const PLAYMATS: readonly PlaymatChoice[] = [
  { slug: "cascading-cataracts", name: "Cascading Cataracts", path: "/images/aeoe-43-cascading-cataracts.png" },
  { slug: "exalted-sunborn", name: "Exalted Sunborn", path: "/images/aeoe-3-exalted-sunborn.png" },
  { slug: "seam-rip", name: "Seam Rip", path: "/images/aeoe-6-seam-rip.png" },
  { slug: "terrasymbiosis", name: "Terrasymbiosis", path: "/images/aeoe-41-terrasymbiosis.png" },
  { slug: "bonders-enclave", name: "Bonder's Enclave", path: "/images/aeoe-49-bonders-enclave.png" },
  { slug: "glittering-frost", name: "Glittering Frost", path: "/images/akhm-45-glittering-frost.png" },
  { slug: "chillerpillar", name: "Chillerpillar", path: "/images/amh1-1-chillerpillar.png" },
  { slug: "winds-of-abandon", name: "Winds of Abandon", path: "/images/amh1-31-winds-of-abandon.png" },
  { slug: "face-of-divinity", name: "Face of Divinity", path: "/images/amh1-35-face-of-divinity.png" },
  { slug: "timeless-dragon", name: "Timeless Dragon", path: "/images/amh2-9-timeless-dragon.png" },
  { slug: "sea-gate-restoration", name: "Sea Gate Restoration", path: "/images/aznr-49-sea-gate-restoration.png" },
];

/** Today's mat — what every seat got before the picker existed. */
export const DEFAULT_PLAYMAT_PATH = "/images/aeoe-43-cascading-cataracts.png";

export interface SleeveQuickPick {
  name: string;
  hex: string;
}

/**
 * The mana pie. Sleeve colors are domain data — a player's choice, like card
 * art — so raw hexes are the values here, mirroring the --mana-* tokens in
 * packages/design-tokens/tokens.css (change a token there, visit here).
 */
export const SLEEVE_QUICK_PICKS: readonly SleeveQuickPick[] = [
  { name: "White", hex: "#f0e68c" },
  { name: "Blue", hex: "#3c99e5" },
  { name: "Black", hex: "#530aae" },
  { name: "Red", hex: "#bd0a0a" },
  { name: "Green", hex: "#2a8439" },
];

export function isKnownPlaymatPath(path: string): boolean {
  return PLAYMATS.some((mat) => mat.path === path);
}

export function isValidSleeveColor(color: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(color);
}
