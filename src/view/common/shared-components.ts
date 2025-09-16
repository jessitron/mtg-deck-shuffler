import { getCardImageUrl } from "../../types.js";
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
  return `<div class="commander-container">
    <img src="${getCardImageUrl(gameCard.card.scryfallId, "normal", gameCard.currentFace)}" alt="${gameCard.card.name}" class="mtg-card-image commander-image" />
    ${gameCard.card.twoFaced && gameId ? `<button class="flip-button" onclick="flipCardWithAnimation(this, '/flip-commander/${gameId}/${gameCard.gameCardIndex}', 'closest .commander-container')">Flip</button>` : ''}
  </div>`;
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
  const imageUrl = getCardImageUrl(gameCard.card.scryfallId, "normal", gameCard.currentFace);
  const cardClass = containerType === "revealed" ? "revealed-card" : "hand-card";

  const flipButton = gameCard.card.twoFaced && gameId
    ? `<button class="flip-button"
         onclick="flipCardWithAnimation(this, '/flip-card/${gameId}/${gameCard.gameCardIndex}', '#game-container')"
         >Flip</button>`
    : '';

  return `<div id="card-container-${gameCard.gameCardIndex}" class="${containerType}-card-container">
    <img src="${imageUrl}"
         alt="${gameCard.card.name}"
         class="mtg-card-image ${cardClass}${animationClass}"
         title="${gameCard.card.name}" />
    ${flipButton}
    ${actions}
  </div>`;
}

// Function for generating a single commander container after a flip
export function formatCommanderContainerHtmlFragment(gameCard: GameCard, gameId: number): string {
  return formatSingleCommanderContainer(gameCard, gameId);
}
