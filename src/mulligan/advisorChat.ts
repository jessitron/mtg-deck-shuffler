import { context as otelContext, propagation } from "@opentelemetry/api";
import { MulliganInput, MulliganRecommendation } from "./recommendMulligan.js";

/** Everything the improvement agent sees about the current situation. */
export interface AdvisorChatContext {
  input: MulliganInput;
  recommendation: MulliganRecommendation;
}

/** The Trainer's per-turn status (see INTERFACE.md v1.0 → Response). */
export type TrainerStatus = "chatting" | "coding" | "asking" | "done" | "error";

/**
 * One structured reply from the Trainer — the v1.0 response shape
 * (`{reply, status, pr_url?}`), with `pr_url` renamed to `prUrl` for the app's
 * camelCase convention. `prUrl` appears only once a PR exists.
 */
export interface TrainerReply {
  reply: string;
  status: TrainerStatus;
  prUrl?: string;
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
) => Promise<TrainerReply>;

/**
 * The interface version this app is pinned to — the version of the INTERFACE.md
 * copy at the repo root. Sent on every request so version drift shows up in
 * Honeycomb (a mismatch is a warning, not an error). Bump this only by re-copying
 * a newer INTERFACE.md, never by editing locally — see INTERFACE.md → Versioning.
 */
const INTERFACE_VERSION = "1.0";

/**
 * The call is synchronous and a coding turn can take minutes; the contract
 * requires a read timeout of at least 300s (INTERFACE.md → Timeouts).
 */
const READ_TIMEOUT_MS = 300_000;

/**
 * Returned when no Trainer URL is configured, so the chat UI and transport can be
 * exercised without the agent (local dev, CI). `status: "chatting"` keeps the
 * conversation open.
 */
const PLACEHOLDER_REPLY: TrainerReply = { reply: "Well isn't that special", status: "chatting" };

/**
 * Fold the frozen hand snapshot into the first message's text. The v1.0 wire
 * contract carries only `{message, session_id}` — there is NO `context` field — so
 * the message is the one channel for the hand under discussion. We send it on the
 * first turn only (`context != null`); continuation turns send the bare message,
 * since the agent's session already holds the hand. (If the contract should grow a
 * structured context field, that's a development request against the
 * `small-coding-agent` project, not a local edit — see INTERFACE.md.)
 */
function foldContextIntoMessage(context: AdvisorChatContext | null, message: string): string {
  if (!context) {
    return message;
  }
  const { input, recommendation } = context;
  const hand = input.hand.map((c) => c.name).join(", ");
  const commanders = input.commanders.map((c) => c.name).join(", ");
  const verdict = `${recommendation.decision} (${Math.round(recommendation.confidence * 100)}% confident) — ${recommendation.commentary}`;
  return [
    "I'm discussing one opening hand from the MTG deck shuffler and how the Advisor (recommendMulligan) handled it.",
    `Hand: ${hand}`,
    `Commander(s): ${commanders}`,
    `Mulligans so far: ${input.mulligansSoFar}`,
    `Advisor said: ${verdict}`,
    "",
    message,
  ].join("\n");
}

/**
 * Relay a developer's chat message to the Trainer — the coding agent that improves
 * the Advisor (`recommendMulligan`) by opening PRs against this repo. Implements
 * the v1.0 technical interface (the INTERFACE.md copy at the repo root).
 *
 * SESSION MODEL: `context` (the hand snapshot) is provided ONLY on the first
 * message of a conversation; it is `null` on every continuation message. On the
 * first turn it is folded into the message text (the contract has no context
 * field — see `foldContextIntoMessage`). The `sessionId` is sent on every turn so
 * the agent keeps its microVM warm and its working tree intact across the
 * conversation.
 *
 * WIRE CONTRACT: `POST {message, session_id}` with `Authorization: Bearer <token>`
 * and `X-Trainer-Agent-Interface-Version`, a >= 300s read timeout, and the active
 * W3C trace context injected into the headers so the app, front door, and agent
 * share one Honeycomb trace. Returns `{reply, status, pr_url?}`.
 *
 * TRANSPORT: POSTs to `TRAINER_AGENT_URL` when set (the production Lambda Function
 * URL, or `http://localhost:8080/` for the front-door stub). Token from
 * `TRAINER_AGENT_TOKEN`. Until a URL is configured it returns a fixed placeholder
 * so the chat UI works without the agent. See notes/DESIGN-mulligan-advisor.md and
 * INTERFACE.md.
 */
export async function askMulliganAdvisorAgent(
  context: AdvisorChatContext | null,
  message: string,
  sessionId: string
): Promise<TrainerReply> {
  const url = process.env.TRAINER_AGENT_URL;
  if (!url) {
    return PLACEHOLDER_REPLY;
  }

  const headers: Record<string, string> = {
    "content-type": "application/json",
    authorization: `Bearer ${process.env.TRAINER_AGENT_TOKEN ?? ""}`,
    "x-trainer-agent-interface-version": INTERFACE_VERSION,
  };
  // Propagate the current trace context to the agent (W3C traceparent/tracestate).
  propagation.inject(otelContext.active(), headers);

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ message: foldContextIntoMessage(context, message), session_id: sessionId }),
    signal: AbortSignal.timeout(READ_TIMEOUT_MS),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Trainer agent responded ${response.status}${detail ? `: ${detail}` : ""}`);
  }
  const data = (await response.json()) as { reply?: string; status?: TrainerStatus; pr_url?: string };
  return {
    reply: data.reply ?? "",
    status: data.status ?? "chatting",
    prUrl: data.pr_url,
  };
}
