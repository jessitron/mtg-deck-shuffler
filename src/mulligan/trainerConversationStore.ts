import { randomUUID } from "crypto";

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
 * ends. Born on the first message, dies on End Chat.
 */
export interface TrainerConversation {
  sessionId: string;
  messages: TrainerMessage[];
}

/**
 * In-memory store of Trainer conversations, keyed by gameId. Conversations are
 * short-lived dev-mode chats; we hold them in memory (this server is single
 * instance) rather than persisting them — consistent with the rest of the app's
 * state living on the backend, but without the SQLite/versioning machinery, since
 * nothing here needs to survive a restart.
 */
export class TrainerConversationStore {
  private readonly byGame = new Map<number, TrainerConversation>();

  /**
   * Return the conversation for a game, creating an empty one (with a fresh
   * sessionId) if none exists. `isNew` is true when this call created it — the
   * route uses that to decide whether to snapshot the hand (first message only).
   */
  startOrGet(gameId: number): { conversation: TrainerConversation; isNew: boolean } {
    const existing = this.byGame.get(gameId);
    if (existing) {
      return { conversation: existing, isNew: false };
    }
    const conversation: TrainerConversation = { sessionId: randomUUID(), messages: [] };
    this.byGame.set(gameId, conversation);
    return { conversation, isNew: true };
  }

  /** Read the conversation for a game without creating one. */
  get(gameId: number): TrainerConversation | undefined {
    return this.byGame.get(gameId);
  }

  /** Append a developer message and the Trainer's reply, both stamped `now`. */
  recordExchange(gameId: number, youText: string, trainerText: string, now: number): void {
    const { conversation } = this.startOrGet(gameId);
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
