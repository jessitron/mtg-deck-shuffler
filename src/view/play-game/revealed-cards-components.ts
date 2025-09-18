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
  return actions.map((action) => formatCardActionButtonHtmlFragment(action.action, action.endpoint, gameId, cardIndex, action.title, action.cssClass, cardId, currentFace)).join("");
}

function formatRevealedCardActionsHtmlFragment(game: GameState, gameCard: GameCard): string {
  const actions: CardAction[] = [
    { action: "Play", endpoint: "/play-card", title: "Copy image and remove from revealed", cssClass: "play-button" },
    { action: "Put in Hand", endpoint: "/put-in-hand", title: "Move card to hand", cssClass: "put-in-hand-button" },
    { action: "Put on Top", endpoint: "/put-on-top", title: "Move card to top of library", cssClass: "put-on-top-button" },
    { action: "Put on Bottom", endpoint: "/put-on-bottom", title: "Move card to bottom of library", cssClass: "put-on-bottom-button" },
  ];

  return `<div class="card-buttons">
    ${formatCardActionsGroupHtmlFragment(actions, game.gameId, gameCard.gameCardIndex, gameCard.card.scryfallId, gameCard.currentFace)}
  </div>`;
}



export function formatRevealedCardsHtmlFragment(game: GameState, whatHappened: WhatHappened): string {
  const revealedCards = game.listRevealed();

  if (revealedCards.length === 0) return "";

  const revealedCardsArea = revealedCards
    .map((gameCard: any) => {
      const actions = formatRevealedCardActionsHtmlFragment(game, gameCard);
      return formatCardContainer({gameCard, gameId: game.gameId, actions, whatHappened});
    })
    .join("");

  return `<div id="revealed-cards-section" class="revealed-cards-section">
      <h3>Revealed Cards (${revealedCards.length})</h3>
      <div id="revealed-cards-area" class="revealed-cards-area">
        ${revealedCardsArea}
        ${revealedCards.length === 0 ? '<p class="no-revealed-cards">No cards revealed yet</p>' : ""}
      </div>
    </div>`;
}