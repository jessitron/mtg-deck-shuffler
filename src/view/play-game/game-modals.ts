import { GameState } from "../../GameState.js";
import { PersistedGameState } from "../../port-persist-state/types.js";
import { formatCardNameAsGathererLink } from "../common/shared-components.js";

function formatModalHtmlFragment(title: string, bodyContent: string): string {
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

function formatTableCardListHtmlFragment(game: GameState): string {
  const tableCards = game.listTable();

  return tableCards
    .map(
      (gameCard: any, index: number) =>
        `<li class="table-card-item">
          <div class="card-info">
            ${formatCardNameAsGathererLink(gameCard.card)}
          </div>
          <div class="card-actions">
              <button class="card-action-button"
                      hx-post="/reveal-card/${game.gameId}/${gameCard.gameCardIndex}"
                      hx-target="#game-container"
                      hx-swap="outerHTML">Return</button>
          </div>
        </li>`
    )
    .join("");
}

export function formatTableModalHtmlFragment(game: GameState): string {
  const tableCards = game.listTable();
  const tableCardList = formatTableCardListHtmlFragment(game);

  const bodyContent = `<p style="margin-bottom: 16px; color: #666; font-size: 0.9rem;">
          ${tableCards.length} cards on table
        </p>
        <ul class="table-search-list">
          ${tableCardList}
        </ul>`;

  return formatModalHtmlFragment("Cards on Table", bodyContent);
}

export function formatDebugStateModalHtmlFragment(persistedGameState: PersistedGameState): string {
  const formattedJson = JSON.stringify(persistedGameState, null, 2);

  const bodyContent = `<div style="background-color: #f5f5f5; padding: 16px; border-radius: 4px; max-height: 60vh; overflow-y: auto;">
          <pre style="margin: 0; font-family: monospace; font-size: 12px; line-height: 1.4; white-space: pre-wrap; word-wrap: break-word;">${formattedJson}</pre>
        </div>
        <div style="margin-top: 16px; padding: 12px; background-color: #e8f4f8; border-radius: 4px; font-size: 0.9rem;">
          <strong>Game ID:</strong> ${persistedGameState.gameId} |
          <strong>Status:</strong> ${persistedGameState.status} |
          <strong>Version:</strong> ${persistedGameState.version}
        </div>`;

  return formatModalHtmlFragment("Debug: Game State (PersistedGameState)", bodyContent);
}
