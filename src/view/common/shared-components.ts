import { getCardImageUrl } from "../../types.js";
import { GameCard } from "../../GameState.js";

export const CARD_BACK = "/mtg-card-back.jpg";

export function formatCardNameAsGathererLink(card: { name: string; multiverseid: number }): string {
  return `<a href="https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=${card.multiverseid}" target="_blank" class="card-name-link" onclick="event.stopPropagation()">${card.name}</a>`;
}

export function formatCommanderImageHtmlFragment(commanders: any[]): string {
  return commanders.length == 0
    ? `<div class="commander-placeholder">No Commander</div>`
    : `<div id="command-zone">
          ${commanders
            .map((commander) => `<img src="${getCardImageUrl(commander.scryfallId, "small")}" alt="${commander.name}" class="mtg-card-image commander-image" />`)
            .join("")}
        </div>`;
}

export function formatCardContainerHtmlFragment(gameCard: GameCard, containerType: "revealed" | "hand", actions: string, animationClass = ""): string {
  const imageUrl = getCardImageUrl(gameCard.card.scryfallId, "small");
  const cardClass = containerType === "revealed" ? "revealed-card" : "hand-card";

  return `<div id="card-container-${gameCard.gameCardIndex}" class="${containerType}-card-container">
    <img src="${imageUrl}"
         alt="${gameCard.card.name}"
         class="mtg-card-image ${cardClass}${animationClass}"
         title="${gameCard.card.name}" />
    ${actions}
  </div>`;
}
