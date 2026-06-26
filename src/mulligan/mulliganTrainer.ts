import { trace } from "@opentelemetry/api";
import { TrainerConversationStore, TrainerConversation } from "./trainerConversationStore.js";
import { AdvisorChatContext, AskTrainerAgent, TrainerStatus, askMulliganAdvisorAgent } from "./advisorChat.js";

/** One request/response turn, ready for the view to render. */
export interface TrainerExchange {
  youText: string;
  trainerText: string;
  receivedAt: number;
  status: TrainerStatus;
  prUrl?: string;
}

/** The developer's end-of-chat verdict on the Trainer. `rating` is 1..5 or "na". */
export interface TrainerEvaluation {
  rating: number | "na";
  feedback?: string;
}

/**
 * The Trainer chat as a single module the rest of the app talks to. It owns the
 * conversation lifecycle (in memory), the relay to the AgentCore agent, and the
 * end-of-chat evaluation span.
 *
 * BOUNDARY: this class knows NOTHING about game state, persistence, or the
 * database — the hand snapshot is handed to it at `startSession`. That is the seam
 * along which the chat could later move to its own single-instance service:
 *   - `startSession` is the ONE call that needs game state (only the game server
 *     can build the `context`), so it stays behind the game server.
 *   - `sendMessage` / `endSession` need only the in-memory conversation, so a chat
 *     server could serve them directly — letting the game server scale out while
 *     the chat server stays single-instance to hold these Maps.
 *
 * See notes/DESIGN-mulligan-advisor.md.
 */
export class MulliganTrainer {
  constructor(
    private readonly store: TrainerConversationStore = new TrainerConversationStore(),
    private readonly askAgent: AskTrainerAgent = askMulliganAdvisorAgent,
    private readonly now: () => number = () => Date.now()
  ) {}

  /** Whether a session is already underway for this game. */
  hasSession(gameId: number): boolean {
    return this.store.has(gameId);
  }

  /** Read the conversation (e.g. to rehydrate the drawer on a page load). */
  getConversation(gameId: number): TrainerConversation | undefined {
    return this.store.get(gameId);
  }

  /**
   * Start a session from a hand snapshot. GAME-SERVER side: only the game server
   * can build `context`. Returns the new conversation (carrying its sessionId).
   */
  startSession(gameId: number, context: AdvisorChatContext): TrainerConversation {
    return this.store.start(gameId, context);
  }

  /**
   * Send one chat message within an existing session. CHAT-SERVER side: needs only
   * the in-memory conversation. The frozen snapshot is sent to the agent on the
   * first turn only; later turns send `null`. Throws if no session exists — the
   * caller must `startSession` first.
   */
  async sendMessage(gameId: number, message: string): Promise<TrainerExchange> {
    const conversation = this.store.get(gameId);
    if (!conversation) {
      throw new Error(`No Trainer session for game ${gameId}`);
    }
    // Tag the active request span so turns are filterable by session.
    trace.getActiveSpan()?.setAttribute("trainer.session_id", conversation.sessionId);

    const isFirstTurn = conversation.messages.length === 0;
    const context = isFirstTurn ? conversation.context : null;
    const reply = await this.askAgent(context, message, conversation.sessionId);
    const receivedAt = this.now();
    this.store.recordExchange(gameId, message, reply, receivedAt);
    return { youText: message, trainerText: reply.reply, status: reply.status, prUrl: reply.prUrl, receivedAt };
  }

  /**
   * End the session: emit the `trainer.evaluation` span (carrying the whole
   * conversation + sessionId) and wipe the conversation. Returns the ended
   * conversation, or undefined if there was none.
   */
  endSession(gameId: number, evaluation: TrainerEvaluation): TrainerConversation | undefined {
    const conversation = this.store.get(gameId);
    const isNa = evaluation.rating === "na";

    // The per-turn agent calls are already traced; including the whole conversation
    // here makes the evaluation self-contained.
    const span = trace.getTracer("mtg-deck-shuffler").startSpan("trainer.evaluation");
    span.setAttribute("trainer.session_id", conversation?.sessionId ?? "");
    span.setAttribute("trainer.evaluation.rating_na", isNa);
    if (!isNa) {
      span.setAttribute("trainer.evaluation.rating", evaluation.rating as number);
    }
    if (evaluation.feedback) {
      span.setAttribute("trainer.evaluation.feedback", evaluation.feedback);
    }
    span.setAttribute("trainer.message_count", conversation?.messages.length ?? 0);
    span.setAttribute("trainer.conversation", JSON.stringify(conversation?.messages ?? []));
    span.end();
    // Also tag the active request span so the evaluation is findable by session.
    trace.getActiveSpan()?.setAttribute("trainer.session_id", conversation?.sessionId ?? "");

    return this.store.end(gameId);
  }
}
