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

type CardRenderOptions = {
  gameCard: GameCard;
  containerType: "commander" | "revealed" | "hand"; // TODO: remove this, always reload card container
  gameId?: number;
  actions?: string;
  whatHappened?: WhatHappened;
};

function formatCardContainer({ gameCard, containerType, gameId, actions = "", whatHappened }: CardRenderOptions): string {
  const finalAnimationClass = whatHappened ? getAnimationClassHelper(whatHappened, gameCard.gameCardIndex) : "";

  const cardId = `card-${gameCard.gameCardIndex}`;

  const flipButton =
    containerType === "commander"
      ? `<button class="flip-button" id="${cardId}-flip-button" hx-post="/flip-commander/${gameId}/${gameCard.gameCardIndex}" hx-swap="outerHTML" hx-target="closest .card-container">Flip</button>`
      : `<button class="flip-button" id="${cardId}-flip-button" hx-post="/flip-card/${gameId}/${gameCard.gameCardIndex}" hx-swap="outerHTML" hx-target="#game-container">Flip</button>`;
  // TODO: always reload only the card container

  if (gameCard.card.twoFaced) {
    const frontImageUrl = getCardImageUrl(gameCard.card.scryfallId, "normal", "front");
    const backImageUrl = getCardImageUrl(gameCard.card.scryfallId, "normal", "back");
    const flippedClass = gameCard.currentFace === "back" ? " card-flipped" : "";

    return `<div id="${cardId}-container" class="card-container" >
      <div id="${cardId}-outer-flip-container" class=" flip-container-outer${flippedClass}">
        <div id="${cardId}-inner-flip-container" class="flip-container-inner">
          <img id="${cardId}-back-face" src="${backImageUrl}" alt="${gameCard.card.name} (back face)" class="mtg-card-image two-sided-back${flippedClass}" />
          <img id="${cardId}-front-face" src="${frontImageUrl}" alt="${gameCard.card.name}" class="mtg-card-image two-sided-front" title="${gameCard.card.name}" />
        </div>
      </div>
      ${flipButton}
      ${actions}
    </div>`;
  } else {
    const imageUrl = getCardImageUrl(gameCard.card.scryfallId, "normal", gameCard.currentFace);
    return `<div id="${cardId}-container" class="$card-container">
      <img id="${cardId}-face" src="${imageUrl}" alt="${gameCard.card.name}" class="mtg-card-image ${finalAnimationClass}" title="${gameCard.card.name}" />
      ${actions}
    </div>`;
  }
}

function formatSingleCommanderContainer(gameCard: GameCard, gameId?: number): string {
  return formatCardContainer({ gameCard, containerType: "commander", gameId });
}

// Function for displaying commanders when we have GameCard objects (in active game)
export function formatCommanderImageHtmlFragment(commanders: readonly GameCard[], gameId?: number): string {
  return commanders.length == 0
    ? `<div class="commander-placeholder">No Commander</div>`
    : `<div id="command-zone">
          ${commanders.map((gameCard) => formatSingleCommanderContainer(gameCard, gameId)).join("")}
        </div>`;
}

// Function for displaying commanders when we only have CardDefinition objects (deck preview)
export function formatCommanderImageHtmlFragmentFromCards(commanders: any[]): string {
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
              return formatCardContainer({ gameCard, containerType: "commander" });
            })
            .join("")}
        </div>`;
}

export function formatCardContainerHtmlFragment(gameCard: GameCard, containerType: "revealed" | "hand", actions: string, gameId?: number): string {
  return formatCardContainer({ gameCard, containerType, gameId, actions });
}

export function formatCommanderContainerHtmlFragment(gameCard: GameCard, gameId: number, whatHappened?: WhatHappened): string {
  return formatCardContainer({ gameCard, containerType: "commander", gameId, whatHappened });
}

export function getAnimationClassHelper(whatHappened: WhatHappened, gameCardIndex: number): string {
  if (whatHappened.flipped && whatHappened.flipped.some((card) => card.gameCardIndex === gameCardIndex)) {
    return " card-flipped";
  } else if (whatHappened.movedLeft && whatHappened.movedLeft.some((card) => card.gameCardIndex === gameCardIndex)) {
    return " card-moved-left";
  } else if (whatHappened.movedRight && whatHappened.movedRight.some((card) => card.gameCardIndex === gameCardIndex)) {
    return " card-moved-right";
  }
  return "";
}
