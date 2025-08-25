import { Deck, getCardImageUrl, Game } from "./deck.js";

export function formatDeckHtml(deck: Deck): string {
  const commanderImageHtml =
    deck.commander && deck.commander.uid
      ? `<img src="${getCardImageUrl(deck.commander.uid)}" alt="${deck.commander.name}" class="commander-image" />`
      : `<div class="commander-placeholder">No Commander Image</div>`;

  const cardCountInfo = `${deck.totalCards} cards`;

  const retrievedInfo = `Retrieved: ${deck.retrievedDate.toLocaleString()}`;

  return `<div id="deck-info">
        <div class="deck-details-layout">
          <div class="commander-section">
            ${commanderImageHtml}
          </div>
          <div class="deck-info-section">
            <h2><a href="https://archidekt.com/decks/${deck.id}" target="_blank">${deck.name}</a></h2>
            <p>${cardCountInfo}</p>
            <p><small>${retrievedInfo}</small></p>
          </div>
        </div>
        <div class="deck-actions">
          <input type="hidden" name="deck-id" value="${deck.id}" />
          <button hx-post="/start-game" class="start-game-button" hx-include="closest div" hx-target="#deck-input">Start Game</button>
          <button onclick="location.reload()">Choose Another Deck</button>
        </div>
    </div>`;
}

export function formatGameHtml(game: Game): string {
  const commanderImageHtml =
    game.deck.commander && game.deck.commander.uid
      ? `<img src="${getCardImageUrl(game.deck.commander.uid)}" alt="${game.deck.commander.name}" class="commander-image" />`
      : `<div class="commander-placeholder">No Commander</div>`;

  const cardCountInfo = `${game.deck.totalCards} cards`;

  const libraryCardList = game.library.cards
    .map((card) => `<li><a href="https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=${card.multiverseid}" target="_blank">${card.name}</a></li>`)
    .join("");

  return `<div id="game-state">
        <div class="game-header">
          <div class="commander-info">
            ${commanderImageHtml}
          </div>
          <div class="deck-info-right">
            <h2><a href="https://archidekt.com/decks/${game.deck.id}" target="_blank">${game.deck.name}</a></h2>
            <p>${cardCountInfo}</p>
            <p><strong>Game ID:</strong> ${game.deck.id}</p>
          </div>
        </div>
        
        <div class="game-board">
          <div class="library-section">
            <div class="library-stack">
              <div class="card-back card-back-1"></div>
              <div class="card-back card-back-2"></div>
              <div class="card-back card-back-3"></div>
            </div>
            <p>Library</p>
          </div>
          
          <div class="revealed-cards-section">
            <h3>Revealed Cards</h3>
            <div class="revealed-cards-area">
              <div class="card-placeholder">Card</div>
              <div class="card-placeholder">Card</div>
            </div>
          </div>
        </div>
        
        <div class="hand-section">
          <h3>Hand</h3>
          <div class="hand-cards">
            <div class="card-placeholder">Card</div>
            <div class="card-placeholder">Card</div>
            <div class="card-placeholder">Card</div>
          </div>
        </div>
        
        <details class="library-details">
          <summary>⏵ View library contents (for testing)</summary>
          <ol class="library-list">
            ${libraryCardList}
          </ol>
        </details>
        
        <div class="game-actions">
          <button hx-post="/end-game" hx-include="closest div" hx-target="#deck-input">End Game</button>
        </div>
        <input type="hidden" name="deck-id" value="${game.deck.id}" />
    </div>`;
}
