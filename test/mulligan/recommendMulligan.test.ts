import { recommendMulligan, isLand, MulliganInput } from "../../src/mulligan/recommendMulligan.js";
import { CardDefinition } from "../../src/types.js";

function card(name: string, cardTypes: string[]): CardDefinition {
  return {
    name,
    scryfallId: name,
    twoFaced: false,
    oracleCardName: name,
    colorIdentity: [],
    set: "test",
    cardTypes,
  };
}

const land = (n = "Island"): CardDefinition => card(n, ["Land"]);
const spell = (n = "Grizzly Bears"): CardDefinition => card(n, ["Creature"]);

/** Build a 7-card hand (by default) with `lands` lands and the rest spells. */
function handWith(lands: number, total = 7): CardDefinition[] {
  const cards: CardDefinition[] = [];
  for (let i = 0; i < lands; i++) cards.push(land(`Land ${i}`));
  for (let i = 0; i < total - lands; i++) cards.push(spell(`Spell ${i}`));
  return cards;
}

function recommend(lands: number, mulligansSoFar = 0) {
  const input: MulliganInput = {
    hand: handWith(lands),
    commanders: [card("Atraxa", ["Legendary", "Creature"])],
    mulligansSoFar,
  };
  return recommendMulligan(input);
}

describe("isLand", () => {
  it("is true for a plain land", () => {
    expect(isLand(land())).toBe(true);
  });

  it("is false for a non-land", () => {
    expect(isLand(spell())).toBe(false);
  });

  it("is true for a modal double-faced card whose cardTypes union includes Land", () => {
    // cardTypes is the pre-unioned set of all faces' types, so an MDFC spell//land
    // carries "Land" and should count as a land for mana purposes.
    const mdfc = card("Spell // Land", ["Creature", "Land"]);
    expect(isLand(mdfc)).toBe(true);
  });
});

describe("recommendMulligan — land-count rule (blessed cases)", () => {
  // The blessed regression suite. The self-improvement agent must keep these green.
  const blessed: { lands: number; decision: "keep" | "mulligan" }[] = [
    { lands: 0, decision: "mulligan" },
    { lands: 1, decision: "mulligan" },
    { lands: 2, decision: "keep" },
    { lands: 3, decision: "keep" },
    { lands: 4, decision: "keep" },
    { lands: 5, decision: "keep" },
    { lands: 6, decision: "mulligan" },
    { lands: 7, decision: "mulligan" },
  ];

  it.each(blessed)("$lands lands -> $decision", ({ lands, decision }) => {
    expect(recommend(lands).decision).toBe(decision);
  });
});

describe("recommendMulligan — confidence", () => {
  it("always returns a confidence in [0, 1]", () => {
    for (let lands = 0; lands <= 7; lands++) {
      const { confidence } = recommend(lands);
      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    }
  });

  it("is more confident about an ideal keep (3-4 lands) than a borderline keep (2 or 5)", () => {
    expect(recommend(3).confidence).toBeGreaterThan(recommend(2).confidence);
    expect(recommend(4).confidence).toBeGreaterThan(recommend(5).confidence);
  });

  it("is more confident mulliganing a zero-land hand than a one-land hand", () => {
    expect(recommend(0).confidence).toBeGreaterThan(recommend(1).confidence);
  });
});

describe("recommendMulligan — commentary", () => {
  it("mentions the land count", () => {
    expect(recommend(4).commentary).toContain("4");
  });
});
