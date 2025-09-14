import { getCardImageUrl } from "../../types.js";

export function formatCommanderImage(commanders: any[]): string {
  return commanders.length > 0
    ? commanders
        .map((commander) => `<img src="${getCardImageUrl(commander.scryfallId)}" alt="${commander.name}" class="mtg-card-image commander-image" />`)
        .join("")
    : `<div class="commander-placeholder">No Commander</div>`;
}