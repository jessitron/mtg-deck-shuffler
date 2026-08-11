import { CardDefinition } from "../types.js";

export interface CardRepositoryPort {
  saveCards(cards: CardDefinition[]): Promise<void>;

  getCard(scryfallId: string): Promise<CardDefinition | null>;

  getCards(scryfallIds: string[]): Promise<CardDefinition[]>;
}

