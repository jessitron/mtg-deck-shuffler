import { PersistedGamePrep } from "../../port-persist-prep/types.js";
import { GameCard } from "../../GameState.js";
import { formatCommandZone, formatLibraryStack } from "./shared-components.js";

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

  return {
    commanders,
    libraryCards,
    renderCommandZone: () =>
      formatCommandZone({
        commanders,
        deckName: prep.deck.name,
        sourceUrl: prep.deck.provenance.sourceUrl,
        id: prep.prepId,
        modalRoutePrefix: "/prep-card-modal",
      }),
    renderLibraryList: () =>
      formatPrepLibraryCardList(libraryCards, prep.prepId),
    renderLibraryStack: () =>
      formatLibraryStack({}, libraryCards.length),
  };
}
