import { context as otelContext, propagation } from "@opentelemetry/api";
import { MulliganDecision, MulliganInput, MulliganRecommendation } from "./recommendMulligan.js";

/** Everything the improvement agent sees about the current situation. */
export interface AdvisorChatContext {
  input: MulliganInput;
  recommendation: MulliganRecommendation;
}

/**
 * The app-defined game `state` sent to the Trainer fresh on every turn (INTERFACE.md
 * v2.0 → Request). Its shape is OURS — it is described by `trainer-agent/instructions.md`
 * in this repo, not by INTERFACE.md. It is the frozen snapshot of the one hand under
 * discussion: card names (the join key into the code/tests) plus the Advisor's verdict.
 */
export interface TrainerGameState {
  hand: string[];
  commanders: string[];
  mulligansSoFar: number;
  advisorRecommendation: {
    decision: MulliganDecision;
    confidence: number;
    commentary: string;
  };
}

/** The Trainer's per-turn status (see INTERFACE.md v2.0 → Response). */
export type TrainerStatus = "chatting" | "coding" | "asking" | "done" | "error";

/**
 * One structured reply from the Trainer — the v2.0 response shape
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
  message: string,
  sessionId: string,
  seq: number,
  state: TrainerGameState
) => Promise<TrainerReply>;

/**
 * The interface version this app is pinned to — the version of the INTERFACE.md
 * copy in `trainer-agent/`. Sent on every request so version drift shows up in
 * Honeycomb (a mismatch is a warning, not an error). Bump this only by re-copying
 * a newer INTERFACE.md, never by editing locally — see INTERFACE.md → Versioning.
 */
const INTERFACE_VERSION = "2.0";

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
 * Build the `state` payload from the frozen hand snapshot. The shape is defined by
 * this repo's `trainer-agent/instructions.md`; keep the two in sync. Sent fresh on
 * every turn — the agent persists only its own conversation, not our game.
 */
export function buildTrainerState(context: AdvisorChatContext): TrainerGameState {
  const { input, recommendation } = context;
  return {
    hand: input.hand.map((c) => c.name),
    commanders: input.commanders.map((c) => c.name),
    mulligansSoFar: input.mulligansSoFar,
    advisorRecommendation: {
      decision: recommendation.decision,
      confidence: recommendation.confidence,
      commentary: recommendation.commentary,
    },
  };
}

/**
 * Relay a developer's chat message to the Trainer — the coding agent that improves
 * the Advisor (`recommendMulligan`) by opening PRs against this repo. Implements
 * the v2.0 technical interface (the INTERFACE.md copy in `trainer-agent/`).
 *
 * WIRE CONTRACT: `POST {message, session_id, seq, state}` with
 * `Authorization: Bearer <token>` and `X-Trainer-Agent-Interface-Version: 2.0`, a
 * >= 300s read timeout, and the active W3C trace context injected into the headers
 * so the app, front door, and agent share one Honeycomb trace. Returns
 * `{reply, status, pr_url?}`.
 *
 * SESSION MODEL: `sessionId` is sent on every turn so the agent keeps its microVM
 * warm and its working tree intact. `seq` is the 1-based number of this user
 * message in the session; the agent rejects a mismatched `seq` as a lost session
 * (`status: error`). `state` (the frozen hand snapshot) is sent fresh every turn —
 * the agent persists only its own conversation, not our game. The conversation
 * layer (MulliganTrainer) owns seq bookkeeping and lost-session recovery.
 *
 * TRANSPORT: POSTs to `TRAINER_AGENT_URL` when set (the production Lambda Function
 * URL, or `http://localhost:8080/` for the front-door stub). Token from
 * `TRAINER_AGENT_TOKEN`. Until a URL is configured it returns a fixed placeholder
 * so the chat UI works without the agent. See notes/DESIGN-mulligan-advisor.md and
 * INTERFACE.md.
 */
export async function askMulliganAdvisorAgent(
  message: string,
  sessionId: string,
  seq: number,
  state: TrainerGameState
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
    body: JSON.stringify({ message, session_id: sessionId, seq, state }),
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
