import { PersistedGamePrep } from "../../port-persist-prep/types.js";
import { GameCard } from "../../GameState.js";
import { formatCardContainer, formatLibraryCardList } from "./shared-components.js";

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
    renderCommanderCard: (commander: GameCard) =>
      formatCardContainer({ gameCard: commander, gameId: prep.prepId }),
    renderLibraryList: () =>
      formatLibraryCardList(libraryCards, prep.prepId),
  };
}
