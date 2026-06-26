import { randomUUID } from "crypto";
import { AdvisorChatContext, TrainerReply, TrainerStatus } from "./advisorChat.js";

/**
 * Mint a session id. Prefixed so it is >= 33 chars (the contract's minimum) and
 * easy to spot in the agent's telemetry — see INTERFACE.md → Request.
 */
function newSessionId(): string {
  return `mtg-deck-shuffler-${randomUUID()}`;
}

/**
 * One message in a Trainer conversation. `receivedAt` is epoch ms, stamped by the
 * server when the message is recorded — the client renders it relative ("3 min ago").
 * `status` and `prUrl` are carried on `trainer` messages only (from the agent's
 * `{reply, status, pr_url}`) so the PR link and status survive a page reload.
 */
export interface TrainerMessage {
  role: "you" | "trainer";
  text: string;
  receivedAt: number;
  status?: TrainerStatus;
  prUrl?: string;
}

/**
 * A single Trainer chat session for one game. `sessionId` identifies the session
 * for the whole conversation: it is sent with every agent invocation and put on
 * the current span, and it appears on the `trainer.evaluation` span when the chat
 * ends. `seq` is the 1-based number to send for the NEXT user message (INTERFACE.md
 * v2.0 → Request); it advances per accepted turn and resets to 1 (with a fresh
 * `sessionId`) on a lost session. `context` is the frozen hand snapshot captured at
 * session start; it is re-sent as `state` every turn and never re-read from game
 * state, so the discussion stays anchored to the one hand. Born on startSession,
 * dies on End Chat.
 */
export interface TrainerConversation {
  sessionId: string;
  seq: number;
  context: AdvisorChatContext;
  messages: TrainerMessage[];
}

/**
 * In-memory store of Trainer conversations, keyed by gameId. Conversations are
 * short-lived dev-mode chats; we hold them in memory (this server is single
 * instance) rather than persisting them — consistent with the rest of the app's
 * state living on the backend, but without the SQLite/versioning machinery, since
 * nothing here needs to survive a restart. This is the state that a future
 * single-instance chat server would own.
 */
export class TrainerConversationStore {
  private readonly byGame = new Map<number, TrainerConversation>();

  /**
   * Start a fresh conversation for a game from a hand snapshot, returning it (with
   * a new sessionId). Replaces any existing conversation for the game.
   */
  start(gameId: number, context: AdvisorChatContext): TrainerConversation {
    const conversation: TrainerConversation = { sessionId: newSessionId(), seq: 1, context, messages: [] };
    this.byGame.set(gameId, conversation);
    return conversation;
  }

  /** Whether a conversation exists for this game. */
  has(gameId: number): boolean {
    return this.byGame.has(gameId);
  }

  /** Read the conversation for a game without creating one. */
  get(gameId: number): TrainerConversation | undefined {
    return this.byGame.get(gameId);
  }

  /**
   * Append a developer message and the Trainer's reply, both stamped `now`. The
   * trainer message carries the reply's `status`/`prUrl` so the view can render the
   * status and PR link (and rehydrate them on reload).
   */
  recordExchange(gameId: number, youText: string, trainerReply: TrainerReply, now: number): void {
    const conversation = this.byGame.get(gameId);
    if (!conversation) {
      throw new Error(`No Trainer conversation for game ${gameId}`);
    }
    conversation.messages.push({ role: "you", text: youText, receivedAt: now });
    conversation.messages.push({
      role: "trainer",
      text: trainerReply.reply,
      receivedAt: now,
      status: trainerReply.status,
      prUrl: trainerReply.prUrl,
    });
  }

  /**
   * Advance to the next turn's `seq` after a turn the agent accepted. Called once
   * the reply is in and was not a lost-session error.
   */
  advanceSeq(gameId: number): void {
    const conversation = this.byGame.get(gameId);
    if (conversation) {
      conversation.seq += 1;
    }
  }

  /**
   * Recover from a lost session (INTERFACE.md v2.0 → Response): mint a fresh
   * `sessionId` and reset `seq` to 1, so the next message starts a clean
   * conversation. The frozen `context`/`messages` are kept — `state` is re-sent, so
   * the chat carries on about the same hand.
   */
  resetSession(gameId: number): void {
    const conversation = this.byGame.get(gameId);
    if (conversation) {
      conversation.sessionId = newSessionId();
      conversation.seq = 1;
    }
  }

  /** Remove and return the conversation (End Chat). Undefined if there was none. */
  end(gameId: number): TrainerConversation | undefined {
    const conversation = this.byGame.get(gameId);
    this.byGame.delete(gameId);
    return conversation;
  }
}
