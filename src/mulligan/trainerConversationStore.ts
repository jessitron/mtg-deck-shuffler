import { randomUUID } from "crypto";
import { AdvisorChatContext } from "./advisorChat.js";

/**
 * One message in a Trainer conversation. `receivedAt` is epoch ms, stamped by the
 * server when the message is recorded — the client renders it relative ("3 min ago").
 */
export interface TrainerMessage {
  role: "you" | "trainer";
  text: string;
  receivedAt: number;
}

/**
 * A single Trainer chat session for one game. `sessionId` identifies the session
 * for the whole conversation: it is sent with every agent invocation and put on
 * the current span, and it appears on the `trainer.evaluation` span when the chat
 * ends. `context` is the frozen hand snapshot captured at session start — it is
 * sent to the agent on the first turn only and never re-read from game state, so
 * the discussion stays anchored to the one hand. Born on startSession, dies on End
 * Chat.
 */
export interface TrainerConversation {
  sessionId: string;
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
    const conversation: TrainerConversation = { sessionId: randomUUID(), context, messages: [] };
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

  /** Append a developer message and the Trainer's reply, both stamped `now`. */
  recordExchange(gameId: number, youText: string, trainerText: string, now: number): void {
    const conversation = this.byGame.get(gameId);
    if (!conversation) {
      throw new Error(`No Trainer conversation for game ${gameId}`);
    }
    conversation.messages.push({ role: "you", text: youText, receivedAt: now });
    conversation.messages.push({ role: "trainer", text: trainerText, receivedAt: now });
  }

  /** Remove and return the conversation (End Chat). Undefined if there was none. */
  end(gameId: number): TrainerConversation | undefined {
    const conversation = this.byGame.get(gameId);
    this.byGame.delete(gameId);
    return conversation;
  }
}
