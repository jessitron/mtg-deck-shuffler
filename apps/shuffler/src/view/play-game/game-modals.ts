import { GameState, GameCard } from "../../GameState.js";
import { formatCardNameAsModalLink, CardAction } from "../common/shared-components.js";
import { GameEvent } from "../../GameEvents.js";
import { formatGameEventHtmlFragment } from "./history-components.js";

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
  const expectedVersion = game.getStateVersion();

  return tableCards
    .map(
      (gameCard: any, index: number) =>
        `<li class="table-card-item">
          <div class="card-info">
            ${formatCardNameAsModalLink(gameCard.card.name, game.gameId, gameCard.gameCardIndex, expectedVersion)}
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

// Helper function to create modal action button with auto-close
function formatModalActionButton(
  action: string,
  endpoint: string,
  gameId: number,
  cardIndex: number,
  expectedVersion: number,
  title: string,
  cssClass = "modal-action-button",
  cardId?: string,
  currentFace?: "front" | "back",
  inTableMode = false
): string {
  // Play and Discard share the "card leaves your hand" behaviors: in solo mode
  // game.js copies the card image to the clipboard (keyed on data attributes);
  // at a table there is no clipboard — the card goes to the tabletop instead.
  const leavesHand = action === "Play" || action === "Discard";
  const cardIdAttr = leavesHand && !inTableMode && cardId ? `data-card-id="${cardId}"` : "";
  const faceAttr = leavesHand && !inTableMode && currentFace ? `data-current-face="${currentFace}"` : "";
  const extraAttrs = [cardIdAttr, faceAttr].filter(Boolean).join(" ");
  const swapAttr = `hx-swap="outerHTML"`;

  // At a table, a failed send returns an error modal retargeted into
  // #modal-container — close it only on success, or the explanation vanishes.
  // The card modal always closes.
  const afterRequest =
    leavesHand && inTableMode
      ? `htmx.ajax('GET', '/close-card-modal', {target: '#card-modal-container', swap: 'innerHTML'}); if (event.detail.successful) htmx.ajax('GET', '/close-modal', {target: '#modal-container', swap: 'innerHTML'})`
      : `htmx.ajax('GET', '/close-card-modal', {target: '#card-modal-container', swap: 'innerHTML'}); htmx.ajax('GET', '/close-modal', {target: '#modal-container', swap: 'innerHTML'})`;

  return `<button class="${cssClass}"
                    hx-post="${endpoint}/${gameId}/${cardIndex}"
                    hx-vals='{"expected-version": ${expectedVersion}}'
                    hx-target="#game-container"
                    ${swapAttr}
                    ${extraAttrs}
                    hx-on::after-request="${afterRequest}"
                    title="${title}">
                 ${action}
               </button>`;
}

// Generate action buttons for cards in hand.
// Solo: Play/Discard copy the card image to the clipboard (the `play-button`
// class is game.js's clipboard hook). At a table: they send the card to the
// tabletop instead (`table-play-button` — game.js shows "Sent to table").
function formatModalCardActionsForHand(gameId: number, gameCard: GameCard, expectedVersion: number, inTableMode: boolean): string {
  const playishClass = inTableMode ? "table-play-button" : "play-button";
  const playTitle = inTableMode ? "Send to the table and remove from hand" : "Copy image and remove from hand";
  const actions: CardAction[] = [
    { action: "Play", endpoint: "/play-card", title: playTitle, cssClass: `modal-action-button ${playishClass}` },
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
        expectedVersion,
        action.title,
        action.cssClass,
        gameCard.card.scryfallId,
        gameCard.currentFace,
        inTableMode
      )
    )
    .join("");
}

// Generate action buttons for revealed cards
function formatModalCardActionsForRevealed(gameId: number, gameCard: GameCard, expectedVersion: number, inTableMode: boolean): string {
  const playishClass = inTableMode ? "table-play-button" : "play-button";
  const playTitle = inTableMode ? "Send to the table and remove from revealed" : "Copy image and remove from revealed";
  const actions: CardAction[] = [
    { action: "Play", endpoint: "/play-card", title: playTitle, cssClass: `modal-action-button ${playishClass}` },
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
        expectedVersion,
        action.title,
        action.cssClass,
        gameCard.card.scryfallId,
        gameCard.currentFace,
        inTableMode
      )
    )
    .join("");
}

// Generate action buttons for cards in library
function formatModalCardActionsForLibrary(gameId: number, gameCard: GameCard, expectedVersion: number): string {
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
        expectedVersion,
        action.title,
        action.cssClass,
        gameCard.card.scryfallId,
        gameCard.currentFace
      )
    )
    .join("");
}

// Generate action buttons for cards on table
function formatModalCardActionsForTable(gameId: number, gameCard: GameCard, expectedVersion: number): string {
  return formatModalActionButton(
    "Return",
    "/reveal-card",
    gameId,
    gameCard.gameCardIndex,
    expectedVersion,
    "Return to revealed cards",
    "modal-action-button",
    gameCard.card.scryfallId,
    gameCard.currentFace
  );
}

// Get location-specific actions based on card location
export function getModalCardActionsByLocation(gameCard: GameCard, gameId: number, expectedVersion: number, inTableMode = false): string {
  switch (gameCard.location.type) {
    case "Hand":
      return formatModalCardActionsForHand(gameId, gameCard, expectedVersion, inTableMode);
    case "Revealed":
      return formatModalCardActionsForRevealed(gameId, gameCard, expectedVersion, inTableMode);
    case "Library":
      return formatModalCardActionsForLibrary(gameId, gameCard, expectedVersion);
    case "Table":
      return formatModalCardActionsForTable(gameId, gameCard, expectedVersion);
    case "CommandZone":
      return ""; // No location-specific actions for commanders
    default:
      return "";
  }
}



/**
 * Send-then-commit's failure face (JES-127): the tabletop didn't take the
 * card, so the action was blocked and the card stays where it was.
 */
export function formatTabletopSendErrorModal(action: string, cardName: string, tableName: string): string {
  return formatModalHtmlFragment(
    "⚠️ The table didn't get the card",
    `<p class="modal-message">Couldn't send <strong>${cardName}</strong> to table "<strong>${tableName}</strong>".</p>
     <p class="modal-message">The ${action} was blocked — the card stays where it was. Check the tabletop and try again.</p>`
  );
}

export function formatLossModalHtmlFragment(): string {
  return formatModalHtmlFragment("☠️ You Lose! ☠️", `<p class="modal-message">You tried to draw from an empty library!</p>`);
}

export function formatStaleStateErrorModal(
  expectedVersion: number,
  currentVersion: number,
  missedEvents: GameEvent[],
  game: GameState
): string {
  const missedEventsHtml = missedEvents.length > 0
    ? `<div style="margin: 1.5rem 0; text-align: left;">
         <h4 style="margin-bottom: 0.5rem; color: #333;">What happened while you were away:</h4>
         <ol class="history-list" style="padding-left: 2rem;">
           ${missedEvents.map((event, index) => `
             <li class="history-item" style="margin-bottom: 0.5rem;">
               <span class="event-number">${expectedVersion + index + 1}.</span>
               ${formatGameEventHtmlFragment(event, game)}
             </li>
           `).join('')}
         </ol>
       </div>`
    : '';

  const bodyContent = `
    <div class="missed-events-modal-content">
    <p>
    Expected version: ${expectedVersion}, Current version: ${currentVersion}
    </p>
    ${missedEventsHtml}
      <button onclick="location.reload()"
              class="modal-action-button recover-button">
        Refresh Page
      </button>
    </div>
  `;

  return formatModalHtmlFragment("⚠️ Game State Changed", bodyContent);
}
