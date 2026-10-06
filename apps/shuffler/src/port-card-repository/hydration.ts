import { CardDefinition, Deck, PERSISTED_DECK_VERSION } from "../types.js";
import { GameCard } from "../domain-types.js";
import { PersistedDeck, PersistedGameCard } from "../port-persist-state/persisted-types.js";
import { CardRepositoryPort } from "./types.js";

export async function hydrateDeck(
  persistedDeck: PersistedDeck,
  cardRepo: CardRepositoryPort
): Promise<Deck> {
  const allIds = [...persistedDeck.commanderIds, ...persistedDeck.cardIds];
  const cardArray = await cardRepo.getCards(allIds);
  
  // Convert array to map for efficient lookup
  const cardMap = new Map<string, CardDefinition>();
  for (const card of cardArray) {
    cardMap.set(card.cardDefinitionId, card);
  }

  const commanders = persistedDeck.commanderIds.map((id) => {
    const card = cardMap.get(id);
    if (!card) {
      throw new Error(`Commander card ${id} not found in repository`);
    }
    return card;
  });

  const cards = persistedDeck.cardIds.map((id) => {
    const card = cardMap.get(id);
    if (!card) {
      throw new Error(`Card ${id} not found in repository`);
    }
    return card;
  });

  return {
    version: PERSISTED_DECK_VERSION,
    id: persistedDeck.id,
    name: persistedDeck.name,
    totalCards: persistedDeck.totalCards,
    commanders,
    cards,
    provenance: persistedDeck.provenance,
  };
}

export function dehydrateDeck(deck: Deck): PersistedDeck {
  return {
    version: 2,
    id: deck.id,
    name: deck.name,
    totalCards: deck.totalCards,
    commanderIds: deck.commanders.map((c) => c.cardDefinitionId),
    cardIds: deck.cards.map((c) => c.cardDefinitionId),
    provenance: deck.provenance,
  };
}

export async function hydrateGameCards(
  persistedGameCards: PersistedGameCard[],
  cardRepo: CardRepositoryPort
): Promise<GameCard[]> {
  const cardDefinitionIds = persistedGameCards.map((gc) => gc.cardDefinitionId);
  const cardArray = await cardRepo.getCards(cardDefinitionIds);
  
  // Convert array to map for efficient lookup
  const cardMap = new Map<string, CardDefinition>();
  for (const card of cardArray) {
    cardMap.set(card.cardDefinitionId, card);
  }

  return persistedGameCards.map((pgc) => {
    const card = cardMap.get(pgc.cardDefinitionId);
    if (!card) {
      throw new Error(`Card ${pgc.cardDefinitionId} not found in repository`);
    }

    return {
      card,
      location: pgc.location,
      gameCardIndex: pgc.gameCardIndex,
      isCommander: pgc.isCommander,
      currentFace: pgc.currentFace,
      cardInstanceId: pgc.cardInstanceId,
    };
  });
}

export function dehydrateGameCards(gameCards: GameCard[]): PersistedGameCard[] {
  return gameCards.map((gc) => ({
    cardDefinitionId: gc.card.cardDefinitionId,
    location: gc.location,
    gameCardIndex: gc.gameCardIndex,
    isCommander: gc.isCommander,
    currentFace: gc.currentFace,
    cardInstanceId: gc.cardInstanceId,
  }));
}

