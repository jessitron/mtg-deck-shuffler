import { GameState, GameCard, WhatHappened } from "../../GameState.js";
import { formatCardContainer } from "../common/shared-components.js";

type CardAction = {
  action: string;
  endpoint: string;
  title: string;
  cssClass?: string;
};

function formatCardActionButtonHtmlFragment(
  action: string,
  endpoint: string,
  gameId: number,
  cardIndex: number,
  title: string,
  cssClass = "card-action-button",
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
                    title="${title}">
                 ${action}
               </button>`;
}

function formatCardActionsGroupHtmlFragment(actions: CardAction[], gameId: number, cardIndex: number, cardId?: string, currentFace?: "front" | "back"): string {
  return actions
    .map((action) => formatCardActionButtonHtmlFragment(action.action, action.endpoint, gameId, cardIndex, action.title, action.cssClass, cardId, currentFace))
    .join("");
}

function formatHandCardActionsHtmlFragment(game: GameState, gameCard: GameCard, index: number): string {
  const handSize = game.listHand().length;
  const swapButton =
    index < handSize - 1
      ? `<button class="swap-button"
             hx-post="/swap-with-next/${game.gameId}/${index}"
             hx-target="#game-container"
             hx-swap="outerHTML"
             title="Swap with next card">
       ↔
     </button>`
      : "";

  const actions: CardAction[] = [
    { action: "Play", endpoint: "/play-card", title: "Copy image and remove from hand", cssClass: "play-button" },
    { action: "Put down", endpoint: "/put-down", title: "Move card to revealed", cssClass: "put-down-button" },
  ];

  return `<div class="hand-card-buttons">
    ${formatCardActionsGroupHtmlFragment(actions, game.gameId, gameCard.gameCardIndex, gameCard.card.scryfallId, gameCard.currentFace)}
    ${swapButton}
  </div>`;
}

export function formatHandSectionHtmlFragment(game: GameState, whatHappened: WhatHappened): string {
  const handCards = game
    .listHand()
    .map((gameCard: GameCard, index: number) => {
      const actions = formatHandCardActionsHtmlFragment(game, gameCard, index);
      return formatCardContainer({ gameCard, actions, gameId: game.gameId, whatHappened });
    })
    .join("");

  return `<div id="hand-section" data-testid="hand-section">
        <h3>Hand (${game.listHand().length})</h3>
        <div id="hand-cards" class="hand-cards">
          ${handCards}
        </div>
      </div>`;
}
