import { GameState, GameCard, WhatHappened } from "../../GameState.js";
import { formatCardContainer } from "../common/shared-components.js";
import { recommendMulligan } from "../../mulligan/recommendMulligan.js";

export function formatHandSectionHtmlFragment(game: GameState, whatHappened: WhatHappened): string {
  const handCardsList = game.listHand();
  const handCardsWithDropZones = handCardsList
    .map((gameCard: GameCard, index: number) => {
      const cardHtml = formatCardContainer({ gameCard, actions: "", gameId: game.gameId, expectedVersion: game.getStateVersion(), whatHappened, draggable: true, handPosition: index });
      // Add a drop zone before the first card
      const dropZoneBefore = index === 0 ? `<div class="hand-drop-zone" data-hand-position="${index}"></div>` : "";
      // Add a drop zone after each card
      const dropZoneAfter = `<div class="hand-drop-zone" data-hand-position="${index + 1}"></div>`;
      return `${dropZoneBefore}${cardHtml}${dropZoneAfter}`;
    })
    .join("");

  const mulliganButtonHtml = formatMulliganButtonHtmlFragment(game);
  const mulliganRecommendationHtml = formatMulliganRecommendationHtmlFragment(game);

  return `<div id="hand-section" data-testid="hand-section">
        ${mulliganButtonHtml}
        ${mulliganRecommendationHtml}
        <div id="hand-cards" class="hand-cards">
          <div class="hand-symbol">
            <div class="hand-count">${handCardsList.length}</div>
            <img src="/images/hand.png" alt="Hand" />
          </div>
          ${handCardsWithDropZones}
        </div>
      </div>`;
}

/**
 * The Mulligan button sits above the hand during the opening-hand acceptance
 * stage. It's gone once the player takes any action other than rearranging
 * their hand (the stage lives in game state — see GameState.isInMulliganStage).
 * Label is "Mulligan" for the first one, then "Mulligan #2", "#3", ...
 */
function formatMulliganButtonHtmlFragment(game: GameState): string {
  if (!game.isInMulliganStage()) {
    return "";
  }

  const count = game.getMulliganCount();
  const label = count === 0 ? "Mulligan" : `Mulligan #${count + 1}`;

  return `<div class="mulligan-row">
          <button class="mulligan-button"
                  hx-post="/mulligan/${game.gameId}"
                  hx-vals='{"expected-version": ${game.getStateVersion()}}'
                  hx-target="#game-container"
                  hx-swap="outerHTML">${label}</button>
        </div>`;
}

/**
 * The Mulligan Advisor's recommendation, shown beside the mulligan button during
 * the opening-hand acceptance stage. Always rendered server-side, but hidden by
 * CSS unless <body class="dev-mode"> — see notes/DESIGN-mulligan-advisor.md. The
 * recommender is a pure heuristic function (src/mulligan/) the agent improves.
 */
function formatMulliganRecommendationHtmlFragment(game: GameState): string {
  if (!game.isInMulliganStage()) {
    return "";
  }

  const rec = recommendMulligan({
    hand: game.listHand().map((gc) => gc.card),
    commanders: game.listCommanders().map((gc) => gc.card),
    mulligansSoFar: game.getMulliganCount(),
  });
  const verdict = rec.decision === "keep" ? "Keep" : "Mulligan";
  const confidencePct = Math.round(rec.confidence * 100);

  return `<div class="mulligan-recommendation" data-testid="mulligan-recommendation">
          <span class="mulligan-recommendation-label">Advisor:</span>
          <span class="mulligan-recommendation-verdict mulligan-recommendation-verdict-${rec.decision}">${verdict}</span>
          <span class="mulligan-recommendation-confidence">${confidencePct}% confident</span>
          <span class="mulligan-recommendation-commentary">${rec.commentary}</span>
          <button type="button" class="mulligan-recommendation-improve"
                  onclick="document.body.classList.add('advisor-chat-open')">Improve this</button>
        </div>`;
}
