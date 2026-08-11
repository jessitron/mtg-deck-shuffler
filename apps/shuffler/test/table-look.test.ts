import {
  PLAYMATS,
  DEFAULT_PLAYMAT_PATH,
  SLEEVE_QUICK_PICKS,
  sleeveQuickPicksForPlaymat,
  isKnownPlaymatPath,
  isValidSleeveColor,
  colorsForPlaymat,
} from "../src/table-look.js";


describe("PLAYMATS", () => {
  it("includes the default mat (today's hardcoded one)", () => {
    expect(PLAYMATS.map((m) => m.path)).toContain(DEFAULT_PLAYMAT_PATH);
    expect(DEFAULT_PLAYMAT_PATH).toBe("/images/playmats/aeoe-41-terrasymbiosis.png");
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

describe("colorsForPlaymat", () => {
  // playmat-map.png's chosenTwo (playmat-colors.json): #d090b0 (lighter), #30546c (darker).
  const MAP_PLAYMAT = "/images/playmats/playmat-map.png";

  it("with a sleeve chosen, uses the sleeve as primary and the more-contrasting chosenTwo color as secondary", () => {
    // Black quick-pick (#530aae) is dark — it contrasts more with the lighter chosenTwo color (#d090b0).
    expect(colorsForPlaymat(MAP_PLAYMAT, "#530aae")).toEqual({
      primaryColor: "#530aae",
      secondaryColor: "#d090b0",
    });

    // White quick-pick (#f0e68c) is light — it contrasts more with the darker chosenTwo color (#30546c).
    expect(colorsForPlaymat(MAP_PLAYMAT, "#f0e68c")).toEqual({
      primaryColor: "#f0e68c",
      secondaryColor: "#30546c",
    });
  });

  it("with no sleeve chosen, uses the darker chosenTwo color as primary and the other as secondary", () => {
    expect(colorsForPlaymat(MAP_PLAYMAT, undefined)).toEqual({
      primaryColor: "#30546c",
      secondaryColor: "#d090b0",
    });
  });

  it("falls back to the fixed default pair for an unknown path, regardless of sleeve", () => {
    const fallback = colorsForPlaymat("/images/playmats/does-not-exist.png", "#530aae");
    expect(fallback.primaryColor).toMatch(/^#[0-9a-f]{6}$/i);
    expect(fallback.secondaryColor).toMatch(/^#[0-9a-f]{6}$/i);
    // No sleeve, or a different unknown path — same fallback pair either way.
    expect(colorsForPlaymat("/images/playmats/does-not-exist.png", undefined)).toEqual(fallback);
    expect(colorsForPlaymat("/images/playmats/another-unknown.png", "#530aae")).toEqual(fallback);
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
