import { getCardImageUrl, WhatHappened } from "../../types.js";
import { GameCard } from "../../GameState.js";

export const CARD_BACK = "/mtg-card-back.jpg";

export function formatCardNameAsGathererLink(card: { name: string; multiverseid: number; oracleCardName?: string }): string {
  if (card.multiverseid === 0) {
    const searchName = card.oracleCardName || card.name;
    const encodedSearchName = encodeURIComponent(`"${searchName}"`);
    return `<a href="https://gatherer.wizards.com/Pages/Search/Default.aspx?name=${encodedSearchName}" target="_blank" class="card-name-link" onclick="event.stopPropagation()">${card.name}</a>`;
  }
  return `<a href="https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=${card.multiverseid}" target="_blank" class="card-name-link" onclick="event.stopPropagation()">${card.name}</a>`;
}

// Function for generating a single commander container (shared logic)
function formatSingleCommanderContainer(gameCard: GameCard, gameId?: number): string {
  const flipButton = gameCard.card.twoFaced && gameId
    ? `<button class="flip-button" hx-post="/flip-commander/${gameId}/${gameCard.gameCardIndex}" hx-swap="outerHTML" hx-target="closest .commander-container">Flip</button>`
    : '';

  // For two-faced commanders, show both faces with the non-current face behind and reversed
  if (gameCard.card.twoFaced) {
    const frontImageUrl = getCardImageUrl(gameCard.card.scryfallId, "normal", "front");
    const backImageUrl = getCardImageUrl(gameCard.card.scryfallId, "normal", "back");
    const currentImageUrl = gameCard.currentFace === "front" ? frontImageUrl : backImageUrl;
    const hiddenImageUrl = gameCard.currentFace === "front" ? backImageUrl : frontImageUrl;

    return `<div class="commander-container two-faced-card-container">
      <img src="${hiddenImageUrl}" alt="${gameCard.card.name} (back face)" class="mtg-card-image commander-image card-face-hidden" />
      <img src="${currentImageUrl}" alt="${gameCard.card.name}" class="mtg-card-image commander-image card-face-current" />
      ${flipButton}
    </div>`;
  } else {
    // Single-faced commanders work as before
    return `<div class="commander-container">
      <img src="${getCardImageUrl(gameCard.card.scryfallId, "normal", gameCard.currentFace)}" alt="${gameCard.card.name}" class="mtg-card-image commander-image" />
      ${flipButton}
    </div>`;
  }
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
  const frontImageUrl = getCardImageUrl(gameCard.card.scryfallId, "normal", "front");
  const backImageUrl = getCardImageUrl(gameCard.card.scryfallId, "normal", "back");
  const cardClass = containerType === "revealed" ? "revealed-card" : "hand-card";

  const flipButton = gameCard.card.twoFaced && gameId
    ? `<button class="flip-button" hx-post="/flip-card/${gameId}/${gameCard.gameCardIndex}" hx-swap="outerHTML" hx-target="#game-container">Flip</button>`
    : '';

  // For two-faced cards, show both faces with the non-current face behind and reversed
  if (gameCard.card.twoFaced) {
    const currentImageUrl = gameCard.currentFace === "front" ? frontImageUrl : backImageUrl;
    const hiddenImageUrl = gameCard.currentFace === "front" ? backImageUrl : frontImageUrl;

    return `<div id="card-container-${gameCard.gameCardIndex}" class="${containerType}-card-container two-faced-card-container">
      <img src="${hiddenImageUrl}"
           alt="${gameCard.card.name} (back face)"
           class="mtg-card-image ${cardClass} card-face-hidden${animationClass}"
           title="${gameCard.card.name}" />
      <img src="${currentImageUrl}"
           alt="${gameCard.card.name}"
           class="mtg-card-image ${cardClass} card-face-current${animationClass}"
           title="${gameCard.card.name}" />
      ${flipButton}
      ${actions}
    </div>`;
  } else {
    // Single-faced cards work as before
    const imageUrl = getCardImageUrl(gameCard.card.scryfallId, "normal", gameCard.currentFace);
    return `<div id="card-container-${gameCard.gameCardIndex}" class="${containerType}-card-container">
      <img src="${imageUrl}"
           alt="${gameCard.card.name}"
           class="mtg-card-image ${cardClass}${animationClass}"
           title="${gameCard.card.name}" />
      ${flipButton}
      ${actions}
    </div>`;
  }
}

// Function for generating a single commander container after a flip
export function formatCommanderContainerHtmlFragment(gameCard: GameCard, gameId: number, whatHappened?: WhatHappened): string {
  const animationClass = whatHappened ? getAnimationClassHelper(whatHappened, gameCard.gameCardIndex) : "";

  const flipButton = gameCard.card.twoFaced && gameId
    ? `<button class="flip-button" hx-post="/flip-commander/${gameId}/${gameCard.gameCardIndex}" hx-swap="outerHTML" hx-target="closest .commander-container">Flip</button>`
    : '';

  // For two-faced commanders, show both faces with the non-current face behind and reversed
  if (gameCard.card.twoFaced) {
    const frontImageUrl = getCardImageUrl(gameCard.card.scryfallId, "normal", "front");
    const backImageUrl = getCardImageUrl(gameCard.card.scryfallId, "normal", "back");
    const currentImageUrl = gameCard.currentFace === "front" ? frontImageUrl : backImageUrl;
    const hiddenImageUrl = gameCard.currentFace === "front" ? backImageUrl : frontImageUrl;

    return `<div class="commander-container two-faced-card-container">
      <img src="${hiddenImageUrl}" alt="${gameCard.card.name} (back face)" class="mtg-card-image commander-image card-face-hidden${animationClass}" />
      <img src="${currentImageUrl}" alt="${gameCard.card.name}" class="mtg-card-image commander-image card-face-current${animationClass}" />
      ${flipButton}
    </div>`;
  } else {
    // Single-faced commanders work as before
    return `<div class="commander-container">
      <img src="${getCardImageUrl(gameCard.card.scryfallId, "normal", gameCard.currentFace)}" alt="${gameCard.card.name}" class="mtg-card-image commander-image${animationClass}" />
      ${flipButton}
    </div>`;
  }
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
