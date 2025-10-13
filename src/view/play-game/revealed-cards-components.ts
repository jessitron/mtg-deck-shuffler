import { GameState, GameCard, WhatHappened } from "../../GameState.js";
import { CardAction, formatCardActionsGroupHtmlFragment, formatCardContainer } from "../common/shared-components.js";

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

const magicCardWidth = 200;
const revealCardsGap = 10;
const cardWidth = magicCardWidth + revealCardsGap;

export function formatRevealedCardsHtmlFragment(game: GameState, whatHappened: WhatHappened): string {
  const revealedCards = game.listRevealed();

  if (revealedCards.length === 0) return "";

  const revealedCardsArea = revealedCards
    .map((gameCard: any) => {
      const actions = formatRevealedCardActionsHtmlFragment(game, gameCard);
      return formatCardContainer({ gameCard, gameId: game.gameId, actions, whatHappened });
    })
    .join("");

  const widthToShowAllCards = revealedCards.length * cardWidth;

  return `<div id="revealed-cards-section" class="revealed-cards-section" style="min-width: ${widthToShowAllCards}px;">
      <h3>Revealed Cards (${revealedCards.length})</h3>
      <div id="revealed-cards-area" class="revealed-cards-area">
        ${revealedCardsArea}
        ${revealedCards.length === 0 ? '<p class="no-revealed-cards">No cards revealed yet</p>' : ""}
      </div>
    </div>`;
}
