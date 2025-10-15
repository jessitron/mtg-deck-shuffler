import { GameState } from "../../GameState.js";
import { formatCardNameAsModalLink, formatCommanderImageHtmlFragment, formatLibraryStack } from "../common/shared-components.js";
import { formatPageWrapper } from "../common/html-layout.js";
import { formatGameDetails, formatModal } from "./deck-info-components.js";

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
    <!-- Modal Container -->
    <div id="modal-container"></div>
    <!-- Separate Modal Container for card modals (higher z-index) -->
    <div id="card-modal-container"></div>`;
  return formatPageWrapper(`MTG Game - ${game.deckName}`, contentWithModal, false);
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

function formatDeckReviewHtmlSection(game: GameState): string {
  const commanderImageHtml = formatCommanderImageHtmlFragment(game.listCommanders(), game.gameId);
  const gameDetailsHtml = formatGameDetails(game);
  const libraryStackHtml = formatLibraryStack();

  return `<div id="game-header" class="game-header">
     <h2>${game.deckName}</h2>
     <p>from <a href="${game.deckProvenance.sourceUrl}" target="_blank">${game.deckProvenance.deckSource}</a></p>
    <p class="game-id">Game ID: ${game.gameId}</p>
  </div>
  <div id="game-container">
      ${commanderImageHtml}
      ${gameDetailsHtml}

      <div id="library-section" data-testid="library-section">
        <h3>Library (${game.listLibrary().length})</h3>
        ${libraryStackHtml}
        <div class="library-buttons-single">
          <button class="search-button"
                  hx-get="/library-modal/${game.gameId}"
                  hx-target="#modal-container"
                  hx-swap="innerHTML">Search</button>
        </div>
      </div>

      <div id="start-game-buttons" class="deck-actions">
        <input type="hidden" name="game-id" value="${game.gameId}" />
        <button hx-post="/start-game" hx-include="closest div" hx-target="#game-container"    hx-swap="outerHTML" class="start-game-button">Shuffle Up</button>
        <form method="post" action="/end-game" class="inline-form">
          <input type="hidden" name="game-id" value="${game.gameId}" />
          <button type="submit">Choose Another Deck</button>
        </form>
      </div>
    </div>`;
}
