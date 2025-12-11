import { GameState, GameCard, WhatHappened } from "../../GameState.js";
import { formatCardContainer } from "../common/shared-components.js";

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

  return `<div id="hand-section" data-testid="hand-section">
        <div id="hand-cards" class="hand-cards">
          <div class="hand-symbol">
            <div class="hand-count">${handCardsList.length}</div>
            <img src="/hand.png" alt="Hand" />
          </div>
          ${handCardsWithDropZones}
        </div>
      </div>`;
}
