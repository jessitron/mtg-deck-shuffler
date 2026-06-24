import { GameState } from "../../GameState.js";
import { recommendMulligan } from "../../mulligan/recommendMulligan.js";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** A single chat bubble. `role` drives styling (developer vs advisor agent). */
function formatBubble(role: "you" | "advisor", text: string): string {
  const label = role === "you" ? "You" : "Advisor";
  return `<div class="advisor-chat-bubble advisor-chat-bubble-${role}">
            <span class="advisor-chat-bubble-role">${label}</span>
            <span class="advisor-chat-bubble-text">${escapeHtml(text)}</span>
          </div>`;
}

/**
 * One request/response exchange, returned by POST /mulligan-advisor/chat and
 * appended (hx-swap="beforeend") to #advisor-chat-messages.
 */
export function formatAdvisorChatExchangeHtmlFragment(userMessage: string, assistantMessage: string): string {
  return `${formatBubble("you", userMessage)}${formatBubble("advisor", assistantMessage)}`;
}

/**
 * The Mulligan Advisor chat drawer. Rendered ONCE per full page load (not in the
 * HTMX-swapped #game-container) so the conversation survives game-state swaps.
 * Visibility is gated by body classes (dev-mode + advisor-chat-open) in game.css —
 * see notes/DESIGN-mulligan-advisor.md and the animations feature owner docs.
 */
export function formatAdvisorChatPanel(game: GameState): string {
  const rec = recommendMulligan({
    hand: game.listHand().map((gc) => gc.card),
    commanders: game.listCommanders().map((gc) => gc.card),
    mulligansSoFar: game.getMulliganCount(),
  });

  const intro = `The advisor currently says <strong>${rec.decision === "keep" ? "Keep" : "Mulligan"}</strong> ` +
    `(${Math.round(rec.confidence * 100)}% confident). Tell me how the recommendation could be better.`;

  return `<aside id="advisor-chat" class="advisor-chat" aria-label="Mulligan Advisor chat">
        <div class="advisor-chat-header">
          <span class="advisor-chat-title">Improve the Advisor</span>
          <button type="button" class="advisor-chat-close"
                  onclick="document.body.classList.remove('advisor-chat-open')"
                  aria-label="Close advisor chat">&times;</button>
        </div>
        <div id="advisor-chat-messages" class="advisor-chat-messages">
          <div class="advisor-chat-intro">${intro}</div>
        </div>
        <form class="advisor-chat-form"
              hx-post="/mulligan-advisor/chat/${game.gameId}"
              hx-target="#advisor-chat-messages"
              hx-swap="beforeend"
              hx-on::after-request="this.reset()">
          <input type="text" name="message" class="advisor-chat-input"
                 placeholder="e.g. it ignores my commander's colors" autocomplete="off" required />
          <button type="submit" class="advisor-chat-send">Send</button>
        </form>
      </aside>`;
}
