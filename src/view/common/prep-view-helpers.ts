import { PersistedGamePrep } from "../../port-persist-prep/types.js";
import { GameCard } from "../../GameState.js";
import { CardDefinition, getCardImageUrl } from "../../types.js";
import { formatCardContainer, formatLibraryCardList, formatCardNameAsModalLink, formatLibraryStack } from "./shared-components.js";

/**
 * Format a card modal for the prep page with navigation support.
 * Similar to formatCardModalHtmlFragment in game-modals.ts but uses prep routes.
 */
export function formatPrepCardModalHtmlFragment(
  cardDef: CardDefinition,
  prepId: number,
  cardIndex: number,
  currentFace: "front" | "back",
  prevCardIndex: number | null,
  nextCardIndex: number | null,
  currentPosition: number,
  totalCardsInZone: number
): string {
  const imageUrl = getCardImageUrl(cardDef.scryfallId, "large", currentFace);
  const gathererUrl =
    cardDef.multiverseid === 0
      ? `https://gatherer.wizards.com/Pages/Search/Default.aspx?name=${encodeURIComponent(`"${cardDef.oracleCardName || cardDef.name}"`)}`
      : `https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=${cardDef.multiverseid}`;

  // Utility buttons (Gatherer, Copy, Flip)
  let utilityButtons = `<div class="card-modal-utility-buttons">
    <a href="${gathererUrl}" target="_blank" class="modal-action-button gatherer-button">See on Gatherer</a>
    <button class="modal-action-button copy-button"
            onclick="copyCardImageToClipboard(event, '${imageUrl}', '${cardDef.name}')">Copy</button>`;

  if (cardDef.twoFaced) {
    const newFace = currentFace === "front" ? "back" : "front";
    utilityButtons += `
    <button class="modal-action-button flip-button"
            hx-get="/prep-card-modal/${prepId}/${cardIndex}?face=${newFace}"
            hx-target="#card-modal-container"
            hx-swap="innerHTML"
            title="Flip card to see other side">Flip</button>`;
  }

  utilityButtons += `</div>`;

  const actionButtons = `<div class="card-modal-actions">
    ${utilityButtons}
  </div>`;

  // Navigation buttons and image with position indicator
  const prevButton = prevCardIndex !== null ? `
    <button class="card-modal-nav-button card-modal-nav-prev"
            hx-get="/prep-card-modal/${prepId}/${prevCardIndex}"
            hx-target="#card-modal-container"
            hx-swap="innerHTML"
            title="Previous card">◀</button>
  ` : '<div class="card-modal-nav-spacer"></div>';

  const nextButton = nextCardIndex !== null ? `
    <button class="card-modal-nav-button card-modal-nav-next"
            hx-get="/prep-card-modal/${prepId}/${nextCardIndex}"
            hx-target="#card-modal-container"
            hx-swap="innerHTML"
            title="Next card">▶</button>
  ` : '<div class="card-modal-nav-spacer"></div>';

  const positionIndicator = totalCardsInZone > 1 ? `
    <div class="card-modal-position-indicator">Card ${currentPosition} of ${totalCardsInZone}</div>
  ` : '';

  const bodyContent = `<div class="card-modal-content">
    <div class="card-modal-nav-container">
      ${prevButton}
      <div class="card-modal-image-wrapper">
        <div class="card-modal-image">
          <img src="${imageUrl}" alt="${cardDef.name}" class="modal-card-image" />
        </div>
        ${positionIndicator}
      </div>
      ${nextButton}
    </div>
    <div class="card-modal-info">
      <h3 class="card-modal-title">${cardDef.name}</h3>
      ${actionButtons}
    </div>
  </div>`;

  return `<div class="card-modal-overlay"
               hx-get="/close-card-modal"
               hx-target="#card-modal-container"
               hx-swap="innerHTML"
               hx-trigger="click[target==this], keyup[key=='Escape'] from:body"
               tabindex="0">
    <div class="card-modal-dialog">
      <button class="card-modal-close"
              hx-get="/close-card-modal"
              hx-target="#card-modal-container"
              hx-swap="innerHTML">&times;</button>
      <div class="card-modal-body">
        ${bodyContent}
      </div>
    </div>
  </div>`;
}

// Prep-specific version of formatCardNameAsModalLink that uses /prep-card-modal route
function formatPrepCardNameAsModalLink(cardName: string, prepId: number, cardIndex: number): string {
  return `<span class="card-name-link clickable-card-name"
               hx-get="/prep-card-modal/${prepId}/${cardIndex}"
               hx-target="#card-modal-container"
               hx-swap="innerHTML"
               style="cursor: pointer;">${cardName}</span>`;
}

// Prep-specific version of formatLibraryCardList that uses /prep-card-modal route
function formatPrepLibraryCardList(libraryCards: readonly GameCard[], prepId: number): string {
  return libraryCards
    .map((gameCard: any) => {
      return `<li class="library-card-item">
            ${formatPrepCardNameAsModalLink(gameCard.card.name, prepId, gameCard.gameCardIndex)}
        </li>`;
    })
    .join("");
}

export function createPrepViewHelpers(prep: PersistedGamePrep) {
  // Convert CardDefinitions to GameCards for rendering
  let gameCardIndex = 0;

  const commanders: GameCard[] = prep.deck.commanders.map((card, position) => ({
    card,
    isCommander: true,
    location: { type: "CommandZone", position } as const,
    gameCardIndex: gameCardIndex++,
    currentFace: "front" as const,
  }));

  const libraryCards: GameCard[] = prep.deck.cards.map((card, position) => ({
    card,
    isCommander: false,
    location: { type: "Library", position } as const,
    gameCardIndex: gameCardIndex++,
    currentFace: "front" as const,
  }));

  // Prep-specific version of formatCardContainer that uses /prep-card-modal route
  function renderPrepCommanderCard(commander: GameCard): string {
    const html = formatCardContainer({ gameCard: commander, gameId: prep.prepId });
    // Replace /card-modal with /prep-card-modal in the generated HTML
    return html.replace(/hx-get="\/card-modal\//g, 'hx-get="/prep-card-modal/');
  }

  // Prep-specific version of command zone that uses /prep-card-modal route
  function renderPrepCommandZone(): string {
    const title = `
      <span class="game-name">${prep.deck.name}</span>
    `;
    return commanders.length === 0
      ? `<div class="commander-placeholder">No Commander</div>`
      : `<div class="cool-command-zone-surround ${commanders.length > 1 ? "two-commanders" : ""}">
          <div class="game-title"><p>${title}</p></div>
          <div class="multiple-cards">
            ${commanders.map((commander) => renderPrepCommanderCard(commander)).join("")}
          </div>
        </div>`;
  }

  return {
    commanders,
    libraryCards,
    renderCommanderCard: renderPrepCommanderCard,
    renderCommandZone: renderPrepCommandZone,
    renderLibraryList: () =>
      formatPrepLibraryCardList(libraryCards, prep.prepId),
    renderLibraryStack: () =>
      formatLibraryStack({}, libraryCards.length),
  };
}
