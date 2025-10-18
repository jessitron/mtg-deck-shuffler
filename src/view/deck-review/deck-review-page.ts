import { GameCard, GameState } from "../../GameState.js";
import { formatCardContainer, formatCardNameAsModalLink, formatCommandZoneHtmlFragment } from "../common/shared-components.js";
import { formatPageWrapper } from "../common/html-layout.js";
import { formatModal } from "./deck-info-components.js";

function formatLibraryCardList(game: GameState): string {
  const libraryCards = game.listLibrary();

  return libraryCards
    .map((gameCard: any) => {
      return `<li class="library-card-item">
          <span class="card-position">${gameCard.location.position + 1}</span>
          <div class="card-info">
            ${formatCardNameAsModalLink(gameCard.card.name, game.gameId, gameCard.gameCardIndex)}
          </div>
        </li>`;
    })
    .join("");
}

export function formatDeckReviewHtmlPage(game: GameState): string {
  const gameContent = formatDeckReviewHtmlSection(game);
  const contentWithModal = `${gameContent}
    <!-- Separate Modal Container for card modals (higher z-index) -->
    <div id="card-modal-container"></div>`;
  return formatPageWrapper(`MTG Game - ${game.deckName}`, contentWithModal);
}

export function formatLibraryModalHtml(game: GameState): string {
  const libraryCards = game.listLibrary();
  const libraryCardList = formatLibraryCardList(game);

  const bodyContent = `<p class="modal-subtitle">
          ${libraryCards.length} cards in library, ordered by position
        </p>
        <ul class="library-search-list">
          ${libraryCardList}
        </ul>`;

  return formatModal("Library Contents", bodyContent);
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
  const libraryCardList = formatLibraryCardList(game);

  return `
  <div id="deck-review-container" class="deck-review-container">
  <div id="game-header" class="game-header">
     <h2>${game.deckName}</h2>
     <p>from <a href="${game.deckProvenance.sourceUrl}" target="_blank">${game.deckProvenance.deckSource}</a></p>
    <p class="game-id">Game ID: ${game.gameId}</p>
    </div>
    ${commanderImageHtml}
    <div id="start-game-buttons" class="deck-actions">
        <form method="post" action="/start-game" class="inline-form">
          <input type="hidden" name="game-id" value="${game.gameId}" />
          <button type="submit" class="start-game-button">Shuffle Up</button>
        </form>
        <form method="post" action="/end-game" class="inline-form">
          <input type="hidden" name="game-id" value="${game.gameId}" />
          <button type="submit">Choose Another Deck</button>
        </form>
      </div>
      <div id="library-section" data-testid="library-section">
        <h3>Library (${game.listLibrary().length})</h3>
        <p class="modal-subtitle">
          ${game.listLibrary().length} cards in library, ordered by position
        </p>
        <ul class="library-search-list">
          ${libraryCardList}
        </ul>
      </div>

      </div>
    </div>`;
}
