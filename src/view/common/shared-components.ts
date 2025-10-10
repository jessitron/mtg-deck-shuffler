import { getCardImageUrl } from "../../types.js";
import { GameCard, WhatHappened } from "../../GameState.js";

export const CARD_BACK = "/mtg-card-back.jpg";

export function formatCardNameAsGathererLink(card: { name: string; multiverseid: number; oracleCardName?: string }): string {
  if (card.multiverseid === 0) {
    const searchName = card.oracleCardName || card.name;
    const encodedSearchName = encodeURIComponent(`"${searchName}"`);
    return `<a href="https://gatherer.wizards.com/Pages/Search/Default.aspx?name=${encodedSearchName}" target="_blank" class="card-name-link" onclick="event.stopPropagation()">${card.name}</a>`;
  }
  return `<a href="https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=${card.multiverseid}" target="_blank" class="card-name-link" onclick="event.stopPropagation()">${card.name}</a>`;
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
  gameId: number; // TODO: not optional (although it's only used for two-faced cards)
  actions?: string;
  whatHappened?: WhatHappened;
};

export function formatCardContainer({ gameCard, gameId, actions = "", whatHappened }: CardRenderOptions): string {
  const finalAnimationClass = whatHappened ? getAnimationClassHelper(whatHappened, gameCard.gameCardIndex) : "";

  const cardId = `card-${gameCard.gameCardIndex}`;
  // TODO: always reload only the card container

  if (gameCard.card.twoFaced) {
    if (gameId === undefined) {
      // TODO: make required everywhere
      throw new Error("Game ID is required for two-faced cards");
    }
    return `<div id="${cardId}-container" class="card-container clickable-card"
                 hx-get="/card-modal/${gameId}/${gameCard.gameCardIndex}"
                 hx-target="#card-modal-container"
                 hx-swap="innerHTML"
                 style="cursor: pointer;">
      ${formatFlippingContainer(gameCard, gameId)}
      ${actions}
    </div>`;
  } else {
    const imageUrl = getCardImageUrl(gameCard.card.scryfallId, "normal", gameCard.currentFace);
    return `<div id="${cardId}-container" class="card-container clickable-card"
                 hx-get="/card-modal/${gameId}/${gameCard.gameCardIndex}"
                 hx-target="#card-modal-container"
                 hx-swap="innerHTML"
                 style="cursor: pointer;">
      <img id="${cardId}-face" src="${imageUrl}" alt="${gameCard.card.name}" class="mtg-card-image ${finalAnimationClass}" title="${gameCard.card.name}" />
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

function formatSingleCommanderContainer(gameCard: GameCard, gameId: number): string {
  return formatCardContainer({ gameCard, gameId });
}

// Function for displaying commanders when we have GameCard objects (in active game)
export function formatCommanderImageHtmlFragment(commanders: readonly GameCard[], gameId: number): string {
  return commanders.length == 0
    ? `<div class="commander-placeholder">No Commander</div>`
    : `<div id="command-zone">
          ${commanders.map((gameCard) => formatSingleCommanderContainer(gameCard, gameId)).join("")}
        </div>`;
}

// Function for displaying commanders when we only have CardDefinition objects (deck preview)
export function formatCommanderImageHtmlFragmentFromCards(commanders: any[], gameId: number): string {
  return commanders.length == 0
    ? `<div class="commander-placeholder">No Commander</div>`
    : `<div id="command-zone">
          ${commanders
            .map((commander) => {
              // Convert CardDefinition to GameCard format for consistent rendering
              const gameCard = {
                card: commander,
                location: { type: "CommandZone" as const, position: 0 },
                gameCardIndex: 0, // Not used for preview
                isCommander: true,
                currentFace: "front" as const,
              };
              return formatCardContainer({ gameCard, gameId });
            })
            .join("")}
        </div>`;
}

export function getAnimationClassHelper(whatHappened: WhatHappened, gameCardIndex: number): string {
  if (whatHappened.movedLeft && whatHappened.movedLeft.some((card) => card.gameCardIndex === gameCardIndex)) {
    return " card-moved-left";
  } else if (whatHappened.movedRight && whatHappened.movedRight.some((card) => card.gameCardIndex === gameCardIndex)) {
    return " card-moved-right";
  }
  return "";
}

export function formatLibraryStack(whatHappened: WhatHappened = {}): string {
  const shufflingClass = whatHappened.shuffling ? " shuffling" : "";

  return `<div class="library-stack${shufflingClass}" data-testid="library-stack">
          <img src="${CARD_BACK}" alt="Library" class="mtg-card-image library-card-back library-card-1" data-testid="card-back" />
          <img src="${CARD_BACK}" alt="Library" class="mtg-card-image library-card-back library-card-2" data-testid="card-back" />
          <img src="${CARD_BACK}" alt="Library" class="mtg-card-image library-card-back library-card-3" data-testid="card-back" />
        </div>`;
}

export type CardAction = {
  action: string;
  endpoint: string;
  title: string;
  cssClass?: string;
};
