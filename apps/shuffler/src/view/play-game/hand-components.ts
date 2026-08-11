import { GameState, GameCard, WhatHappened } from "../../GameState.js";
import { formatCardContainer } from "../common/shared-components.js";

export function formatHandSectionHtmlFragment(game: GameState, whatHappened: WhatHappened): string {
  const handCardsList = game.listHand();
  const handCardsWithDropZones = handCardsList
    .map((gameCard: GameCard, index: number) => {
      const cardHtml = formatCardContainer({ gameCard, actions: "", gameId: game.gameId, expectedVersion: game.getStateVersion(), whatHappened, draggable: true, handPosition: index });
      const dropZoneBefore = index === 0 ? `<div class="hand-drop-zone hand-drop-zone-leading" data-hand-position="${index}"></div>` : "";
      // Add a drop zone after each card
      const dropZoneAfter = `<div class="hand-drop-zone" data-hand-position="${index + 1}"></div>`;
      return `${dropZoneBefore}${cardHtml}${dropZoneAfter}`;
    })
    .join("");

  const mulliganButtonHtml = formatMulliganButtonHtmlFragment(game);

  return `<div id="hand-section" data-testid="hand-section">
        ${mulliganButtonHtml}
        <div id="hand-cards" class="hand-cards">
          ${handCardsWithDropZones}
          <div class="hand-symbol" draggable="true">
            <div class="hand-count">${handCardsList.length}</div>
            <img src="/images/hand.png" alt="Hand" />
          </div>
        </div>
      </div>`;
}

function formatMulliganButtonHtmlFragment(game: GameState): string {
  if (!game.isInMulliganStage()) {
    return "";
  }

  const count = game.getMulliganCount();
  const label = count === 0 ? "Mulligan" : `Mulligan #${count + 1}`;

  return `<div class="mulligan-row">
          <button class="mulligan-button pushable-flat pushable-dark pushable-small"
                  hx-post="/mulligan/${game.gameId}"
                  hx-vals='{"expected-version": ${game.getStateVersion()}}'
                  hx-target="#game-container"
                  hx-swap="outerHTML">${label}</button>
        </div>`;
}
