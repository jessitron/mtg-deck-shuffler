import { GameState, GameCard, WhatHappened } from "../../GameState.js";
import { formatCardContainer } from "../common/shared-components.js";

function formatHandCardActionsHtmlFragment(game: GameState, gameCard: GameCard, index: number): string {
  return `<div class="hand-card-buttons">
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
