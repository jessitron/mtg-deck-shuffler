import { PLAYMATS, DEFAULT_PLAYMAT_PATH, SLEEVE_QUICK_PICKS, isKnownPlaymatPath, isValidSleeveColor } from "../src/table-look.js";

/**
 * Ticket 16: the curated table-look data is the server-side truth the
 * POST /prep-table-look route validates against.
 */

describe("PLAYMATS", () => {
  it("includes the default mat (today's hardcoded one)", () => {
    expect(PLAYMATS.map((m) => m.path)).toContain(DEFAULT_PLAYMAT_PATH);
    expect(DEFAULT_PLAYMAT_PATH).toBe("/images/aeoe-43-cascading-cataracts.png");
  });

  it("offers the curated art-card playmats", () => {
    expect(PLAYMATS).toHaveLength(11);
    for (const mat of PLAYMATS) {
      expect(mat.path).toMatch(/^\/images\/.*\.png$/);
      expect(mat.name.length).toBeGreaterThan(0);
    }
  });
});

describe("isKnownPlaymatPath", () => {
  it("accepts every curated mat", () => {
    for (const mat of PLAYMATS) expect(isKnownPlaymatPath(mat.path)).toBe(true);
  });

  it("rejects anything off the list — the route must not persist arbitrary paths", () => {
    expect(isKnownPlaymatPath("/images/other.png")).toBe(false);
    expect(isKnownPlaymatPath("https://evil.example/mat.png")).toBe(false);
    expect(isKnownPlaymatPath("")).toBe(false);
  });
});

describe("isValidSleeveColor", () => {
  it("accepts #rrggbb, including every quick pick", () => {
    expect(isValidSleeveColor("#8b2f5c")).toBe(true);
    for (const pick of SLEEVE_QUICK_PICKS) expect(isValidSleeveColor(pick.hex)).toBe(true);
  });

  it("rejects non-hex shapes", () => {
    expect(isValidSleeveColor("red")).toBe(false);
    expect(isValidSleeveColor("#fff")).toBe(false);
    expect(isValidSleeveColor("#12345g")).toBe(false);
    expect(isValidSleeveColor("")).toBe(false);
  });
});
