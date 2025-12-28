import { GameCard } from "../../GameState.js";
import { CardDefinition } from "../../types.js";
import { PersistedGamePrep } from "../../port-persist-prep/types.js";
import {
  formatCardContainer,
  formatLibraryCardList,
  formatTitleHtmlFragment,
} from "../common/shared-components.js";
import { formatPageWrapper } from "../common/html-layout.js";

export function formatDeckReviewHtmlPage(prep: PersistedGamePrep): string {
  const gameContent = formatDeckReviewHtmlSection(prep);
  const contentWithModal = `
  <div class="page-with-title-container">
    ${formatTitleHtmlFragment()}
    ${gameContent}

    <div id="modal-container"></div>
    <div id="card-modal-container"></div>
  </div>`;
  return formatPageWrapper({
    title: `MTG Game - ${prep.deck.name}`,
    content: contentWithModal,
  });
}

// Helper to create display GameCards from CardDefinitions for deck review
function createDisplayGameCards(prep: PersistedGamePrep): { commanders: GameCard[], library: GameCard[] } {
  let gameCardIndex = 0;

  const commanders: GameCard[] = prep.deck.commanders.map((card, position) => ({
    card,
    isCommander: true,
    location: { type: "CommandZone", position } as const,
    gameCardIndex: gameCardIndex++,
    currentFace: "front" as const,
  }));

  const library: GameCard[] = prep.deck.cards.map((card, position) => ({
    card,
    isCommander: false,
    location: { type: "Library", position } as const,
    gameCardIndex: gameCardIndex++,
    currentFace: "front" as const,
  }));

  return { commanders, library };
}

function formatCommandersHtmlFragment(commanders: readonly CardDefinition[], prepId: number): string {
  if (commanders.length === 0) {
    return `<div class="commander-placeholder">No Commander</div>`;
  }

  // Create display GameCards for commanders
  const displayCommanders: GameCard[] = commanders.map((card, position) => ({
    card,
    isCommander: true,
    location: { type: "CommandZone", position } as const,
    gameCardIndex: position,
    currentFace: "front" as const,
  }));

  return `<div id="command-zone">
    ${displayCommanders.map((gameCard) => formatCardContainer({ gameCard, gameId: prepId })).join("")}
  </div>`;
}

function formatDeckReviewHtmlSection(prep: PersistedGamePrep): string {
  const commanderImageHtml = formatCommandersHtmlFragment(prep.deck.commanders, prep.prepId);

  // Create display GameCards for library
  const displayLibrary: GameCard[] = prep.deck.cards.map((card, position) => ({
    card,
    isCommander: false,
    location: { type: "Library", position } as const,
    gameCardIndex: prep.deck.commanders.length + position,
    currentFace: "front" as const,
  }));

  const libraryCardList = formatLibraryCardList(displayLibrary, prep.prepId);

  return `
  <div id="deck-review-container" class="deck-review-container">
    ${commanderImageHtml}
    <div id="start-game-buttons" class="deck-actions">
      <form method="post" action="/start-game" class="inline-form">
        <input type="hidden" name="prep-id" value="${prep.prepId}" />
        <input type="hidden" name="expected-version" value="${prep.version}" />
        <button type="submit" class="start-game-button">Shuffle Up</button>
      </form>
      <form method="get" action="/choose-any-deck" class="inline-form">
        <button type="submit" class="back-button">Choose Another Deck</button>
      </form>
    </div>
    <div id="library-list" data-testid="library-section">
      <h4 class="cute-header">Library</h4>
      <div class="cute-header-subtitle">
      ${prep.deck.cards.length} cards in library, ordered by position
      </div>
      <ul class="library-search-list">
        ${libraryCardList}
      </ul>
    </div>
  </div>`;
}
