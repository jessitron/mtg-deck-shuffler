import { GameState } from "../../GameState.js";
import { recommendMulligan } from "../../mulligan/recommendMulligan.js";
import { TrainerConversation } from "../../mulligan/trainerConversationStore.js";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * A single chat bubble. `role` drives styling: the developer ("you") vs the
 * Trainer — the agent that improves the Advisor function (it is NOT the Advisor;
 * the Advisor is `recommendMulligan`). `receivedAt` (epoch ms) is rendered into a
 * data attribute so the client can show "N minutes ago" for the most recent
 * message and keep it current (see public/trainer-chat.js).
 */
function formatBubble(role: "you" | "trainer", text: string, receivedAt: number): string {
  const label = role === "you" ? "You" : "Trainer";
  return `<div class="advisor-chat-bubble advisor-chat-bubble-${role}" data-received-at="${receivedAt}">
            <span class="advisor-chat-bubble-role">${label}</span>
            <span class="advisor-chat-bubble-text">${escapeHtml(text)}</span>
          </div>`;
}

/**
 * One request/response exchange, returned by POST /mulligan-advisor/chat and
 * appended (hx-swap="beforeend") to #advisor-chat-messages. Both bubbles carry
 * the same `receivedAt`.
 */
export function formatAdvisorChatExchangeHtmlFragment(userMessage: string, trainerMessage: string, receivedAt: number): string {
  return `${formatBubble("you", userMessage, receivedAt)}${formatBubble("trainer", trainerMessage, receivedAt)}`;
}

function mulliganIntro(game: GameState): string {
  const rec = recommendMulligan({
    hand: game.listHand().map((gc) => gc.card),
    commanders: game.listCommanders().map((gc) => gc.card),
    mulligansSoFar: game.getMulliganCount(),
  });
  return `I train the Advisor. On this hand it says <strong>${rec.decision === "keep" ? "Keep" : "Mulligan"}</strong> ` +
    `(${Math.round(rec.confidence * 100)}% confident). How should its recommendation be better?`;
}

/**
 * The inner content of #advisor-chat-messages: the intro line plus any messages
 * already in the conversation. Used both for the initial drawer render (rehydrating
 * a conversation that survived a reload) and to reset the region after End Chat.
 */
export function formatAdvisorChatMessagesInner(game: GameState, conversation?: TrainerConversation): string {
  const intro = `<div class="advisor-chat-intro">${mulliganIntro(game)}</div>`;
  const bubbles = (conversation?.messages ?? [])
    .map((m) => formatBubble(m.role, m.text, m.receivedAt))
    .join("");
  return `${intro}${bubbles}`;
}

/**
 * The Trainer chat drawer. Rendered ONCE per full page load (not in the
 * HTMX-swapped #game-container) so the conversation survives game-state swaps.
 * Conversation state lives in the backend in-memory TrainerConversationStore, so
 * it is rehydrated here on every full page load (it survives reloads too). When a
 * conversation exists the drawer is auto-opened (see active-game-page.ts).
 * Visibility is gated by body classes (dev-mode + advisor-chat-open) in game.css —
 * see notes/DESIGN-mulligan-advisor.md and the animations feature owner docs.
 */
export function formatAdvisorChatPanel(game: GameState, conversation?: TrainerConversation): string {
  const messagesInner = formatAdvisorChatMessagesInner(game, conversation);

  // The outer <aside> animates its width (0 ↔ 380px); the inner wrapper holds a
  // fixed width so the content doesn't reflow while the drawer slides open/closed.
  return `<aside id="advisor-chat" class="advisor-chat" aria-label="Trainer chat">
        <div class="advisor-chat-inner">
          <div class="advisor-chat-header">
            <span class="advisor-chat-title">Improve the Advisor</span>
            <span id="advisor-chat-last-seen" class="advisor-chat-last-seen" aria-live="polite"></span>
            <button type="button" class="advisor-chat-end"
                    hx-get="/mulligan-advisor/end-chat-modal/${game.gameId}"
                    hx-target="#modal-container"
                    hx-swap="innerHTML">End Chat</button>
            <button type="button" class="advisor-chat-close"
                    onclick="document.body.classList.remove('advisor-chat-open')"
                    aria-label="Close advisor chat">&times;</button>
          </div>
          <div id="advisor-chat-messages" class="advisor-chat-messages">
            ${messagesInner}
          </div>
          <form class="advisor-chat-form"
                hx-post="/mulligan-advisor/chat/${game.gameId}"
                hx-target="#advisor-chat-messages"
                hx-swap="beforeend"
                hx-on::after-request="if(event.detail.successful){this.querySelector('.advisor-chat-input').value=''}">
            <input type="text" name="message" class="advisor-chat-input"
                   placeholder="e.g. it ignores my commander's colors" autocomplete="off" required />
            <button type="submit" class="advisor-chat-send">Send</button>
          </form>
        </div>
      </aside>`;
}
