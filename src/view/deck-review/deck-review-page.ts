import { GameCard, GameState } from "../../GameState.js";
import {
  formatCardContainer,
  formatCardNameAsModalLink,
  formatCommandZoneHtmlFragment,
  formatLibraryCardList,
  formatTitleHtmlFragment,
} from "../common/shared-components.js";
import { formatPageWrapper } from "../common/html-layout.js";

export function formatDeckReviewHtmlPage(game: GameState): string {
  const gameContent = formatDeckReviewHtmlSection(game);
  const debugSection = `<div class="debug-section">
      <p class="game-id">Game ID: ${game.gameId} | State Version: ${game.getStateVersion()}</p>
    </div>`;
  const contentWithModal = `
  <div class="page-with-title-container">
    ${formatTitleHtmlFragment()}
    ${gameContent}
    
    <div id="card-modal-container"></div>
  </div>`;
  return formatPageWrapper(`MTG Game - ${game.deckName}`, contentWithModal, debugSection);
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
