import { GameState, GameCard } from "../../GameState.js";
import { PersistedGameState } from "../../port-persist-state/types.js";
import { formatCardNameAsGathererLink, formatCardNameAsModalLink, CardAction, formatLibraryCardList } from "../common/shared-components.js";
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
            ${formatCardNameAsModalLink(gameCard.card.name, game.gameId, gameCard.gameCardIndex)}
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

export function formatLibraryModalHtml(game: GameState): string {
  const libraryCards = game.listLibrary();
  const libraryCardList = formatLibraryCardList(game.listLibrary(), game.gameId);

  const bodyContent = `<p class="modal-subtitle">
          ${libraryCards.length} cards
        </p>
        <ul class="library-search-list">
          ${libraryCardList}
        </ul>`;

  return formatModalHtmlFragment("Library Contents", bodyContent);
}

// Helper function to create modal action button with auto-close
function formatModalActionButton(
  action: string,
  endpoint: string,
  gameId: number,
  cardIndex: number,
  title: string,
  cssClass = "modal-action-button",
  cardId?: string,
  currentFace?: "front" | "back"
): string {
  const cardIdAttr = action === "Play" && cardId ? `data-card-id="${cardId}"` : "";
  const faceAttr = action === "Play" && currentFace ? `data-current-face="${currentFace}"` : "";
  const extraAttrs = [cardIdAttr, faceAttr].filter(Boolean).join(" ");
  const swapAttr = action === "Play" ? `hx-swap="outerHTML swap:1.5s"` : `hx-swap="outerHTML"`;

  return `<button class="${cssClass}"
                    hx-post="${endpoint}/${gameId}/${cardIndex}"
                    hx-target="#game-container"
                    ${swapAttr}
                    ${extraAttrs}
                    hx-on::after-request="htmx.ajax('GET', '/close-card-modal', {target: '#card-modal-container', swap: 'innerHTML'}); htmx.ajax('GET', '/close-modal', {target: '#modal-container', swap: 'innerHTML'})"
                    title="${title}">
                 ${action}
               </button>`;
}

// Generate action buttons for cards in hand
function formatModalCardActionsForHand(gameId: number, gameCard: GameCard): string {
  const actions: CardAction[] = [
    { action: "Play", endpoint: "/play-card", title: "Copy image and remove from hand", cssClass: "modal-action-button play-button" },
    { action: "Put on Top", endpoint: "/put-on-top", title: "Move card to top of library", cssClass: "modal-action-button put-on-top-button" },
    { action: "Put on Bottom", endpoint: "/put-on-bottom", title: "Move card to bottom of library", cssClass: "modal-action-button put-on-bottom-button" },
  ];

  return actions
    .map((action) =>
      formatModalActionButton(
        action.action,
        action.endpoint,
        gameId,
        gameCard.gameCardIndex,
        action.title,
        action.cssClass,
        gameCard.card.scryfallId,
        gameCard.currentFace
      )
    )
    .join("");
}

// Generate action buttons for revealed cards
function formatModalCardActionsForRevealed(gameId: number, gameCard: GameCard): string {
  const actions: CardAction[] = [
    { action: "Play", endpoint: "/play-card", title: "Copy image and remove from revealed", cssClass: "modal-action-button play-button" },
    { action: "Put in Hand", endpoint: "/put-in-hand", title: "Move card to hand", cssClass: "modal-action-button put-in-hand-button" },
    { action: "Put on Top", endpoint: "/put-on-top", title: "Move card to top of library", cssClass: "modal-action-button put-on-top-button" },
    { action: "Put on Bottom", endpoint: "/put-on-bottom", title: "Move card to bottom of library", cssClass: "modal-action-button put-on-bottom-button" },
  ];

  return actions
    .map((action) =>
      formatModalActionButton(
        action.action,
        action.endpoint,
        gameId,
        gameCard.gameCardIndex,
        action.title,
        action.cssClass,
        gameCard.card.scryfallId,
        gameCard.currentFace
      )
    )
    .join("");
}

// Generate action buttons for cards in library
function formatModalCardActionsForLibrary(gameId: number, gameCard: GameCard): string {
  const actions: CardAction[] = [
    { action: "Reveal", endpoint: "/reveal-card", title: "Reveal", cssClass: "modal-action-button" },
    { action: "Put in Hand", endpoint: "/put-in-hand", title: "Put in Hand", cssClass: "modal-action-button secondary" },
  ];

  return actions
    .map((action) =>
      formatModalActionButton(
        action.action,
        action.endpoint,
        gameId,
        gameCard.gameCardIndex,
        action.title,
        action.cssClass,
        gameCard.card.scryfallId,
        gameCard.currentFace
      )
    )
    .join("");
}

// Generate action buttons for cards on table
function formatModalCardActionsForTable(gameId: number, gameCard: GameCard): string {
  return formatModalActionButton(
    "Return",
    "/reveal-card",
    gameId,
    gameCard.gameCardIndex,
    "Return to revealed cards",
    "modal-action-button",
    gameCard.card.scryfallId,
    gameCard.currentFace
  );
}

// Get location-specific actions based on card location
function getModalCardActionsByLocation(gameCard: GameCard, gameId: number): string {
  switch (gameCard.location.type) {
    case "Hand":
      return formatModalCardActionsForHand(gameId, gameCard);
    case "Revealed":
      return formatModalCardActionsForRevealed(gameId, gameCard);
    case "Library":
      return formatModalCardActionsForLibrary(gameId, gameCard);
    case "Table":
      return formatModalCardActionsForTable(gameId, gameCard);
    case "CommandZone":
      return ""; // No location-specific actions for commanders
    default:
      return "";
  }
}

export function formatCardModalHtmlFragment(gameCard: GameCard, gameId: number): string {
  const imageUrl = getCardImageUrl(gameCard.card.scryfallId, "large", gameCard.currentFace);
  const gathererUrl =
    gameCard.card.multiverseid === 0
      ? `https://gatherer.wizards.com/Pages/Search/Default.aspx?name=${encodeURIComponent(`"${gameCard.card.oracleCardName || gameCard.card.name}"`)}`
      : `https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=${gameCard.card.multiverseid}`;

  // Utility buttons (Gatherer, Copy, Flip)
  let utilityButtons = `<div class="card-modal-utility-buttons">
    <a href="${gathererUrl}" target="_blank" class="modal-action-button gatherer-button">See on Gatherer</a>
    <button class="modal-action-button copy-button"
            onclick="copyCardImageToClipboard(event, '${imageUrl}', '${gameCard.card.name}')">Copy</button>`;

  if (gameCard.card.twoFaced) {
    utilityButtons += `
    <button class="modal-action-button flip-button"
            hx-post="/flip-card-modal/${gameId}/${gameCard.gameCardIndex}"
            hx-target="#card-modal-container"
            hx-swap="innerHTML"
            title="Flip card to see other side">Flip</button>`;
  }

  utilityButtons += `</div>`;

  // Location-specific action buttons
  const locationActions = getModalCardActionsByLocation(gameCard, gameId);
  const locationActionsHtml = locationActions ? `<div class="card-modal-location-actions">${locationActions}</div>` : "";

  const actionButtons = `<div class="card-modal-actions">
    ${utilityButtons}
    ${locationActionsHtml}
  </div>`;

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
               hx-get="/close-card-modal"
               hx-target="#card-modal-container"
               hx-swap="innerHTML"
               hx-trigger="click[target==this], keyup[key=='Escape'] from:body"
               tabindex="0">
    <div class="card-modal-dialog">
      <button class="card-modal-close"
              hx-get="/close-card-modal"
              hx-target="#card-modal-container"
              hx-swap="innerHTML">&times;</button>
      <div class="card-modal-body">
        ${bodyContent}
      </div>
    </div>
  </div>`;
}

export function formatLossModalHtmlFragment(): string {
  return formatModalHtmlFragment("☠️ You Lose! ☠️", `<p class="modal-message">You tried to draw from an empty library!</p>`);
}
