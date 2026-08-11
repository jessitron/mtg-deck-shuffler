import { PersistedGamePrep } from "../../port-persist-prep/types.js";
import { GameCard } from "../../GameState.js";
import { formatCardContainer, formatDeckTitleHtmlFragment, formatLibraryStack, sleeveTintStyle } from "./shared-components.js";


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

  function renderPrepCommanderCard(commander: GameCard): string {
    const html = formatCardContainer({
      gameCard: commander,
      gameId: prep.prepId,
      flipRequest: { page: "prep", prepId: prep.prepId },
    });
    // Replace /card-modal with /prep-card-modal in the generated HTML
    return html.replace(/hx-get="\/card-modal\//g, 'hx-get="/prep-card-modal/');
  }

  // Prep-specific version of command zone that uses /prep-card-modal route
  function renderPrepCommandZone(): string {
    return commanders.length === 0
      ? `<div class="commander-placeholder">No Commander</div>`
      : `<div class="cool-command-zone-surround ${commanders.length > 1 ? "two-commanders" : ""}"${sleeveTintStyle(prep.sleeveColor, false)}>
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
    renderDeckTitle: () => formatDeckTitleHtmlFragment(prep.deck.name, prep.sleeveColor),
    renderLibraryStack: () =>
      formatLibraryStack({}, libraryCards.length, prep.sleeveColor),
  };
}
