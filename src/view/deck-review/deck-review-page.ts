import { GameState } from "../../GameState.js";
import { CARD_BACK, formatCardNameAsGathererLink, formatCommanderImageHtmlFragment, formatLibraryStack } from "../common/shared-components.js";
import { formatPageWrapper } from "../common/html-layout.js";
import { formatGameDetails, formatModal } from "./deck-info-components.js";

type CardAction = {
  action: string;
  endpoint: string;
  title: string;
  cssClass?: string;
};

function formatCardActionButton(
  action: string,
  endpoint: string,
  gameId: number,
  cardIndex: number,
  title: string,
  cssClass = "card-action-button",
  cardId?: string
): string {
  const extraAttrs = action === "Play" && cardId ? `data-card-id="${cardId}"` : "";
  const swapAttr = action === "Play" ? `hx-swap="outerHTML swap:1.5s"` : `hx-swap="outerHTML"`;
  return `<button class="${cssClass}"
                    hx-post="${endpoint}/${gameId}/${cardIndex}"
                    hx-target="#game-container"
                    ${swapAttr}
                    ${extraAttrs}
                    title="${title}">
                 ${action}
               </button>`;
}

function formatCardActionsGroup(actions: CardAction[], gameId: number, cardIndex: number, imageUrl?: string): string {
  return actions.map((action) => formatCardActionButton(action.action, action.endpoint, gameId, cardIndex, action.title, action.cssClass, imageUrl)).join("");
}

function formatLibraryCardActions(game: GameState, gameCard: any): string {
  if (game.gameStatus() !== "Active") return "";

  const actions: CardAction[] = [
    { action: "Reveal", endpoint: "/reveal-card", title: "Reveal" },
    { action: "Put in Hand", endpoint: "/put-in-hand", title: "Put in Hand", cssClass: "card-action-button secondary" },
  ];

  return `<div class="card-actions">
    ${formatCardActionsGroup(actions, game.gameId, gameCard.gameCardIndex)}
  </div>`;
}

function formatLibraryCardList(game: GameState): string {
  const libraryCards = game.listLibrary();

  return libraryCards
    .map((gameCard: any) => {
      const cardActions = formatLibraryCardActions(game, gameCard);
      return `<li class="library-card-item">
          <span class="card-position">${gameCard.location.position + 1}</span>
          <div class="card-info">
            ${formatCardNameAsGathererLink(gameCard.card)}
          </div>
          ${cardActions}
        </li>`;
    })
    .join("");
}

export function formatDeckReviewHtmlPage(game: GameState): string {
  const gameContent = formatDeckReviewHtmlSection(game);
  return formatPageWrapper(`MTG Game - ${game.deckName}`, gameContent);
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

  return `<div id="game-container">
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

      <!-- Modal Container -->
      <div id="modal-container"></div>

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

