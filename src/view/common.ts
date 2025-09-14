export const CARD_BACK = "/mtg-card-back.jpg";

export function formatCardNameAsGathererLink(card: { name: string; multiverseid?: number }): string {
  if (card.multiverseid) {
    return `<a href="https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=${card.multiverseid}" target="_blank" class="card-name-link" onclick="event.stopPropagation()">${card.name}</a>`;
  } else {
    const encodedCardName = encodeURIComponent(card.name);
    return `<a href="https://gatherer.wizards.com/Pages/Search/Default.aspx?name=${encodedCardName}" target="_blank" class="card-name-link" onclick="event.stopPropagation()">${card.name}</a>`;
  }
}
