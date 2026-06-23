import { CardDefinition } from "../types.js";

export type MulliganDecision = "keep" | "mulligan";

export interface MulliganInput {
  /** The cards currently in hand (the opening hand, post-draw). */
  hand: readonly CardDefinition[];
  /**
   * The commander(s). Carries color identity / strategy hints. Unused by the
   * current heuristic, but part of the contract so heuristics can grow into it.
   */
  commanders: readonly CardDefinition[];
  /** How many mulligans have already been taken (0 = this is the first hand). */
  mulligansSoFar: number;
}

export interface MulliganRecommendation {
  decision: MulliganDecision;
  /** 0..1 — how sure the recommendation is. */
  confidence: number;
  /** Human-readable explanation, shown to the player and to the improvement agent. */
  commentary: string;
}

/**
 * A card counts as a land if any of its faces/parts is a Land. `cardTypes` is
 * the pre-unioned set of all faces' types (see CardDefinition), so this also
 * catches modal double-faced lands without inspecting individual faces.
 */
export function isLand(card: CardDefinition): boolean {
  return card.cardTypes.includes("Land");
}

// The keepable land band for an opening hand. Outside it, recommend a mulligan.
// (The classic rule of thumb: too few lands and you miss land drops; too many
// and the hand has no action.)
const MIN_KEEPABLE_LANDS = 2;
const MAX_KEEPABLE_LANDS = 5;

/**
 * Recommend whether to keep or mulligan an opening hand.
 *
 * This is the deterministic core of the Mulligan Advisor — the function the
 * self-improvement agent grows over time (see notes/DESIGN-mulligan-advisor.md).
 * It currently holds a single heuristic: land count.
 */
export function recommendMulligan(input: MulliganInput): MulliganRecommendation {
  const handSize = input.hand.length;
  const landCount = input.hand.filter(isLand).length;

  const tooFew = landCount < MIN_KEEPABLE_LANDS;
  const tooMany = landCount > MAX_KEEPABLE_LANDS;

  if (tooFew || tooMany) {
    // How far outside the band we are — the extremes (0 lands, all lands) are a
    // clearer mulligan than the borderline (1 land, or one over the top).
    const distance = tooFew ? MIN_KEEPABLE_LANDS - landCount : landCount - MAX_KEEPABLE_LANDS;
    const confidence = distance >= 2 ? 0.9 : 0.6;
    const reason = tooFew
      ? "too few lands — likely to miss land drops"
      : "too many lands — not enough action";
    return {
      decision: "mulligan",
      confidence,
      commentary: `${landCount} lands in a ${handSize}-card hand: ${reason}. Recommend mulligan.`,
    };
  }

  // Inside the band: a workable mana base. 3-4 lands is the sweet spot.
  const isSweetSpot = landCount === 3 || landCount === 4;
  const confidence = isSweetSpot ? 0.9 : 0.6;
  return {
    decision: "keep",
    confidence,
    commentary: `${landCount} lands in a ${handSize}-card hand: a workable mana base. Recommend keep.`,
  };
}
