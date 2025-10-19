import { GameState, GameCard, WhatHappened } from "../../GameState.js";
import { formatCardContainer } from "../common/shared-components.js";

export function formatHandSectionHtmlFragment(game: GameState, whatHappened: WhatHappened): string {
  const handCardsList = game.listHand();
  const handCardsWithDropZones = handCardsList
    .map((gameCard: GameCard, index: number) => {
      const cardHtml = formatCardContainer({ gameCard, actions: "", gameId: game.gameId, whatHappened, draggable: true, handPosition: index });
      // Add a drop zone before the first card
      const dropZoneBefore = index === 0 ? `<div class="hand-drop-zone" data-hand-position="${index}"></div>` : "";
      // Add a drop zone after each card
      const dropZoneAfter = `<div class="hand-drop-zone" data-hand-position="${index + 1}"></div>`;
      return `${dropZoneBefore}${cardHtml}${dropZoneAfter}`;
    })
    .join("");

  return `<div id="hand-section" data-testid="hand-section">
        <h4 class="cute-header">Hand</h4>
        <div id="hand-cards" class="hand-cards">
          ${handCardsWithDropZones}
        </div>
      </div>`;
}
