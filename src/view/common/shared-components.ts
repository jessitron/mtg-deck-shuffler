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
  containerType: "commander" | "revealed" | "hand";
  gameId?: number;
  actions?: string;
  animationClass?: string;
  whatHappened?: WhatHappened;
};

function formatCardContainer({ gameCard, containerType, gameId, actions = "", animationClass = "", whatHappened }: CardRenderOptions): string {
  const finalAnimationClass = animationClass || (whatHappened ? getAnimationClassHelper(whatHappened, gameCard.gameCardIndex) : "");

  const flipButton = gameCard.card.twoFaced && gameId
    ? containerType === "commander"
      ? `<button class="flip-button" hx-post="/flip-commander/${gameId}/${gameCard.gameCardIndex}" hx-swap="outerHTML" hx-target="closest .commander-container">Flip</button>`
      : `<button class="flip-button" hx-post="/flip-card/${gameId}/${gameCard.gameCardIndex}" hx-swap="outerHTML" hx-target="#game-container">Flip</button>`
    : '';

  const containerClass = containerType === "commander"
    ? "commander-container"
    : `${containerType}-card-container`;

  const cardClass = containerType === "commander"
    ? "commander-image"
    : containerType === "revealed"
      ? "revealed-card"
      : "hand-card";

  const containerId = containerType === "commander"
    ? ""
    : ` id="card-container-${gameCard.gameCardIndex}"`;

  if (gameCard.card.twoFaced) {
    const frontImageUrl = getCardImageUrl(gameCard.card.scryfallId, "normal", "front");
    const backImageUrl = getCardImageUrl(gameCard.card.scryfallId, "normal", "back");
    const currentImageUrl = gameCard.currentFace === "front" ? frontImageUrl : backImageUrl;
    const hiddenImageUrl = gameCard.currentFace === "front" ? backImageUrl : frontImageUrl;

    return `<div${containerId} class="${containerClass} two-faced-card-container">
      <img src="${hiddenImageUrl}" alt="${gameCard.card.name} (back face)" class="mtg-card-image ${cardClass} card-face-hidden${finalAnimationClass}" />
      <img src="${currentImageUrl}" alt="${gameCard.card.name}" class="mtg-card-image ${cardClass} card-face-current${finalAnimationClass}"${containerType !== "commander" ? ` title="${gameCard.card.name}"` : ""} />
      ${flipButton}
      ${actions}
    </div>`;
  } else {
    const imageUrl = getCardImageUrl(gameCard.card.scryfallId, "normal", gameCard.currentFace);
    return `<div${containerId} class="${containerClass}">
      <img src="${imageUrl}" alt="${gameCard.card.name}" class="mtg-card-image ${cardClass}${finalAnimationClass}"${containerType !== "commander" ? ` title="${gameCard.card.name}"` : ""} />
      ${flipButton}
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
          ${commanders
            .map((gameCard) => formatSingleCommanderContainer(gameCard, gameId))
            .join("")}
        </div>`;
}

// Function for displaying commanders when we only have CardDefinition objects (deck preview)
export function formatCommanderImageHtmlFragmentFromCards(commanders: any[]): string {
  return commanders.length == 0
    ? `<div class="commander-placeholder">No Commander</div>`
    : `<div id="command-zone">
          ${commanders
            .map(
              (commander) => `<div class="commander-container">
                <img src="${getCardImageUrl(commander.scryfallId, "normal")}" alt="${commander.name}" class="mtg-card-image commander-image" />
              </div>`
            )
            .join("")}
        </div>`;
}

export function formatCardContainerHtmlFragment(gameCard: GameCard, containerType: "revealed" | "hand", actions: string, animationClass = "", gameId?: number): string {
  return formatCardContainer({ gameCard, containerType, gameId, actions, animationClass });
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
