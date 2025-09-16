import { getCardImageUrl } from "../../types.js";
import { GameCard } from "../../GameState.js";

export const CARD_BACK = "/mtg-card-back.jpg";

export function formatCardNameAsGathererLink(card: { name: string; multiverseid: number }): string {
  return `<a href="https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=${card.multiverseid}" target="_blank" class="card-name-link" onclick="event.stopPropagation()">${card.name}</a>`;
}

// Function for displaying commanders when we have GameCard objects (in active game)
export function formatCommanderImageHtmlFragment(commanders: readonly GameCard[], gameId?: number): string {
  return commanders.length == 0
    ? `<div class="commander-placeholder">No Commander</div>`
    : `<div id="command-zone">
          ${commanders
            .map(
              (gameCard) => `<div class="commander-container">
                <img src="${getCardImageUrl(gameCard.card.scryfallId, "normal", gameCard.currentFace)}" alt="${gameCard.card.name}" class="mtg-card-image commander-image" />
                ${gameCard.card.twoFaced && gameId ? `<button class="flip-button" hx-post="/flip-card/${gameId}/${gameCard.gameCardIndex}" hx-swap="outerHTML" hx-target="closest .commander-container">Flip</button>` : ''}
              </div>`
            )
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
    ? `<button class="flip-button" hx-post="/flip-card/${gameId}/${gameCard.gameCardIndex}" hx-swap="outerHTML" hx-target="#game-container">Flip</button>`
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
