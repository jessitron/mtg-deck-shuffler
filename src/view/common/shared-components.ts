import { getCardImageUrl } from "../../types.js";
import { GameCard, GameState, WhatHappened } from "../../GameState.js";

export const CARD_BACK = "/mtg-card-back.jpg";

const app_title = "MTG Deck Shuffler";

export function formatTitleHtmlFragment(): string {
  return `<div class="title-container">
      <a href="/"><h1 class="homepage-title">${app_title}</h1></a>
      </div>`;
}

export function formatCardNameAsModalLink(cardName: string, gameId: number, cardIndex: number): string {
  return `<span class="card-name-link clickable-card-name"
               hx-get="/card-modal/${gameId}/${cardIndex}"
               hx-target="#card-modal-container"
               hx-swap="innerHTML"
               style="cursor: pointer;">${cardName}</span>`;
}

type CardRenderOptions = {
  gameCard: GameCard;
  gameId: number;
  actions?: string;
  whatHappened?: WhatHappened;
  draggable?: boolean;
  handPosition?: number;
};

export function formatCardContainer({ gameCard, gameId, actions = "", whatHappened, draggable = false, handPosition }: CardRenderOptions): string {
  const finalAnimationClass = whatHappened ? getAnimationClassHelper(whatHappened, gameCard.gameCardIndex) : "";

  const cardId = `card-${gameCard.gameCardIndex}`;
  // TODO: always reload only the card container

  const draggableAttr = draggable ? 'draggable="true"' : "";
  const handPositionAttr = handPosition !== undefined ? `data-hand-position="${handPosition}"` : "";

  if (gameCard.card.twoFaced) {
    if (gameId === undefined) {
      // TODO: make required everywhere
      throw new Error("Game ID is required for two-faced cards");
    }
    return `<div id="${cardId}-container" class="card-container clickable-card ${finalAnimationClass}"
                 ${draggableAttr}
                 ${handPositionAttr}
                 hx-get="/card-modal/${gameId}/${gameCard.gameCardIndex}"
                 hx-target="#card-modal-container"
                 hx-swap="innerHTML"
                 style="cursor: pointer;">
      ${formatFlippingContainer(gameCard, gameId)}
      ${actions}
    </div>`;
  } else {
    const imageUrl = getCardImageUrl(gameCard.card.scryfallId, "normal", gameCard.currentFace);
    return `<div id="${cardId}-container" class="card-container clickable-card ${finalAnimationClass}"
                 ${draggableAttr}
                 ${handPositionAttr}
                 hx-get="/card-modal/${gameId}/${gameCard.gameCardIndex}"
                 hx-target="#card-modal-container"
                 hx-swap="innerHTML"
                 style="cursor: pointer;">
      <img id="${cardId}-face" src="${imageUrl}" alt="${gameCard.card.name}" class="mtg-card-image" title="${gameCard.card.name}" />
      ${actions}
    </div>`;
  }
}

export function formatFlippingContainer(gameCard: GameCard, gameId: number): string {
  const frontImageUrl = getCardImageUrl(gameCard.card.scryfallId, "normal", "front");
  const backImageUrl = getCardImageUrl(gameCard.card.scryfallId, "normal", "back");
  const flippedClass = gameCard.currentFace === "back" ? " card-flipped" : "";

  const cardId = `card-${gameCard.gameCardIndex}`;
  const flipContainerId = `${cardId}-outer-flip-container`;

  const flipButton = `<button class="flip-button" id="${cardId}-flip-button" hx-post="/flip-card/${gameId}/${gameCard.gameCardIndex}" hx-swap="outerHTML" hx-target="#${flipContainerId}-with-button" onclick="event.stopPropagation()">Flip</button>`;

  return `<div id="${flipContainerId}-with-button" class="flip-container-with-button">
            <div id="${flipContainerId}" class=" flip-container-outer${flippedClass}">
              <div id="${cardId}-inner-flip-container" class="flip-container-inner">
                <img id="${cardId}-back-face" src="${backImageUrl}" alt="${gameCard.card.name} (back face)" class="mtg-card-image two-sided-back${flippedClass}" />
                <img id="${cardId}-front-face" src="${frontImageUrl}" alt="${gameCard.card.name}" class="mtg-card-image two-sided-front" title="${gameCard.card.name}" />
             </div>
            </div>
           ${flipButton}
          </div>`;
}

export function formatLibraryCardList(libraryCards: readonly GameCard[], gameId: number): string {
  return libraryCards
    .map((gameCard: any) => {
      return `<li class="library-card-item">  
            ${formatCardNameAsModalLink(gameCard.card.name, gameId, gameCard.gameCardIndex)}
        </li>`;
    })
    .join("");
}

// Function for displaying commanders when we have GameCard objects (in active game)
export function formatCommandZoneHtmlFragment(game: GameState): string {
  const title = `
      <span class="game-name">${game.deckName}</span> <a href="${game.deckProvenance.sourceUrl}" target="_blank">↗</a>
`;
  const commanders = game.listCommanders();
  const gameId = game.gameId;
  return commanders.length == 0
    ? `<div class="commander-placeholder">No Commander</div>`
    : `<div id="command-zone">
    <div class="cool-command-zone-surround ${commanders.length > 1 ? "two-commanders" : ""}">
        <div class="game-title"><p>${title}</p></div>
      <div class="multiple-cards">
        ${commanders.map((gameCard) => formatCardContainer({ gameCard, gameId })).join("")}
      </div>
      </div>
    </div>`;
}

export function getAnimationClassHelper(whatHappened: WhatHappened, gameCardIndex: number): string {
  if (whatHappened.movedLeft && whatHappened.movedLeft.some((card) => card.gameCardIndex === gameCardIndex)) {
    return " card-moved-left";
  } else if (whatHappened.movedRight && whatHappened.movedRight.some((card) => card.gameCardIndex === gameCardIndex)) {
    return " card-moved-right";
  }
  if (whatHappened.dropppedFromLeft && whatHappened.dropppedFromLeft.gameCardIndex === gameCardIndex) {
    return " dropped-from-left";
  } else if (whatHappened.dropppedFromRight && whatHappened.dropppedFromRight.gameCardIndex === gameCardIndex) {
    return " dropped-from-right";
  }
  return "";
}

export function formatLibraryStack(whatHappened: WhatHappened = {}, cardCount: number): string {
  const shufflingClass = whatHappened.shuffling ? " shuffling" : "";
  const emptyClass = cardCount === 0 ? " library-stack-empty" : "";

  return `<div class="library-stack${shufflingClass}${emptyClass}" data-testid="library-stack">
          <img src="${CARD_BACK}" alt="Library" class="mtg-card-image library-card-back library-card-1" data-testid="card-back" title="${cardCount} cards"/>
          <img src="${CARD_BACK}" alt="Library" class="mtg-card-image library-card-back library-card-2" data-testid="card-back" />
          <img src="${CARD_BACK}" alt="Library" class="mtg-card-image library-card-back library-card-3" data-testid="card-back"/>
        </div>`;
}

export type CardAction = {
  action: string;
  endpoint: string;
  title: string;
  cssClass?: string;
};
