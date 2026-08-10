import { generateGameId, generateUniqueGameId, GAME_ID_WORD_FORMAT } from "../src/gameIdGenerator.js";

describe("gameIdGenerator", () => {
  it("generates ids in word-word-number format", () => {
    for (let i = 0; i < 50; i++) {
      const id = generateGameId();
      expect(id).toMatch(GAME_ID_WORD_FORMAT);
    }
  });

  it("is not sequential or derivable from a previous call", () => {
    const ids = Array.from({ length: 20 }, () => generateGameId());
    // Not all identical (would indicate a broken RNG), and no obvious counting pattern.
    const unique = new Set(ids);
    expect(unique.size).toBeGreaterThan(1);
    // None of them are plain increasing integers like the old scheme.
    for (const id of ids) {
      expect(id).not.toMatch(/^\d+$/);
    }
  });

  it("retries on collision until a fresh id is found", () => {
    const taken = new Set(["brave-falcon-42"]);
    let attempts = 0;
    const originalRandom = Math.random;
    try {
      // Force the first candidate to collide, then succeed.
      const id = generateUniqueGameId((candidate) => {
        attempts++;
        if (attempts === 1) return true; // pretend the first candidate is taken
        return taken.has(candidate);
      });
      expect(attempts).toBeGreaterThanOrEqual(2);
      expect(id).toMatch(GAME_ID_WORD_FORMAT);
    } finally {
      Math.random = originalRandom;
    }
  });

  it("throws rather than looping forever if every candidate is taken", () => {
    expect(() => generateUniqueGameId(() => true)).toThrow();
  });
});
