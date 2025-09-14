import { GameState } from "../../GameState.js";

export function formatGameDetails(game: GameState): string {
  const cardCountInfo = `${game.totalCards} cards`;
  return `<div id="game-details" class="game-details game-not-started">
        <h2><a href="${game.deckProvenance.sourceUrl}" target="_blank">${game.deckName}</a></h2>
        <p>${cardCountInfo}</p>
        <p><strong>Game ID:</strong> ${game.gameId}</p>
        ${game.gameStatus() !== "NotStarted" ? `<p><strong>Status:</strong> ${game.gameStatus()}</p>` : ""}
      </div>`;
}

export function formatModal(title: string, bodyContent: string): string {
  return `<div class="modal-overlay"
               hx-get="/close-modal"
               hx-target="#modal-container"
               hx-swap="innerHTML"
               hx-trigger="click[target==this], keyup[key=='Escape'] from:body"
               tabindex="0">
    <div class="modal-dialog">
      <div class="modal-header">
        <h2 class="modal-title">${title}</h2>
        <button class="modal-close"
                hx-get="/close-modal"
                hx-target="#modal-container"
                hx-swap="innerHTML">&times;</button>
      </div>
      <div class="modal-body">
        ${bodyContent}
      </div>
    </div>
  </div>`;
}
