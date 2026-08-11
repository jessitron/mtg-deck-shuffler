import { randomInt } from "node:crypto";


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

export function generateGameId(): string {
  const adjective = ADJECTIVES[randomInt(ADJECTIVES.length)];
  const noun = NOUNS[randomInt(NOUNS.length)];
  const suffix = randomInt(100); // 0-99
  return `${adjective}-${noun}-${suffix}`;
}

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
