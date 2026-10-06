import { CardDefinition } from "../types.js";

export interface CardRepositoryPort {
  saveCards(cards: CardDefinition[]): Promise<void>;

  getCard(cardDefinitionId: string): Promise<CardDefinition | null>;

  getCards(cardDefinitionIds: string[]): Promise<CardDefinition[]>;
}

