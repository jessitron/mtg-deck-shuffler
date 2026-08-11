import {
  PLAYMATS,
  DEFAULT_PLAYMAT_PATH,
  SLEEVE_QUICK_PICKS,
  sleeveQuickPicksForPlaymat,
  isKnownPlaymatPath,
  isValidSleeveColor,
} from "../src/table-look.js";


describe("PLAYMATS", () => {
  it("includes the default mat (today's hardcoded one)", () => {
    expect(PLAYMATS.map((m) => m.path)).toContain(DEFAULT_PLAYMAT_PATH);
    expect(DEFAULT_PLAYMAT_PATH).toBe("/images/playmats/aeoe-43-cascading-cataracts.png");
  });

  it("offers every playmat image in public/images/playmats/", () => {
    expect(PLAYMATS).toHaveLength(12);
    for (const mat of PLAYMATS) {
      expect(mat.path).toMatch(/^\/images\/playmats\/.*\.png$/);
      expect(mat.name.length).toBeGreaterThan(0);
    }
  });

  it("includes playmat-map.png (Jess likes the map one)", () => {
    expect(PLAYMATS.map((m) => m.path)).toContain("/images/playmats/playmat-map.png");
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

describe("sleeveQuickPicksForPlaymat", () => {
  it("uses the playmat's own chosenFive from playmat-colors.json when it has one", () => {
    const picks = sleeveQuickPicksForPlaymat("/images/playmats/playmat-map.png");
    expect(picks.map((p) => p.hex)).toEqual(["#a09070", "#304040", "#d090b0", "#303040", "#605040"]);
  });

  it("falls back to the mana pie for a playmat with no playmat-colors.json entry", () => {
    expect(sleeveQuickPicksForPlaymat("/images/playmats/aeoe-41-terrasymbiosis.png")).toEqual(SLEEVE_QUICK_PICKS);
  });

  it("falls back to the mana pie for an unknown path", () => {
    expect(sleeveQuickPicksForPlaymat("/images/playmats/does-not-exist.png")).toEqual(SLEEVE_QUICK_PICKS);
  });

  it("returns picks that are all valid sleeve colors", () => {
    for (const mat of PLAYMATS) {
      for (const pick of sleeveQuickPicksForPlaymat(mat.path)) {
        expect(isValidSleeveColor(pick.hex)).toBe(true);
      }
    }
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
