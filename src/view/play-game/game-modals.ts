import { GameState, GameCard } from "../../GameState.js";
import { PersistedGameState } from "../../port-persist-state/types.js";
import { formatCardNameAsGathererLink } from "../common/shared-components.js";
import { getCardImageUrl } from "../../types.js";

export function formatModalHtmlFragment(title: string, bodyContent: string): string {
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
                      hx-swap="outerHTML"
                      hx-on::after-request="htmx.ajax('GET', '/close-modal', {target: '#modal-container', swap: 'innerHTML'})">Return</button>
          </div>
        </li>`
    )
    .join("");
}

export function formatTableModalHtmlFragment(game: GameState): string {
  const tableCards = game.listTable();
  const tableCardList = formatTableCardListHtmlFragment(game);

  const bodyContent = `<p class="modal-subtitle">
          ${tableCards.length} cards on table
        </p>
        <ul class="table-search-list">
          ${tableCardList}
        </ul>`;

  return formatModalHtmlFragment("Cards on Table", bodyContent);
}

export function formatCardModalHtmlFragment(gameCard: GameCard, gameId: number): string {
  const imageUrl = getCardImageUrl(gameCard.card.scryfallId, "large", gameCard.currentFace);
  const gathererUrl = gameCard.card.multiverseid === 0
    ? `https://gatherer.wizards.com/Pages/Search/Default.aspx?name=${encodeURIComponent(`"${gameCard.card.oracleCardName || gameCard.card.name}"`)}`
    : `https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=${gameCard.card.multiverseid}`;

  let actionButtons = `<div class="card-modal-actions">
    <a href="${gathererUrl}" target="_blank" class="modal-action-button gatherer-button">See on Gatherer</a>
    <button class="modal-action-button copy-button"
            onclick="copyCardImageToClipboard(event, '${imageUrl}', '${gameCard.card.name}')">Copy</button>`;

  if (gameCard.card.twoFaced) {
    actionButtons += `
    <button class="modal-action-button flip-button"
            hx-post="/flip-card-modal/${gameId}/${gameCard.gameCardIndex}"
            hx-target="#modal-container"
            hx-swap="innerHTML"
            title="Flip card to see other side">Flip</button>`;
  }

  actionButtons += `</div>`;

  const bodyContent = `<div class="card-modal-content">
    <div class="card-modal-image">
      <img src="${imageUrl}" alt="${gameCard.card.name}" class="modal-card-image" />
    </div>
    <div class="card-modal-info">
      <h3 class="card-modal-title">${gameCard.card.name}</h3>
      ${actionButtons}
    </div>
  </div>`;

  return formatFullScreenCardModalHtmlFragment(bodyContent);
}

function formatFullScreenCardModalHtmlFragment(bodyContent: string): string {
  return `<div class="card-modal-overlay"
               hx-get="/close-modal"
               hx-target="#modal-container"
               hx-swap="innerHTML"
               hx-trigger="click[target==this], keyup[key=='Escape'] from:body"
               tabindex="0">
    <div class="card-modal-dialog">
      <button class="card-modal-close"
              hx-get="/close-modal"
              hx-target="#modal-container"
              hx-swap="innerHTML">&times;</button>
      <div class="card-modal-body">
        ${bodyContent}
      </div>
    </div>
  </div>`;
}

