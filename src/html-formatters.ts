import { GameState } from "./GameState.js";
import { getCardImageUrl } from "./types.js";
import { CARD_BACK } from "./view/common.js";

function formatCommanderImageHtmlFragment(commanders: any[]): string {
  return commanders.length > 0
    ? commanders
        .map((commander) => `<img src="${getCardImageUrl(commander.scryfallId)}" alt="${commander.name}" class="mtg-card-image commander-image" />`)
        .join("")
    : `<div class="commander-placeholder">No Commander</div>`;
}

function formatGameDetailsHtmlFragment(game: GameState): string {
  const cardCountInfo = `${game.totalCards} cards`;
  return `<div id="game-details">
        <h2><a href="${game.deckProvenance.sourceUrl}" target="_blank">${game.deckName}</a></h2>
        <p>${cardCountInfo}</p>
        <p><strong>Game ID:</strong> ${game.gameId}</p>
        <p><strong>Status:</strong> ${game.gameStatus()}</p>
        <div class="history">
        You've done ${game.gameEvents().length} things so far
        <ol>
        ${game.gameEvents().map((e) => `<li>${e.eventName}</li>`)}
        </ol>
        </div>
      </div>`;
}

function formatGameHeaderHtmlFragment(game: GameState): string {
  const commanderImageHtml = formatCommanderImageHtmlFragment(game.commanders);
  const gameDetailsHtml = formatGameDetailsHtmlFragment(game);

  return `<div id="command-zone">
        ${commanderImageHtml}
      </div>
      ${gameDetailsHtml}`;
}

function formatLibraryStackHtmlFragment(): string {
  return `<div class="library-stack" data-testid="library-stack">
          <img src="${CARD_BACK}" alt="Library" class="mtg-card-image library-card-back library-card-1" data-testid="card-back" />
          <img src="${CARD_BACK}" alt="Library" class="mtg-card-image library-card-back library-card-2" data-testid="card-back" />
          <img src="${CARD_BACK}" alt="Library" class="mtg-card-image library-card-back library-card-3" data-testid="card-back" />
        </div>`;
}

export function formatDeckReviewHtmlSection(game: GameState): string {
  const gameHeaderHtml = formatGameHeaderHtmlFragment(game);
  const libraryStackHtml = formatLibraryStackHtmlFragment();

  return `<div id="game-container">
      ${gameHeaderHtml}

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

      <!-- Modal Container -->
      <div id="modal-container"></div>

      <div id="start-game-buttons" class="deck-actions">
        <input type="hidden" name="game-id" value="${game.gameId}" />
        <button hx-post="/start-game" hx-include="closest div" hx-target="#game-container"    hx-swap="outerHTML" class="start-game-button">Shuffle Up</button>
        <form method="post" action="/end-game" style="display: inline;">
          <input type="hidden" name="game-id" value="${game.gameId}" />
          <button type="submit">Choose Another Deck</button>
        </form>
      </div>
    </div>`;
}