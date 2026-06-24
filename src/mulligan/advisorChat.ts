import { MulliganInput, MulliganRecommendation } from "./recommendMulligan.js";

/** Everything the improvement agent sees about the current situation. */
export interface AdvisorChatContext {
  input: MulliganInput;
  recommendation: MulliganRecommendation;
}

/**
 * Relay a developer's chat message to the Mulligan Advisor improvement agent.
 *
 * SEAM (Phase 3): this is where the AgentCore-hosted coding agent plugs in. That
 * agent receives the recommendation context + the developer's message, may edit
 * `src/mulligan/` and open a PR, and replies with what it did. For now it returns
 * a fixed placeholder so the chat UI and transport can be built and tested end to
 * end without the agent existing yet. See notes/DESIGN-mulligan-advisor.md.
 *
 * Async on purpose: the real relay will be a network call.
 */
export async function askMulliganAdvisorAgent(
  _context: AdvisorChatContext,
  _message: string
): Promise<string> {
  return "Well isn't that special";
}
