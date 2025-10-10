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
  const handCards = game
    .listHand()
    .map((gameCard: GameCard, index: number) => {
      const actions = formatHandCardActionsHtmlFragment(game, gameCard, index);
      return formatCardContainer({ gameCard, actions, gameId: game.gameId, whatHappened });
    })
    .join("");

  return `<div id="hand-section" data-testid="hand-section">
        <h3>Hand (${game.listHand().length})</h3>
        <div id="hand-cards" class="hand-cards">
          ${handCards}
        </div>
      </div>`;
}
