import { MulliganInput, MulliganRecommendation } from "./recommendMulligan.js";

/** Everything the improvement agent sees about the current situation. */
export interface AdvisorChatContext {
  input: MulliganInput;
  recommendation: MulliganRecommendation;
}

/**
 * Relay a developer's chat message to the Trainer — the AgentCore-hosted agent
 * that improves the Advisor (`recommendMulligan`).
 *
 * SESSION MODEL: `context` (the hand snapshot) is provided ONLY on the first
 * message of a conversation; it is `null` on every continuation message. The one
 * hand under discussion is captured once and never re-read from game state. The
 * AgentCore session/VM stays alive for the conversation and holds that snapshot,
 * so continuation turns carry only the developer's text.
 *
 * SEAM (Phase 3): this is where the Trainer plugs in — on a first message, start
 * an AgentCore session seeded with `context`; on continuations, send `message` to
 * the existing session. For now it returns a fixed placeholder so the chat UI and
 * transport can be built and tested without the Trainer existing yet. See
 * notes/DESIGN-mulligan-advisor.md.
 *
 * Async on purpose: the real relay will be a network call.
 */
export async function askMulliganAdvisorAgent(
  _context: AdvisorChatContext | null,
  _message: string
): Promise<string> {
  return "Well isn't that special";
}
