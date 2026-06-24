import { context as otelContext, propagation } from "@opentelemetry/api";
import { MulliganInput, MulliganRecommendation } from "./recommendMulligan.js";

/** Everything the improvement agent sees about the current situation. */
export interface AdvisorChatContext {
  input: MulliganInput;
  recommendation: MulliganRecommendation;
}

/**
 * The relay to the Trainer agent, as a port. `askMulliganAdvisorAgent` is the
 * production implementation (an HTTP POST); tests inject a fake. Defining it as a
 * type keeps `MulliganTrainer` decoupled from the transport.
 */
export type AskTrainerAgent = (
  context: AdvisorChatContext | null,
  message: string,
  sessionId: string
) => Promise<string>;

const PLACEHOLDER_REPLY = "Well isn't that special";

/**
 * Relay a developer's chat message to the Trainer — the AgentCore-hosted agent
 * that improves the Advisor (`recommendMulligan`).
 *
 * SESSION MODEL: `context` (the hand snapshot) is provided ONLY on the first
 * message of a conversation; it is `null` on every continuation message. The one
 * hand under discussion is captured once and never re-read from game state. The
 * `sessionId` identifies this Trainer session and is sent on every invocation so
 * the agent can correlate turns (and so its spans share our session id).
 *
 * TRACE CONTEXT: we inject the active W3C trace context (`traceparent`) into the
 * request headers via the OTel propagator, so the agent's HTTP instrumentation
 * continues the same distributed trace.
 *
 * TRANSPORT: POSTs to `TRAINER_AGENT_URL` when set. Until the Trainer is wired up
 * (no URL configured), it returns a fixed placeholder so the chat UI and transport
 * can be exercised without the agent existing yet. See
 * notes/DESIGN-mulligan-advisor.md.
 */
export async function askMulliganAdvisorAgent(
  context: AdvisorChatContext | null,
  message: string,
  sessionId: string
): Promise<string> {
  const url = process.env.TRAINER_AGENT_URL;
  if (!url) {
    return PLACEHOLDER_REPLY;
  }

  const headers: Record<string, string> = { "content-type": "application/json" };
  // Propagate the current trace context to the agent (W3C traceparent/tracestate).
  propagation.inject(otelContext.active(), headers);

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ sessionId, message, context }),
  });
  if (!response.ok) {
    throw new Error(`Trainer agent responded ${response.status}`);
  }
  const data = (await response.json()) as { reply?: string };
  return data.reply ?? PLACEHOLDER_REPLY;
}
