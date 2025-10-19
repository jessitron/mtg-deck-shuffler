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
  const contentWithModal = `
  <div class="page-with-title-container">
    ${formatTitleHtmlFragment()}
    ${gameContent}
    <div class="debug-section">
      <p class="game-id">Game ID: ${game.gameId}</p>
    </div>
    <div id="card-modal-container"></div>
  </div>`;
  return formatPageWrapper(`MTG Game - ${game.deckName}`, contentWithModal);
}

export function formatCommandersHtmlFragment(commanders: readonly GameCard[], gameId: number): string {
  return commanders.length == 0
    ? `<div class="commander-placeholder">No Commander</div>`
    : `<div id="command-zone">
          ${commanders.map((gameCard) => formatCardContainer({ gameCard, gameId })).join("")}
        </div>`;
}

function formatDeckReviewHtmlSection(game: GameState): string {
  const commanderImageHtml = formatCommandZoneHtmlFragment(game.listCommanders(), game.gameId);
  const libraryCardList = formatLibraryCardList(game.listLibrary(), game.gameId);

  return `
  <div id="deck-review-container" class="deck-review-container">
    <div id="game-header" class="game-header">
      <span class="game-name">${game.deckName}</span> from <a href="${game.deckProvenance.sourceUrl}" target="_blank">${game.deckProvenance.deckSource}</a>
    </div>
    ${commanderImageHtml}
    <div id="start-game-buttons" class="deck-actions">
      <form method="post" action="/start-game" class="inline-form">
        <input type="hidden" name="game-id" value="${game.gameId}" />
        <button type="submit" class="start-game-button">Shuffle Up</button>
      </form>
      <form method="post" action="/end-game" class="inline-form">
        <input type="hidden" name="game-id" value="${game.gameId}" />
        <button type="submit" class="back-button">Choose Another Deck</button>
      </form>
    </div>
    <div id="library-section" data-testid="library-section">
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
