import { GameCard, GameState } from "../../GameState.js";
import {
  formatCardContainer,
  formatCommandZoneHtmlFragment,
  formatLibraryCardList,
  formatTitleHtmlFragment,
} from "../common/shared-components.js";
import { formatPageWrapper } from "../common/html-layout.js";
import { formatDebugSectionHtmlFragment } from "../debug/debug-section.js";

export function formatDeckReviewHtmlPage(game: GameState): string {
  const gameContent = formatDeckReviewHtmlSection(game);
  const debugSection = `<div class="debug-section"
     id="debug-section"
     hx-get="/debug-section/${game.gameId}"
     hx-trigger="game-state-updated from:body"
     hx-swap="innerHTML">
      ${formatDebugSectionHtmlFragment(game.gameId, game.getStateVersion())}
    </div>`;
  const contentWithModal = `
  <div class="page-with-title-container">
    ${formatTitleHtmlFragment()}
    ${gameContent}

    <div id="modal-container"></div>
    <div id="card-modal-container"></div>
  </div>`;
  return formatPageWrapper({
    title: `MTG Game - ${game.deckName}`,
    content: contentWithModal,
    footerContent: debugSection
  });
}

export function formatCommandersHtmlFragment(commanders: readonly GameCard[], gameId: number): string {
  return commanders.length == 0
    ? `<div class="commander-placeholder">No Commander</div>`
    : `<div id="command-zone">
          ${commanders.map((gameCard) => formatCardContainer({ gameCard, gameId })).join("")}
        </div>`;
}

function formatDeckReviewHtmlSection(game: GameState): string {
  const commanderImageHtml = formatCommandZoneHtmlFragment(game);
  const libraryCardList = formatLibraryCardList(game.listLibrary(), game.gameId);

  return `
  <div id="deck-review-container" class="deck-review-container">
    ${commanderImageHtml}
    <div id="start-game-buttons" class="deck-actions">
      <form method="post" action="/start-game" class="inline-form">
        <input type="hidden" name="game-id" value="${game.gameId}" />
        <input type="hidden" name="expected-version" value="${game.getStateVersion()}" />
        <button type="submit" class="start-game-button">Shuffle Up</button>
      </form>
      <form method="post" action="/end-game" class="inline-form">
        <input type="hidden" name="game-id" value="${game.gameId}" />
        <button type="submit" class="back-button">Choose Another Deck</button>
      </form>
    </div>
    <div id="library-list" data-testid="library-section">
      <h4 class="cute-header">Library</h4>
      <div class="cute-header-subtitle">
      ${game.listLibrary().length} cards in library, ordered by position
      </div>
      <ul class="library-search-list">
        ${libraryCardList}
      </ul>
    </div>
  </div>`;
}
