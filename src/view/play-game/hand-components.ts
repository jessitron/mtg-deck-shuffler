import { GameState, GameCard, WhatHappened } from "../../GameState.js";
import { formatCardContainer } from "../common/shared-components.js";

function formatHandCardActionsHtmlFragment(game: GameState, gameCard: GameCard, index: number): string {
  const handSize = game.listHand().length;
  const swapButton =
    index < handSize - 1
      ? `<button class="swap-button"
             hx-post="/swap-with-next/${game.gameId}/${index}"
             hx-target="#game-container"
             hx-swap="outerHTML"
             onclick="event.stopPropagation()"
             title="Swap with next card">
       ↔
     </button>`
      : "";

  return `<div class="hand-card-buttons">
    ${swapButton}
  </div>`;
}

export function formatHandSectionHtmlFragment(game: GameState, whatHappened: WhatHappened): string {
  const handCardsList = game.listHand();
  const handCardsWithDropZones = handCardsList
    .map((gameCard: GameCard, index: number) => {
      const actions = formatHandCardActionsHtmlFragment(game, gameCard, index);
      const cardHtml = formatCardContainer({ gameCard, actions, gameId: game.gameId, whatHappened, draggable: true, handPosition: index });
      // Add a drop zone before the first card
      const dropZoneBefore = index === 0 ? `<div class="hand-drop-zone" data-hand-position="${index}"></div>` : '';
      // Add a drop zone after each card
      const dropZoneAfter = `<div class="hand-drop-zone" data-hand-position="${index + 1}"></div>`;
      return `${dropZoneBefore}${cardHtml}${dropZoneAfter}`;
    })
    .join("");

  return `<div id="hand-section" data-testid="hand-section">
        <h3>Hand (${handCardsList.length})</h3>
        <div id="hand-cards" class="hand-cards">
          ${handCardsWithDropZones}
        </div>
      </div>`;
}
