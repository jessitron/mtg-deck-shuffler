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
    cardMap.set(card.scryfallId, card);
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
    commanderIds: deck.commanders.map((c) => c.scryfallId),
    cardIds: deck.cards.map((c) => c.scryfallId),
    provenance: deck.provenance,
  };
}

export async function hydrateGameCards(
  persistedGameCards: PersistedGameCard[],
  cardRepo: CardRepositoryPort
): Promise<GameCard[]> {
  const scryfallIds = persistedGameCards.map((gc) => gc.scryfallId);
  const cardArray = await cardRepo.getCards(scryfallIds);
  
  // Convert array to map for efficient lookup
  const cardMap = new Map<string, CardDefinition>();
  for (const card of cardArray) {
    cardMap.set(card.scryfallId, card);
  }

  return persistedGameCards.map((pgc) => {
    const card = cardMap.get(pgc.scryfallId);
    if (!card) {
      throw new Error(`Card ${pgc.scryfallId} not found in repository`);
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
    scryfallId: gc.card.scryfallId,
    location: gc.location,
    gameCardIndex: gc.gameCardIndex,
    isCommander: gc.isCommander,
    currentFace: gc.currentFace,
    cardInstanceId: gc.cardInstanceId,
  }));
}

