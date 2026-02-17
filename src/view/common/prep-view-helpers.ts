import { PersistedGamePrep } from "../../port-persist-prep/types.js";
import { GameCard } from "../../GameState.js";
import { formatCardContainer, formatLibraryStack } from "./shared-components.js";


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
    renderLibraryStack: () =>
      formatLibraryStack({}, libraryCards.length),
  };
}
