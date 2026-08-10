import { randomInt } from "node:crypto";

// Fun, non-sequential game IDs (e.g. "brave-falcon-42") instead of incrementing
// integers. The privacy motivation: root SEAMAP.md makes "no login/auth yet" an
// explicit non-goal, so a sequential /game/47 URL is trivially guessable by
// incrementing the number. A random word-pair + suffix isn't derivable from
// another game's id, and it's not meant to resist a determined attacker
// (there's no auth to protect) — just to stop casual URL-guessing.
//
// Old numeric-id games are untouched; only NEW games get this format. See
// domain-types.ts (GameId = string | number) and
// apps/shuffler/notes/DESIGN-persistence-versioning.md — this is not a shape
// change to anything persisted, since old ids keep working exactly as before.

const ADJECTIVES = [
  "brave", "swift", "arcane", "mystic", "shifting", "ancient", "feral", "wandering",
  "silent", "gilded", "verdant", "obsidian", "radiant", "cunning", "restless",
  "spectral", "gleaming", "sunken", "storm", "ember", "frosty", "wild", "hidden",
  "crimson", "shadow", "azure", "golden", "rusty", "nimble", "grim",
];

const NOUNS = [
  "falcon", "griffin", "phoenix", "wizard", "goblin", "dragon", "sphinx", "hydra",
  "wraith", "golem", "kraken", "wolf", "raven", "serpent", "titan", "specter",
  "paladin", "druid", "beacon", "citadel", "forge", "grove", "spire", "tempest",
  "warden", "seer", "nomad", "sentinel", "harbinger", "outrider",
];

/** Matches the shape this generator produces: `word-word-N` or `word-word-NN`. */
export const GAME_ID_WORD_FORMAT = /^[a-z]+-[a-z]+-\d{1,2}$/;

/** Generates a fresh fun-word-combo id. Not guaranteed unique on its own — callers
 * that persist ids should check for collisions and retry (astronomically rare
 * with ~30*30*100 = 90,000 combinations, but cheap to guard anyway). */
export function generateGameId(): string {
  const adjective = ADJECTIVES[randomInt(ADJECTIVES.length)];
  const noun = NOUNS[randomInt(NOUNS.length)];
  const suffix = randomInt(100); // 0-99
  return `${adjective}-${noun}-${suffix}`;
}

/** Generates a word-combo id, retrying on collision. `exists` should check
 * whatever storage the caller uses. Throws after a generous number of retries
 * so a bug in `exists` (e.g. always returning true) fails loudly instead of
 * looping forever. */
export function generateUniqueGameId(exists: (candidate: string) => boolean): string {
  const maxAttempts = 50;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = generateGameId();
    if (!exists(candidate)) {
      return candidate;
    }
  }
  throw new Error(`Could not generate a unique game id after ${maxAttempts} attempts`);
}
