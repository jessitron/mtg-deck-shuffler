import { AvailableDecks } from "./port-deck-retrieval/types.js";
import { Deck, getCardImageUrl } from "./types.js";
import { GameState } from "./GameState.js";

export function formatChooseDeckHtml(availableDecks: AvailableDecks) {
  const archidektSelectionHtml = formatArchidektInput();

  const localSelectionHtml = formatLocalDeckInput(availableDecks);
  return `<div id="deck-input">
      ${archidektSelectionHtml}
      ${localSelectionHtml}
    </div>`;
}

function formatArchidektInput() {
  return `<div class="deck-input-section">
      <label for="deck-number" class="deck-label">Enter <a href="https://archidekt.com/" target="_blank">Archidekt</a> Deck Number:</label>
      <input type="text" id="deck-number" name="deck-number" value="14669648" placeholder="14669648" class="deck-input" />
      <input type="hidden" name="deck-source" value="archidekt" />
      <button hx-post="/deck" hx-include="closest div" hx-target="#deck-input" class="load-deck-button">Load Deck from Archidekt</button>
   </div>`;
}

function formatLocalDeckInput(availableDecks: AvailableDecks) {
  if (availableDecks.length === 0) {
    return "";
  }

  const options = availableDecks.filter((o) => o.deckSource === "local").map((o) => `<option value="${o.localFile}">${o.description}</option>`);
  return `<div class="deck-input-section">
      <label for="local-deck" class="deck-label">Or choose a pre-loaded deck:</label> 
      <input type="hidden" name="deck-source" value="local" />
      <select id="local-deck" name="local-deck" class="deck-select">${options}</select>
      <button id="load-local-deck" hx-post="/deck" hx-include="closest div" hx-target="#deck-input" class="load-deck-button">Load deck</button>
    </div>`;
}

export function formatDeckHtml(deck: Deck): string {
  const commanderImageHtml =
    deck.commanders.length > 0
      ? deck.commanders.map((commander) => `<img src="${getCardImageUrl(commander.uid)}" alt="${commander.name}" class="commander-image" />`).join("")
      : `<div class="commander-placeholder">No Commander Image</div>`;

  const cardCountInfo = `${deck.totalCards} cards`;

  const retrievedInfo = `Retrieved: ${deck.provenance.retrievedDate.toLocaleString()}`;

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

export function formatGameHtml(game: GameState): string {
  const commanderImageHtml =
    game.commanders.length > 0
      ? game.commanders.map((commander: any) => `<img src="${getCardImageUrl(commander.uid)}" alt="${commander.name}" class="commander-image" />`).join("")
      : `<div class="commander-placeholder">No Commander</div>`;

  const libraryCards = game.getCards().filter((gameCard) => gameCard.location.type === "Library");
  const cardCountInfo = `${game.totalCards} cards`;

  const libraryCardList = libraryCards
    .map(
      (gameCard: any) =>
        `<li><a href="https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=${gameCard.card.multiverseid}" target="_blank">${gameCard.card.name}</a></li>`
    )
    .join("");

  return `<div id="game-state">
        <div class="game-header">
          <div class="commander-info">
            ${commanderImageHtml}
          </div>
          <div class="deck-info-right">
            <h2><a href="game.deckProvenance.sourceUrl" target="_blank">${game.deckProvenance.sourceUrl}</a></h2>
            <p>${cardCountInfo}</p>
            <p><strong>Game ID:</strong> ${game.gameId}</p>
          </div>
        </div>
        
        <div class="game-board">
          <div class="library-section" data-testid="library-section">
            <div class="library-stack" data-testid="library-stack">
              <div class="card-back card-back-1" data-testid="card-back"></div>
              <div class="card-back card-back-2" data-testid="card-back"></div>
              <div class="card-back card-back-3" data-testid="card-back"></div>
            </div>
            <p data-testid="library-label">Library</p>
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
        <input type="hidden" name="deck-id" value="${game.deckId}" />
    </div>`;
}
